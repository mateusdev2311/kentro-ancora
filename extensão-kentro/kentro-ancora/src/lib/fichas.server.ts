// Todo acesso às fichas passa por aqui. Estas regras eram as políticas de RLS do Supabase:
// closer lê as suas, master lê todas, só o dono altera, e os links públicos leem um único registro pelo UUID exato.
import { banco } from './db.server';
import type { Usuario } from './sessao.server';

type Json = Parameters<Awaited<ReturnType<typeof banco>>['json']>[0];
const texto = (data: unknown) => (data instanceof Date ? data.toISOString() : String(data));
const comData = <T extends { created_at: unknown }>(linha: T) => ({ ...linha, created_at: texto(linha.created_at) });

export interface NovaFicha {
  id: string;
  cliente_nome: string;
  closer_nome: string;
  segmento: string;
  cidade: string;
  respostas: Json;
  transcricao: string;
  conta: Json;
  pacote_closer: string;
  proposta_cliente: string;
  plano: Json;
  ancoragem: Json;
  proposta_gerada: boolean;
  relatorio_dados: Json;
}

/** Grava a ficha e confirma a gravação. Repetir o envio não duplica; o UUID de outro usuário não é sobrescrito. */
export async function inserirFicha(usuario: Usuario, f: NovaFicha): Promise<{ id: string; created_at: string } | null> {
  const sql = await banco();
  await sql`
    INSERT INTO fichas (id, user_id, cliente_nome, closer_nome, segmento, cidade, respostas, transcricao, conta, pacote_closer, proposta_cliente, plano, ancoragem, proposta_gerada, relatorio_dados)
    VALUES (${f.id}, ${usuario.id}, ${f.cliente_nome}, ${f.closer_nome}, ${f.segmento}, ${f.cidade}, ${sql.json(f.respostas)}, ${f.transcricao}, ${sql.json(f.conta)}, ${f.pacote_closer}, ${f.proposta_cliente}, ${sql.json(f.plano)}, ${sql.json(f.ancoragem)}, ${f.proposta_gerada}, ${sql.json(f.relatorio_dados)})
    ON CONFLICT (id) DO NOTHING`;
  const [salva] = await sql<{ id: string; created_at: Date }[]>`SELECT id, created_at FROM fichas WHERE id = ${f.id} AND user_id = ${usuario.id}`;
  return salva ? comData(salva) : null;
}

/** Ficha completa: só para o dono ou para um master. */
export async function lerFicha(usuario: Usuario, id: string) {
  const sql = await banco();
  const [ficha] = await sql<({ created_at: Date } & Record<string, unknown>)[]>`
    SELECT * FROM fichas WHERE id = ${id} AND (user_id = ${usuario.id} OR ${usuario.role === 'master'})`;
  return ficha ? comData(ficha) : null;
}

const COLUNAS_LISTA = ['id', 'created_at', 'cliente_nome', 'segmento', 'closer_nome', 'user_id'];
interface LinhaLista {
  id: string;
  created_at: Date;
  cliente_nome: string;
  segmento: string;
  closer_nome: string;
  user_id: string;
}

export async function listarMinhasFichas(usuario: Usuario) {
  const sql = await banco();
  const linhas = await sql<LinhaLista[]>`SELECT ${sql(COLUNAS_LISTA)} FROM fichas WHERE user_id = ${usuario.id} ORDER BY created_at DESC LIMIT 500`;
  return linhas.map(comData);
}

export async function listarTodasFichas(usuario: Usuario) {
  if (usuario.role !== 'master') throw new Error('Acesso restrito.');
  const sql = await banco();
  const linhas = await sql<LinhaLista[]>`SELECT ${sql(COLUNAS_LISTA)} FROM fichas ORDER BY created_at DESC LIMIT 2000`;
  return linhas.map(comData);
}

