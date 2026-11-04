import { z } from 'zod';
import type { Answers } from './ficha';
import type { Account } from './ancora';
import { chosenPlan, clientFacts, closingBullets, defaultUsers, planValues } from './anchoring';

export const NEXT_STEP = 'assinatura + kickoff nesta semana';
export const HEALTHY_MULTIPLE = 5;

/** O que o Kentro faz para tampar cada vazamento (por alavanca que soma). */
export const LEAK_FIX: Record<string, { vazamento: string; tampa: string }> = {
  'Leads perdidos fora do horário/demora': { vazamento: 'Leads fora do horário e por demora', tampa: 'Atendimento 24h com IA Kentro e resposta imediata no WhatsApp' },
  'Orçamentos sem follow-up': { vazamento: 'Orçamentos sem follow-up', tampa: 'Follow-up automático com cadência e lembretes no CRM' },
  'Faltas na agenda': { vazamento: 'Faltas na agenda', tampa: 'Confirmação e lembrete automáticos antes do horário' },
  'Reativação/recompra': { vazamento: 'Base inativa que não recompra', tampa: 'Campanhas de reativação segmentadas para a base' },
  'Ferramentas substituídas': { vazamento: 'Ferramentas pagas e desconectadas', tampa: 'Tudo numa plataforma só: CRM, chat, agenda e disparos' },
};

const lever = z.object({ alavanca: z.string(), valor: z.number().nullable(), conta: z.string().default(''), resposta: z.string().default('') });
export const reportSchema = z.object({
  perda_por_alavanca: z.array(lever).default([]),
  projecao_12m: z.array(z.object({ mes: z.number(), perda_acumulada: z.number(), custo_acumulado: z.number() })).default([]),
  ganho_mensal: z.number().default(0), cenario_prudente: z.number().default(0),
  multiplo: z.number().nullable().default(null), payback_dias: z.number().nullable().default(null),
  bullets_fechamento: z.array(z.string()).default([]),
  mensalidade: z.number().default(0), implantacao: z.number().default(0), plano: z.string().default(''),
  fatos: z.array(z.string()).default([]), a_confirmar: z.array(z.string()).default([]),
  proximo_passo: z.string().default(NEXT_STEP), parcial: z.boolean().default(false),
});
export type ReportData = z.infer<typeof reportSchema>;

const r2 = (n: number) => Math.round(n * 100) / 100;
const text = (v: unknown) => Array.isArray(v) ? v.join(', ') : typeof v === 'string' ? v : '';

/** Séries do relatório calculadas no app (mesma conta do painel e mesmo motor de preços). */
type ReportAccount = Omit<Account, 'alavancas'> & { alavancas: { nome: string; resposta: string | string[]; estado?: string | undefined; valor: number | null; soma: boolean; conta?: string | undefined }[] };
export function buildReport(a: Answers, conta: ReportAccount): ReportData {
  const plan = chosenPlan(a); const pv = planValues(defaultUsers(a), plan);
  const mensalidade = conta.mensalidade ?? pv.mensal; const implantacao = conta.implantacao ?? pv.implantacao;
  const ganho = conta.ganho; const somam = conta.alavancas.filter(l => l.soma);
  const multiplo = mensalidade > 0 && ganho > 0 ? r2(ganho / mensalidade) : null;
  const payback = mensalidade > 0 && ganho > 0 ? Math.round((implantacao + mensalidade) / (ganho / 30)) : null;
  return {
    perda_por_alavanca: somam.map(l => ({ alavanca: l.nome, valor: l.valor, conta: l.conta ?? '', resposta: l.estado === 'não informado' ? '' : text(l.resposta) })),
    projecao_12m: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, perda_acumulada: r2(ganho * (i + 1)), custo_acumulado: r2(implantacao + mensalidade * (i + 1)) })),
    ganho_mensal: r2(ganho), cenario_prudente: r2(conta.prudente), multiplo, payback_dias: payback,
    bullets_fechamento: closingBullets(a, { prudente: conta.prudente, multiplo, payback }), mensalidade, implantacao, plano: plan,
    fatos: clientFacts(a), a_confirmar: somam.filter(l => l.valor === null).map(l => l.nome),
    proximo_passo: NEXT_STEP, parcial: conta.parcial,
  };
}

/** Lê o relatório salvo; se faltar ou vier quebrado, devolve null para o app recalcular. */
export function readReport(v: unknown): ReportData | null { const r = reportSchema.safeParse(v); return r.success && r.data.projecao_12m.length ? r.data : null; }

/** Mês em que a perda evitada já cobriu o custo acumulado do Kentro. */
export function breakEvenMonth(r: ReportData) { return r.projecao_12m.find(p => p.perda_acumulada > 0 && p.perda_acumulada >= p.custo_acumulado)?.mes ?? null; }
