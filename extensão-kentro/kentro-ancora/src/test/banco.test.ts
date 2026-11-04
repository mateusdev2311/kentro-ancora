// @vitest-environment node
// Regras de acesso e sessão num Postgres real. Elas substituem as políticas de RLS do Supabase.
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
// @ts-expect-error script .mjs sem tipos
import { iniciarBanco } from '../../scripts/banco-embutido.mjs';
import { banco, encerrarBanco } from '@/lib/db.server';
import {
  assinarSessao, chaveExtensaoValida, emitirTicket, lerSessao, papelDoTipo, trocarTicket, usuarioDoCabecalho, type Usuario,
} from '@/lib/sessao.server';
import {
  atualizarContaAoVivo, atualizarFichaDoDono, contaAoVivoPublica, criarContaAoVivo, fichaDoCliente, inserirFicha, lerFicha, lerRascunho, listarMinhasFichas, listarTodasFichas, listarUsuarios, salvarRascunho, type NovaFicha,
} from '@/lib/fichas.server';
import { consultarGeracao, iniciarGeracao } from '@/lib/geracoes.server';

const usuario = (id: string, role: 'closer' | 'master'): Usuario => ({ id, nome: id, email: '', role, ativo: true });
const closerA = usuario('101', 'closer');
const closerB = usuario('102', 'closer');
const master = usuario('103', 'master');

const novaFicha = (id: string, cliente = 'Clínica Teste'): NovaFicha => ({
  id, cliente_nome: cliente, closer_nome: 'Closer', segmento: 'Saúde', cidade: 'Goiânia',
  respostas: { segredo: 'resposta crua' }, transcricao: 'transcrição privada', conta: { ganho: 10 },
  pacote_closer: 'pacote privado', proposta_cliente: 'proposta pública', plano: {}, ancoragem: {}, proposta_gerada: false, relatorio_dados: {},
});

let parar: () => Promise<void>;
let pasta: string;

beforeAll(async () => {
  pasta = mkdtempSync(join(tmpdir(), 'ancora-teste-'));
  const pg = await iniciarBanco({ porta: 54369, pasta });
  parar = pg.parar;
  vi.stubEnv('DATABASE_URL', pg.url);
  vi.stubEnv('CHAVE_EXTENSAO', 'chave-certa');
  vi.stubEnv('SEGREDO_SESSAO', 'segredo-de-teste');
  await emitirTicket({ id: closerA.id, nome: 'A', tipo: 2 });
  await emitirTicket({ id: closerB.id, nome: 'B', tipo: 2 });
  await emitirTicket({ id: master.id, nome: 'M', tipo: 1 });
}, 180_000);

afterAll(async () => {
  await encerrarBanco();
  await parar?.();
  vi.unstubAllEnvs();
  rmSync(pasta, { recursive: true, force: true, maxRetries: 5 });
}, 60_000);

