// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { aplicarOportunidade, desvincularOportunidade, filtrarOportunidades, marcarEdicao, respostasDaOportunidade, type OportunidadeCrm } from '@/lib/crm';
import { NICHOS } from '@/lib/diagnostico';
import { OPEN } from '@/lib/answer-state';
import { calculate } from '@/lib/ancora';
import { defaultUsers } from '@/lib/anchoring';
import { gerarTextosVenda } from '@/lib/venda-textos';
import { buscarNoCrm, limparCacheCrm, oportunidadeDeVendas } from '@/lib/crm.server';

const forms = (campos: Record<string, unknown>) => Object.fromEntries(Object.entries(campos).map(([k, v]) => [`${k}-0001`, v]));
const opp = (over: Partial<OportunidadeCrm> & { campos?: Record<string, unknown> } = {}): OportunidadeCrm => ({
  id: 54682, title: 'Homeovita - Farmácia', fkPipeline: 6, status: 0, responsableid: 504, mainphone: '5567999990000', mainmail: 'contato@homeovita.com.br',
  formsdata: forms(over.campos ?? { '40785d40': 'Homeovita', '59d78310': 'Campo Grande ', dab27c70: 'Mato Grosso do Sul', '639a3f00': 'Saúde e Bem-estar', '69032bf0': '23', '7fd44f40': 'https://homeovita.com.br/' }),
  ...over,
});

describe('Oportunidade → ficha', () => {
  it('traz cliente, nicho, cidade/UF, atendentes exatos e site', () => {
    const d = respostasDaOportunidade(opp());
    expect(d.respostas).toEqual({ cliente_nome: 'Homeovita', nicho: NICHOS.saude, cidade: 'Campo Grande/MS', E: OPEN, E_aberto: '23', site: 'Sim' });
    expect(defaultUsers(d.respostas)).toBe(23);
    expect(calculate(d.respostas).usuariosConfirmar).toBe(false);
  });
  it('trata "." como vazio, não inventa nicho e cai no título', () => {
    const d = respostasDaOportunidade(opp({ campos: { '40785d40': '.', '639a3f00': 'Financeiro', '69032bf0': 'não sei', '7fd44f40': '.' } }));
    expect(d.respostas).toEqual({ cliente_nome: 'Homeovita - Farmácia' });
  });
  it('preenche o vazio, mantém o que o closer respondeu e guarda o vínculo', () => {
    const x = aplicarOportunidade({ cliente_nome: 'Clínica do Closer', L: 'Até 50' }, respostasDaOportunidade(opp()));
    expect(x.mantidos).toEqual(['cliente_nome']);
    expect(x.respostas['cliente_nome']).toBe('Clínica do Closer');
    expect(x.respostas['nicho']).toBe(NICHOS.saude);
    expect(x.respostas['L']).toBe('Até 50');
    expect(x.respostas['crm_oportunidade']).toBe('54682');
    expect(x.respostas['crm_preenchidos']).toEqual(['nicho', 'cidade', 'E', 'site']);
  });
  it('ao trocar de oportunidade, troca só o que veio do CRM e não foi mexido', () => {
    const primeira = aplicarOportunidade({}, respostasDaOportunidade(opp())).respostas;
    const editada = marcarEdicao({ ...primeira, cidade: 'Dourados/MS' }, 'cidade');
    const segunda = aplicarOportunidade(editada, respostasDaOportunidade(opp({ id: 1, title: 'Outra', campos: { '40785d40': 'Outra Ltda', '639a3f00': 'Educação' } })));
    expect(segunda.respostas['cliente_nome']).toBe('Outra Ltda');
    expect(segunda.respostas['nicho']).toBe(NICHOS.educacao);
    expect(segunda.respostas['cidade']).toBe('Dourados/MS');
    expect(segunda.respostas['E']).toBeUndefined();
    expect(segunda.respostas['E_aberto']).toBeUndefined();
    expect(segunda.respostas['site']).toBeUndefined();
  });
  it('desvincular mantém as respostas', () => {
    const r = desvincularOportunidade(aplicarOportunidade({}, respostasDaOportunidade(opp())).respostas);
    expect(r['crm_oportunidade']).toBeUndefined();
    expect(r['cliente_nome']).toBe('Homeovita');
  });
  it('o pacote do closer cita a oportunidade; a proposta do cliente não', () => {
    const a = aplicarOportunidade({}, respostasDaOportunidade(opp())).respostas;
    const t = gerarTextosVenda(a, calculate(a), 'Closer');
    expect(t.pacote_closer).toContain('#54682');
    expect(t.proposta_cliente).not.toContain('54682');
  });
});

describe('Busca', () => {
  const lista = [opp(), opp({ id: 2, title: 'Escola Alfa', responsableid: 7, mainphone: '62988887777', mainmail: 'secretaria@alfa.edu.br', campos: { '40785d40': 'Colégio Alfa' } }), opp({ id: 3, title: 'Perdida', status: 2 })];
  it('sem termo, só as do closer; com termo, nome, empresa, telefone ou e-mail', () => {
    expect(filtrarOportunidades(lista, '', '504').map(o => o.id)).toEqual([54682]);
    expect(filtrarOportunidades(lista, 'colegio', '504').map(o => o.id)).toEqual([2]);
    expect(filtrarOportunidades(lista, '8888-7777', '504').map(o => o.id)).toEqual([2]);
    expect(filtrarOportunidades(lista, 'homeovita.com', '504').map(o => o.id)).toEqual([54682]);
  });
  it('não devolve telefone nem e-mail, nem oportunidade encerrada', () => {
    const r = filtrarOportunidades(lista, 'a', '504');
    expect(r.map(o => o.id)).not.toContain(3);
    expect(JSON.stringify(r)).not.toMatch(/99999|@/);
  });
});

describe('API da Kentro', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); limparCacheCrm(); });
  const configurar = () => { vi.stubEnv('KENTRO_API_KEY', 'chave-teste'); vi.stubEnv('KENTRO_FILA_ID', '357'); };

  it('consulta só o funil Vendas e guarda a lista por um minuto', async () => {
    configurar();
    const fetch = vi.fn(async () => new Response(JSON.stringify([opp()])));
    vi.stubGlobal('fetch', fetch);
    await buscarNoCrm('504', '');
    await buscarNoCrm('504', 'homeo');
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://kentrosistemas.atenderbem.com/int/getPipeOpportunities');
    expect(JSON.parse(String(init.body))).toEqual({ queueId: 357, apiKey: 'chave-teste', pipelineId: 6 });
  });
  it('não lê oportunidade de outro funil', async () => {
    configurar();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(opp({ fkPipeline: 5 })))));
    expect(await oportunidadeDeVendas(54682)).toBeNull();
  });
  it('sem a chave, não chama a API', async () => {
    vi.stubEnv('KENTRO_API_KEY', '');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(buscarNoCrm('504', '')).rejects.toThrow('CRM não configurado.');
    expect(fetch).not.toHaveBeenCalled();
  });
});
