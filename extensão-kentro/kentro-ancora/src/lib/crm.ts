// Oportunidade do CRM da Kentro (funil Vendas) → respostas da ficha.
// Só entra o que o CRM informa de fato. Volume, conversão, ticket e custos seguem perguntados ao cliente.
import type { Answers } from './ficha';
import { NICHOS, type NichoKey } from './diagnostico';
import { OPEN, parseOpenNumber } from './answer-state';

/** O que a API da Kentro devolve de uma oportunidade (só os campos usados aqui). */
export interface OportunidadeCrm {
  id: number;
  title?: string | null;
  city?: string | null;
  state?: string | null;
  mainphone?: string | null;
  mainmail?: string | null;
  fkPipeline?: number | null;
  status?: number | null;
  responsableid?: number | null;
  formsdata?: Record<string, unknown> | null;
}

/** O que a busca mostra ao closer. Telefone e e-mail servem para achar, mas não saem do servidor. */
export interface ResumoOportunidade {
  id: number;
  titulo: string;
  empresa: string;
  cidade: string;
  minha: boolean;
}

export interface DadosOportunidade {
  id: number;
  titulo: string;
  respostas: Answers;
}

// Campos dos formulários "PV - Pré-Qualificação" e "PV - Qualificação" (prefixo do id do campo).
const CAMPO = { empresa: '40785d40', cidade: '59d78310', uf: 'dab27c70', segmento: '639a3f00', atendentes: '69032bf0', site: '7fd44f40' } as const;

const SEGMENTO_NICHO: Record<string, NichoKey> = {
  'Saúde e Bem-estar': 'saude',
  'Comércio e Varejo': 'varejo',
  'Educação': 'educacao',
  'Construção e Imobiliário': 'alto',
};

const UF: Record<string, string> = {
  acre: 'AC', alagoas: 'AL', amapa: 'AP', amazonas: 'AM', bahia: 'BA', ceara: 'CE', 'distrito federal': 'DF', 'espirito santo': 'ES', goias: 'GO',
  maranhao: 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS', 'minas gerais': 'MG', para: 'PA', paraiba: 'PB', parana: 'PR', pernambuco: 'PE',
  piaui: 'PI', 'rio de janeiro': 'RJ', 'rio grande do norte': 'RN', 'rio grande do sul': 'RS', rondonia: 'RO', roraima: 'RR', 'santa catarina': 'SC',
  'sao paulo': 'SP', sergipe: 'SE', tocantins: 'TO',
};

/** Rótulos mostrados ao closer para dizer o que veio do CRM. */
export const ROTULO_CRM: Record<string, string> = { cliente_nome: 'Cliente', nicho: 'Nicho', cidade: 'Cidade/UF', E: 'Pessoas que atendem', site: 'Tem site' };

export const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Valor de um campo de formulário; "." e "-" (preenchidos só por obrigação) contam como vazio. */
export function campo(o: OportunidadeCrm, prefixo: string): string {
  const f = o.formsdata ?? {};
  const chave = Object.keys(f).find(k => k.startsWith(prefixo));
  const v = chave === undefined ? '' : f[chave];
  const s = (Array.isArray(v) ? v.join(', ') : typeof v === 'string' || typeof v === 'number' ? String(v) : '').trim();
  return /^[\s.\-_]*$/.test(s) ? '' : s;
}

function cidadeUf(o: OportunidadeCrm): string {
  const cidade = campo(o, CAMPO.cidade) || (o.city ?? '').trim();
  const estado = campo(o, CAMPO.uf) || (o.state ?? '').trim();
  const uf = estado.length === 2 ? estado.toUpperCase() : UF[normalizar(estado)] ?? estado;
  return [cidade, uf].filter(Boolean).join('/');
}