describe('migrações', () => {
  it('reaplicar não muda nada', async () => {
    await encerrarBanco();
    const sql = await banco();
    const [linha] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM _migracoes`;
    expect(linha?.n).toBe(1);
  });
});

describe('chave da extensão', () => {
  it('só aceita a chave configurada', () => {
    expect(chaveExtensaoValida('chave-certa')).toBe(true);
    expect(chaveExtensaoValida(' chave-certa ')).toBe(true);
    expect(chaveExtensaoValida('errada')).toBe(false);
    expect(chaveExtensaoValida('')).toBe(false);
    expect(chaveExtensaoValida(null)).toBe(false);
  });

  it('sem a variável configurada, nada passa', () => {
    vi.stubEnv('CHAVE_EXTENSAO', '');
    expect(chaveExtensaoValida('')).toBe(false);
    expect(chaveExtensaoValida('qualquer')).toBe(false);
    vi.stubEnv('CHAVE_EXTENSAO', 'chave-certa');
  });
});

describe('papel', () => {
  it('administrador e supervisor veem tudo; agente e tipo desconhecido, só o próprio', () => {
    expect(papelDoTipo(0)).toBe('master');
    expect(papelDoTipo(1)).toBe('master');
    expect(papelDoTipo(2)).toBe('closer');
    expect(papelDoTipo(undefined)).toBe('closer');
    expect(papelDoTipo(77)).toBe('closer');
  });
});

describe('ticket e sessão', () => {
  it('o ticket abre uma sessão uma única vez e leva o contexto', async () => {
    const ticket = (await emitirTicket({ id: '201', nome: 'Novo', tipo: 2 }, { contato_nome: 'Fulano' }))!;
    const sessao = await trocarTicket(ticket);
    expect(sessao?.contexto).toEqual({ contato_nome: 'Fulano' });
    expect(await trocarTicket(ticket)).toBeNull();
    const eu = await usuarioDoCabecalho(`Bearer ${sessao!.token}`);
    expect(eu).toMatchObject({ id: '201', nome: 'Novo', role: 'closer' });
  });

  it('ticket vencido ou inventado não abre sessão', async () => {
    const ticket = (await emitirTicket({ id: '202', tipo: 2 }))!;
    const sql = await banco();
    await sql`UPDATE tickets_acesso SET expira_em = now() - interval '1 second' WHERE usuario_id = '202'`;
    expect(await trocarTicket(ticket)).toBeNull();
    expect(await trocarTicket('x'.repeat(43))).toBeNull();
  });

  it('o papel é atualizado a cada entrada e vale o que está no banco', async () => {
    await emitirTicket({ id: '203', tipo: 2 });
    const token = assinarSessao('203');
    expect((await usuarioDoCabecalho(`Bearer ${token}`))?.role).toBe('closer');
    await emitirTicket({ id: '203', tipo: 1 });
    expect((await usuarioDoCabecalho(`Bearer ${token}`))?.role).toBe('master');
  });

  it('usuário desativado não recebe ticket nem usa sessão antiga', async () => {
    const ticketAntigo = (await emitirTicket({ id: '204', tipo: 2 }))!;
    const token = assinarSessao('204');
    const sql = await banco();
    await sql`UPDATE usuarios SET ativo = false WHERE id = '204'`;
    expect(await emitirTicket({ id: '204', tipo: 2 })).toBeNull();
    expect(await trocarTicket(ticketAntigo)).toBeNull();
    expect(await usuarioDoCabecalho(`Bearer ${token}`)).toBeNull();
  });

  it('recusa sessão adulterada, vencida ou sem cabeçalho', async () => {
    const token = assinarSessao('101');
    const [conteudo, assinatura] = token.split('.') as [string, string];
    const outro = Buffer.from(JSON.stringify({ sub: '103', exp: 9999999999 })).toString('base64url');
    expect(lerSessao(token)).toBe('101');
    expect(lerSessao(`${outro}.${assinatura}`)).toBeNull();
    expect(lerSessao(`${conteudo}.`)).toBeNull();
    expect(lerSessao(`${token}.a`)).toBeNull();
    expect(lerSessao(token, Date.now() + 13 * 60 * 60 * 1000)).toBeNull();
    expect(await usuarioDoCabecalho(null)).toBeNull();
    expect(await usuarioDoCabecalho(token)).toBeNull();
  });
});

describe('fichas', () => {
  it('closer lê as próprias; outro closer não; master lê todas', async () => {
    const id = randomUUID();
    expect((await inserirFicha(closerA, novaFicha(id)))?.id).toBe(id);
    expect(await lerFicha(closerA, id)).toMatchObject({ id, cliente_nome: 'Clínica Teste' });
    expect(await lerFicha(closerB, id)).toBeNull();
    expect(await lerFicha(master, id)).toMatchObject({ id });
    expect((await listarMinhasFichas(closerA)).map((f) => f.id)).toContain(id);
    expect((await listarMinhasFichas(closerB)).map((f) => f.id)).not.toContain(id);
    expect((await listarTodasFichas(master)).map((f) => f.id)).toContain(id);
  });

  it('só master lista tudo', async () => {
    await expect(listarTodasFichas(closerA)).rejects.toThrow('Acesso restrito');
    await expect(listarUsuarios(closerA)).rejects.toThrow('Acesso restrito');
    expect((await listarUsuarios(master)).map((u) => u.id)).toContain(closerA.id);
  });

  it('reenviar não duplica, e o UUID de outro usuário não é sobrescrito', async () => {
    const id = randomUUID();
    await inserirFicha(closerA, novaFicha(id, 'Original'));
    expect((await inserirFicha(closerA, novaFicha(id, 'Reenvio')))?.id).toBe(id);
    expect(await inserirFicha(closerB, novaFicha(id, 'Invasor'))).toBeNull();
    expect((await lerFicha(closerA, id))?.['cliente_nome']).toBe('Original');
  });

  it('só o dono altera o plano, nem o master', async () => {
    const id = randomUUID();
    await inserirFicha(closerA, novaFicha(id));
    const dados = { plano: { nome: 'Start' }, ancoragem: {}, proposta_gerada: true, relatorio_dados: {} };
    expect(await atualizarFichaDoDono(closerB, id, dados)).toBe(false);
    expect(await atualizarFichaDoDono(master, id, dados)).toBe(false);
    expect((await lerFicha(closerA, id))?.['proposta_gerada']).toBe(false);
    expect(await atualizarFichaDoDono(closerA, id, dados)).toBe(true);
    expect((await lerFicha(closerA, id))?.['proposta_gerada']).toBe(true);
  });

  it('o link público nunca devolve respostas, transcrição nem pacote do closer', async () => {
    const id = randomUUID();
    await inserirFicha(closerA, novaFicha(id));
    const publica = await fichaDoCliente(id);
    expect(publica).toMatchObject({ id, proposta_cliente: 'proposta pública', conta: { ganho: 10 } });
    expect(Object.keys(publica!).sort()).toEqual(['ancoragem', 'cliente_nome', 'conta', 'created_at', 'id', 'plano', 'proposta_cliente', 'segmento']);
    expect(JSON.stringify(publica)).not.toMatch(/pacote privado|transcrição privada|resposta crua/);
    expect(await fichaDoCliente(randomUUID())).toBeNull();
  });

  it('a data sai como texto, no formato que a tela valida', async () => {
    const id = randomUUID();
    const salva = await inserirFicha(closerA, novaFicha(id));
    expect(salva?.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect((await lerFicha(closerA, id))?.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('conta ao vivo e rascunho', () => {
  it('só o dono atualiza a conta; o link público lê sem sessão', async () => {
    const id = await criarContaAoVivo(closerA, 'Cliente', { ganho: 1 });
    expect(await atualizarContaAoVivo(closerB, id, 'Invasor', { ganho: 999 })).toBe(false);
    expect(await atualizarContaAoVivo(closerA, id, 'Cliente', { ganho: 2 })).toBe(true);
    expect(await contaAoVivoPublica(id)).toMatchObject({ cliente_nome: 'Cliente', conta: { ganho: 2 } });
    expect(await contaAoVivoPublica(randomUUID())).toBeNull();
  });

  it('cada usuário tem o próprio rascunho, que não aponta para a conta de outro', async () => {
    const contaDeA = await criarContaAoVivo(closerA, 'Cliente', {});
    await salvarRascunho(closerA, { cliente_nome: 'de A' }, contaDeA);
    await salvarRascunho(closerB, { cliente_nome: 'de B' }, contaDeA);
    expect(await lerRascunho(closerA)).toMatchObject({ respostas: { cliente_nome: 'de A' }, conta_ao_vivo_id: contaDeA });
    expect(await lerRascunho(closerB)).toMatchObject({ respostas: { cliente_nome: 'de B' }, conta_ao_vivo_id: null });
  });
});

describe('geração em segundo plano', () => {
  const concluir = async (usuarioId: string, id: string) => {
    await vi.waitFor(async () => {
      expect((await consultarGeracao(usuarioId, id))?.status).not.toBe('processando');
    });
    return consultarGeracao(usuarioId, id);
  };

  it('guarda o resultado, e só o dono consulta', async () => {
    const { id } = await iniciarGeracao(closerA.id, 'venda', async () => ({ ok: true, texto: 'pronto' }));
    expect(await concluir(closerA.id, id)).toEqual({ status: 'concluida', resultado: { ok: true, texto: 'pronto' } });
    expect(await consultarGeracao(closerB.id, id)).toBeNull();
  });

  it('uma falha inesperada vira erro legível', async () => {
    const erroLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { id } = await iniciarGeracao(closerA.id, 'venda', async () => { throw new Error('detalhe interno'); });
    const resposta = await concluir(closerA.id, id);
    expect(resposta?.status).toBe('erro');
    expect(JSON.stringify(resposta)).not.toContain('detalhe interno');
    erroLog.mockRestore();
  });

  it('uma geração interrompida vence depois do limite', async () => {
    let liberar = () => {};
    const { id } = await iniciarGeracao(closerA.id, 'venda', () => new Promise((r) => { liberar = () => r({ ok: true }); }));
    const sql = await banco();
    await sql`UPDATE geracoes SET created_at = now() - interval '16 minutes' WHERE id = ${id}`;
    expect((await consultarGeracao(closerA.id, id))?.status).toBe('erro');
    liberar();
  });
});
