// Diagnóstico enxuto: núcleo (6 perguntas) + módulo do nicho + qualificação.
// As alavancas não são perguntadas: são calculadas em ancora.ts a partir destes campos.
import type { Answers, Q } from './ficha';
import { answerText, isUnknown } from './answer-state';

const NS = 'Não sabe';
const ranges = ['Até 5', '6 a 20', '21 a 50', 'Mais de 50'];

export const NICHOS = {
  saude: 'Saúde (clínicas/odonto/estética)',
  varejo: 'Varejo e Farmácia',
  educacao: 'Educação',
  servicos: 'Serviços recorrentes (provedor/assinatura)',
  alto: 'Alto valor (imobiliária/concessionária/solar/B2B)',
  outro: 'Outro',
} as const;
export type NichoKey = keyof typeof NICHOS;
export const nichoQuestion: Q = { id: 'nicho', label: 'Nicho', options: Object.values(NICHOS) };

export function nichoOf(a: Answers): NichoKey | null {
  if (isUnknown(a, 'nicho')) return null;
  const v = answerText(a, 'nicho');
  const hit = (Object.keys(NICHOS) as NichoKey[]).find(k => NICHOS[k] === v);
  return hit ?? null;
}

export const coreQuestions: Q[] = [
  { id: 'L', label: 'Clientes novos por mês (todos os canais)', options: ['Até 50', '51 a 150', '151 a 400', '401 a 1.000', 'Mais de 1.000', NS] },
  { id: 'C', label: 'De cada 10 bem atendidos, quantos fecham?', options: ['1 ou menos', '2 a 3', '4 a 5', 'Mais de 5', NS] },
  { id: 'ticket', label: 'Ticket médio', options: ['Até R$100', 'R$101–500', 'R$501–1.000', 'R$1.001–5.000', 'Acima de R$5.000', NS] },
  { id: 'al1', label: 'Contatos perdidos por mês por demora/fora do horário', options: [...ranges, NS] },
  { id: 'E', label: 'Quantas pessoas atendem hoje?', options: ['1', '2 a 3', '4 a 6', '7 a 10', 'Mais de 10'] },
  { id: 'S', label: 'Quanto custa cada uma, com encargos?', options: ['Até R$2.500', 'R$2.501–4.000', 'R$4.001–6.000', 'Acima de R$6.000', NS] },
  { id: 'al7', label: 'Gasto mensal com chatbot, disparo, CRM e telefonia', options: ['Nada', 'Até R$300', 'R$301–1.000', 'Acima de R$1.000', NS] },
  { id: 'al8', label: 'Número no celular pessoal ou já bloqueado?', options: ['Não', 'Celular pessoal', 'Já tivemos bloqueio', 'Os dois'] },
];
/** Agrupamento visual do núcleo (C1–C6). */
export const coreGroups: { title: string; ids: string[] }[] = [
  { title: 'C1 · Volume', ids: ['L'] }, { title: 'C2 · Conversão', ids: ['C'] }, { title: 'C3 · Ticket', ids: ['ticket'] },
  { title: 'C4 · Perda', ids: ['al1'] }, { title: 'C5 · Equipe e custo', ids: ['E', 'S'] }, { title: 'C6 · Ferramentas e número', ids: ['al7', 'al8'] },
];

const yn = ['Sim', 'Não', NS];
export const nichoModules: Record<NichoKey, Q[]> = {
  saude: [
    { id: 'al3', label: 'Faltas sem avisar por mês', options: [...ranges, 'Não vivo de agenda', NS] },
    { id: 'horario', label: 'Valor do horário/consulta', options: ['Até R$100', 'R$101–300', 'Acima de R$300', NS] },
    { id: 'saude_aval', label: 'Avaliações/orçamentos que não viram tratamento por mês', options: [...ranges, NS] },
    { id: 'saude_recepcao', label: 'A recepção atende telefone e WhatsApp ao mesmo tempo?', options: yn },
  ],
  varejo: [
    { id: 'varejo_recompra', label: 'Clientes antigos recuperáveis por mês numa campanha', options: [...ranges, 'Não tenho base', NS] },
    { id: 'varejo_pedidos', label: 'Pedidos perdidos no meio da conversa por mês', options: [...ranges, NS] },
    { id: 'varejo_erp', label: 'Estoque e pedidos conversam com o atendimento (ERP)?', options: yn },
  ],
  educacao: [
    { id: 'edu_follow', label: 'Interessados que não matriculam e ficam sem follow-up por mês', options: [...ranges, NS] },
    { id: 'edu_exalunos', label: 'Ex-alunos/indicados reativáveis por mês', options: [...ranges, 'Não tenho base', NS] },
    { id: 'edu_pico', label: 'No pico de matrícula, a equipe dá conta?', options: yn },
  ],
  servicos: [
    { id: 'serv_retencao', label: 'Cancelamentos retíveis por mês', options: [...ranges, NS] },
    { id: 'serv_cobranca', label: 'Como cobram quem está em atraso hoje?', options: ['Manual', 'Automático', 'Não cobram', NS] },
    { id: 'serv_suporte', label: 'O suporte chega mais por telefone ou WhatsApp?', options: ['Telefone', 'WhatsApp', 'Os dois'] },
  ],
  alto: [
    { id: 'alto_pipeline', label: 'Negociações que escapam por mês', options: [...ranges, NS] },
    { id: 'alto_ciclo', label: 'Tempo do 1º contato ao fechamento', options: ['Dias', 'Semanas', 'Meses', NS] },
    { id: 'alto_carteira', label: 'Quando um vendedor sai, a carteira fica com quem?', options: ['Com a empresa', 'Com o vendedor', NS] },
  ],
  outro: [
    { id: 'outro_follow', label: 'Propostas/orçamentos sem follow-up por mês', options: [...ranges, NS] },
  ],
};
/** Pergunta do nicho que alimenta cada alavanca calculada (2 = follow-up, 3 = faltas, 4 = reativação). */
export const leverSource: Record<NichoKey, { 2?: string; 3?: string; 4?: string }> = {
  saude: { 2: 'saude_aval', 3: 'al3' },
  varejo: { 4: 'varejo_recompra' },
  educacao: { 2: 'edu_follow', 4: 'edu_exalunos' },
  servicos: { 4: 'serv_retencao' },
  alto: { 2: 'alto_pipeline' },
  outro: { 2: 'outro_follow' },
};
export const allNichoQuestions: Q[] = (Object.keys(nichoModules) as NichoKey[]).flatMap(k => nichoModules[k]);

export const qualification: Q[] = [
  { id: 'decisor', label: 'Quem decide?', options: ['Eu mesmo/decisor presente', 'Decisor presente na sala', 'Decisor não está', 'Comitê/sócio', NS] },
  { id: 'prazo', label: 'Quando quer resolver?', options: ['Agora/esta semana', 'Até 30 dias', '60–90 dias', 'Sem prazo', NS] },
  { id: 'cnpj', label: 'Tem CNPJ?', options: yn },
  { id: 'site', label: 'Tem site?', options: yn },
  { id: 'meta90', label: 'Em 90 dias, o que precisa acontecer?', options: ['Recuperar contatos', 'Aumentar vendas', 'Reduzir faltas/custo', 'Organizar a equipe', 'Outro', NS], otherText: true },
];
