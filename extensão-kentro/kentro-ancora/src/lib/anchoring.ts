import type { Answers } from './ficha';
import { OPEN, answerText, isUnknown, parseOpenNumber } from './answer-state';
import { computePlans, type PlanName } from './pricing';
import type { Account } from './ancora';

export const PLANS: { name: PlanName; key: 'start' | 'social' | 'excel' | 'clevel'; produto: string; apoio: string }[] = [
  { name: 'Kentro Start', key: 'start', produto: 'Start', apoio: 'Mesma mensalidade do Social Pro; implantação orientada (tem custo). Para quem tem TI própria.' },
  { name: 'Social Pro', key: 'social', produto: 'Social Pro', apoio: 'Carro-chefe. Implantação a quatro mãos e suporte premium.' },
  { name: 'Excelência Pro', key: 'excel', produto: 'Excelência Pro', apoio: 'Sistema + consultoria mensal de 4 h.' },
  { name: 'Kentro C-Level', key: 'clevel', produto: 'C-Level', apoio: 'Mentoria de 2 h com os diretores. Implantação grátis e mensalidade menor.' },
];
export const DEFAULT_PLAN: PlanName = 'Social Pro';
export const parseBRL = (s: string) => Number(s.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

/** Usuários: o que o closer escolheu, senão a resposta de "quantas pessoas atendem", senão 6. */
export function defaultUsers(a: Answers): number {
  const chosen = Number(a['usuarios']); if (Number.isFinite(chosen) && chosen >= 2) return Math.min(50, Math.round(chosen));
  if (a['E'] === OPEN) { const n = parseOpenNumber(String(answerText(a, 'E'))); if (n !== null) return Math.min(50, Math.max(2, Math.round(n))); }
  const map: Record<string, number> = { '1': 2, '2 a 3': 3, '4 a 6': 6, '7 a 10': 10, 'Mais de 10': 12 };
  return map[String(a['E'])] ?? 6;
}
export function chosenPlan(a: Answers): PlanName { const p = a['plano_escolhido']; return PLANS.some(x => x.name === p) ? (p as PlanName) : DEFAULT_PLAN; }

/** Valores (em número) do plano para um número de usuários. */
export function planValues(users: number, plan: PlanName) {
  const p = computePlans(users); const k = PLANS.find(x => x.name === plan)?.key ?? 'social';
  if (k === 'clevel') return { mensal: p.raw.sisM, anual: p.raw.sisA, implantacao: 0 };
  const v = p[k]; return { mensal: parseBRL(v.mensal), anual: parseBRL(v.anual), implantacao: parseBRL(v.implantacao) };
}

/** Frases curtas do que o cliente contou; pula o que ficou não informado. */
export function clientFacts(a: Answers): string[] {
  const t = (id: string) => isUnknown(a, id) ? null : String(answerText(a, id)).toLowerCase();
  const out: string[] = [];
  const L = t('L'); if (L) out.push(`Chegam ~${L} clientes novos por mês`);
  const C = t('C'); if (C) out.push(`De cada 10 bem atendidos, ${C.replace(' de 10', '')} fecham`);
  const T = t('ticket') ?? t('T'); if (T) out.push(`Ticket médio ${/\d/.test(T) ? 'de ' : ''}${T.replace('r$', 'R$')}`);
  const P = t('al1'); if (P) out.push(`Perdem ${P} contatos por mês por demora ou fora do horário`);
  const extra: [string, (v: string) => string][] = [['saude_aval', v => `${v} avaliações por mês não viram tratamento`], ['edu_follow', v => `${v} interessados por mês ficam sem follow-up`], ['alto_pipeline', v => `${v} negociações por mês escapam`], ['outro_follow', v => `${v} propostas por mês sem follow-up`], ['varejo_recompra', v => `${v} clientes antigos recuperáveis por mês`], ['serv_retencao', v => `${v} cancelamentos por mês dá para reter`]];
  for (const [k, f] of extra) { const v = t(k); if (v && v !== 'não tenho base') out.push(f(v)); }
  const N = t('al3'); if (N && N !== 'não vivo de agenda') out.push(`${N} faltas sem avisar por mês`);
  const E = t('E'); if (E) out.push(`${E} ${E === '1' ? 'pessoa atende' : 'pessoas atendem'} hoje`);
  return out.map(s => s.charAt(0).toUpperCase() + s.slice(1));
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MOTIVO_DO_PRAZO: Record<string, string> = {
  'Agora/esta semana': 'Você disse que quer resolver isso agora: dá para começar esta semana.',
  'Até 30 dias': 'Para resolver em até 30 dias, a decisão precisa acontecer agora.',
};
const MOTIVO_DO_NUMERO: Record<string, string> = {
  'Já tivemos bloqueio': 'Outro bloqueio de número pode parar o atendimento de novo.',
  'Celular pessoal': 'Número em celular pessoal deixa a operação exposta a bloqueio.',
  'Os dois': 'Celular pessoal e histórico de bloqueio: o risco de parar é real.',
};
/** Motivos de fechamento, só com o que veio da ficha e da conta (3 a 5 frases curtas). */
export function closingBullets(a: Answers, conta: Pick<Account, 'prudente' | 'multiplo' | 'payback'>): string[] {
  const t = (id: string) => { if (isUnknown(a, id)) return ''; const v = answerText(a, id); return Array.isArray(v) ? '' : v.trim(); };
  const out: string[] = [];
  if (conta.prudente > 0) out.push(`Cada mês de espera custa cerca de ${brl(conta.prudente)}, na conta conservadora.`);
  if (conta.multiplo !== null && conta.multiplo >= 1) out.push(`O ganho estimado é ${conta.multiplo.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} vezes a mensalidade.`);
  if (conta.payback !== null && conta.payback <= 365) out.push(`O investimento se paga em cerca de ${Math.max(1, Math.round(conta.payback))} dias.`);
  const prazo = MOTIVO_DO_PRAZO[t('prazo')]; if (prazo) out.push(prazo);
  const numero = MOTIVO_DO_NUMERO[t('al8')]; if (numero) out.push(numero);
  const dores = answerText(a, 'dores');
  const dor = !isUnknown(a, 'dores') ? (Array.isArray(dores) ? dores[0] : dores) : '';
  if (dor) out.push(`Sem decidir, continua o problema: ${dor.replace(/ \(.*\)$/, '').toLowerCase()}.`);
  const meta = t('meta90');
  if (meta && meta !== 'Outro') out.push(`Sua meta de 90 dias depende de começar agora: ${meta.toLowerCase()}.`);
  return out.slice(0, 5).map((b) => b.slice(0, 280));
}

/** Dados da ancoragem que podem ir ao link público do cliente (sem pacote do closer). */
export function anchoringPayload(a: Answers, conta: Account) {
  const plan = chosenPlan(a); const users = defaultUsers(a); const v = planValues(users, plan);
  return { fatos: clientFacts(a), plano: plan, usuarios: users, mensalidade: v.mensal, prudente: conta.prudente, ganho: conta.ganho, alavancas: conta.alavancas.filter(l => l.soma && l.valor !== null && l.valor > 0).map(l => ({ nome: l.nome, valor: l.valor ?? 0 })), bullets: closingBullets(a, conta) };
}
export type AnchoringData = ReturnType<typeof anchoringPayload>;

/** Plano escolhido e valores, gravados na ficha para a próxima etapa (proposta). */
export function planRecord(a: Answers) {
  if (!PLANS.some(x => x.name === a['plano_escolhido'])) return {};
  const plan = chosenPlan(a); const usuarios = defaultUsers(a); const v = planValues(usuarios, plan);
  return { plano: plan, usuarios, mensal: v.mensal, anual: v.anual, implantacao: v.implantacao, economia_ano: Math.round((v.mensal - v.anual) * 12 * 100) / 100 };
}