export async function listarUsuarios(usuario: Usuario) {
  if (usuario.role !== 'master') throw new Error('Acesso restrito.');
  const sql = await banco();
  const linhas = await sql<{ id: string; nome: string; email: string }[]>`SELECT id, nome, email FROM usuarios ORDER BY nome`;
  return [...linhas];
}

/** Plano e proposta depois de salva a ficha. Só o dono altera (master lê, mas não edita a ficha de outro). */
export async function atualizarFichaDoDono(usuario: Usuario, id: string, d: { plano: Json; ancoragem: Json; proposta_gerada: boolean; relatorio_dados: Json }): Promise<boolean> {
  const sql = await banco();
  const r = await sql`
    UPDATE fichas SET plano = ${sql.json(d.plano)}, ancoragem = ${sql.json(d.ancoragem)}, proposta_gerada = ${d.proposta_gerada}, relatorio_dados = ${sql.json(d.relatorio_dados)}
    WHERE id = ${id} AND user_id = ${usuario.id}`;
  return r.count === 1;
}

/** Link público do cliente: nunca devolve as respostas cruas nem o pacote do closer. */
export async function fichaDoCliente(id: string) {
  const sql = await banco();
  const [ficha] = await sql<{ created_at: Date; [coluna: string]: unknown }[]>`
    SELECT id, created_at, cliente_nome, segmento, conta, proposta_cliente, plano, ancoragem FROM fichas WHERE id = ${id}`;
  return ficha ? comData(ficha) : null;
}

export async function criarContaAoVivo(usuario: Usuario, clienteNome: string, conta: Json): Promise<string> {
  const sql = await banco();
  const [linha] = await sql<{ id: string }[]>`
    INSERT INTO contas_ao_vivo (user_id, cliente_nome, conta) VALUES (${usuario.id}, ${clienteNome}, ${sql.json(conta)}) RETURNING id`;
  if (!linha) throw new Error('Conta ao vivo não criada.');
  return linha.id;
}

export async function atualizarContaAoVivo(usuario: Usuario, id: string, clienteNome: string, conta: Json): Promise<boolean> {
  const sql = await banco();
  const r = await sql`
    UPDATE contas_ao_vivo SET cliente_nome = ${clienteNome}, conta = ${sql.json(conta)}, updated_at = now()
    WHERE id = ${id} AND user_id = ${usuario.id}`;
  return r.count === 1;
}

/** Link público da conta ao vivo. */
export async function contaAoVivoPublica(id: string) {
  const sql = await banco();
  const [linha] = await sql<{ cliente_nome: string; conta: unknown; updated_at: Date }[]>`
    SELECT cliente_nome, conta, updated_at FROM contas_ao_vivo WHERE id = ${id}`;
  return linha ? { ...linha, updated_at: texto(linha.updated_at) } : null;
}

export async function lerRascunho(usuario: Usuario) {
  const sql = await banco();
  const [linha] = await sql<{ respostas: unknown; conta_ao_vivo_id: string | null }[]>`
    SELECT respostas, conta_ao_vivo_id FROM rascunhos WHERE user_id = ${usuario.id}`;
  return linha ?? null;
}

export async function salvarRascunho(usuario: Usuario, respostas: Json, contaAoVivoId: string | null): Promise<void> {
  const sql = await banco();
  // A conta ao vivo só entra no rascunho se for do próprio usuário.
  await sql`
    INSERT INTO rascunhos (user_id, respostas, conta_ao_vivo_id)
    VALUES (${usuario.id}, ${sql.json(respostas)}, (SELECT id FROM contas_ao_vivo WHERE id = ${contaAoVivoId} AND user_id = ${usuario.id}))
    ON CONFLICT (user_id) DO UPDATE SET respostas = EXCLUDED.respostas, conta_ao_vivo_id = EXCLUDED.conta_ao_vivo_id, updated_at = now()`;
}

export async function apagarRascunho(usuario: Usuario): Promise<void> {
  const sql = await banco();
  await sql`DELETE FROM rascunhos WHERE user_id = ${usuario.id}`;
}