/** Respostas que a oportunidade informa. Atendentes entram como resposta aberta, para a conta usar o número exato. */
export function respostasDaOportunidade(o: OportunidadeCrm): DadosOportunidade {
  const titulo = (o.title ?? '').trim();
  const r: Answers = {};
  const cliente = campo(o, CAMPO.empresa) || titulo;
  if (cliente) r['cliente_nome'] = cliente.slice(0, 300);
  const nicho = SEGMENTO_NICHO[campo(o, CAMPO.segmento)];
  if (nicho) r['nicho'] = NICHOS[nicho];
  const cidade = cidadeUf(o);
  if (cidade) r['cidade'] = cidade.slice(0, 300);
  const atendentes = campo(o, CAMPO.atendentes);
  if (atendentes && parseOpenNumber(atendentes) !== null) { r['E'] = OPEN; r['E_aberto'] = atendentes.slice(0, 300); }
  if (/[a-z0-9-]+\.[a-z]{2,}/i.test(campo(o, CAMPO.site))) r['site'] = 'Sim';
  return { id: o.id, titulo: titulo.slice(0, 300), respostas: r };
}

const vazio = (v: Answers[string] | undefined) => v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
const CHAVES_COMPANHEIRAS: Record<string, string[]> = { E: ['E', 'E_aberto'] };

/**
 * Vincula a oportunidade à ficha. Preenche o que está em branco ou o que veio de uma oportunidade anterior;
 * o que o closer já respondeu fica como está.
 */
export function aplicarOportunidade(a: Answers, d: DadosOportunidade): { respostas: Answers; preenchidos: string[]; mantidos: string[] } {
  const anteriores = Array.isArray(a['crm_preenchidos']) ? a['crm_preenchidos'] : [];
  const next: Answers = { ...a };
  // O que veio da oportunidade anterior e esta não informa volta a ficar em branco.
  for (const id of anteriores) if (!(id in d.respostas)) for (const k of CHAVES_COMPANHEIRAS[id] ?? [id]) delete next[k];
  const preenchidos: string[] = [];
  const mantidos: string[] = [];
  for (const id of Object.keys(ROTULO_CRM)) {
    if (!(id in d.respostas)) continue;
    if (vazio(a[id]) || anteriores.includes(id)) {
      for (const k of CHAVES_COMPANHEIRAS[id] ?? [id]) { const v = d.respostas[k]; if (v === undefined) delete next[k]; else next[k] = v; }
      preenchidos.push(id);
    } else mantidos.push(id);
  }
  next['crm_oportunidade'] = String(d.id);
  next['crm_oportunidade_titulo'] = d.titulo;
  next['crm_preenchidos'] = preenchidos;
  return { respostas: next, preenchidos, mantidos };
}

/** Tira o vínculo. As respostas ficam: a partir daqui são do closer. */
export function desvincularOportunidade(a: Answers): Answers {
  const resto = { ...a };
  for (const k of ['crm_oportunidade', 'crm_oportunidade_titulo', 'crm_preenchidos']) delete resto[k];
  return resto;
}

/** Resposta mexida pelo closer deixa de contar como "veio do CRM" (e não é trocada se ele mudar de oportunidade). */
export function marcarEdicao(a: Answers, chave: string): Answers {
  const id = chave.replace(/_aberto$/, '');
  const lista = a['crm_preenchidos'];
  return Array.isArray(lista) && lista.includes(id) ? { ...a, crm_preenchidos: lista.filter(x => x !== id) } : a;
}

/** Sem termo: as oportunidades do próprio closer. Com termo: título, empresa, cidade, e-mail ou telefone. */
export function filtrarOportunidades(lista: OportunidadeCrm[], termo: string, usuarioId: string, limite = 20): ResumoOportunidade[] {
  const t = normalizar(termo);
  const digitos = termo.replace(/\D/g, '');
  const achou = (o: OportunidadeCrm) => {
    if (!t) return String(o.responsableid ?? '') === usuarioId;
    if (digitos.length >= 4 && (o.mainphone ?? '').replace(/\D/g, '').includes(digitos)) return true;
    return [o.title ?? '', campo(o, CAMPO.empresa), cidadeUf(o), o.mainmail ?? ''].some(s => normalizar(s).includes(t));
  };
  return lista
    .filter(o => (o.status ?? 0) === 0 && achou(o))
    .sort((x, y) => y.id - x.id)
    .slice(0, limite)
    .map(o => ({ id: o.id, titulo: (o.title ?? '').trim(), empresa: campo(o, CAMPO.empresa), cidade: cidadeUf(o), minha: String(o.responsableid ?? '') === usuarioId }));
}
