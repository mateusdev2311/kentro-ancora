import type { Answers } from './ficha';
import { OPEN, answerText, isUnknown, parseOpenNumber } from './answer-state';
import type { Account } from './ancora';
import { chosenPlan, defaultUsers } from './anchoring';

export const VALIDITY = '3 dias úteis';
export { NEXT_STEP } from './report';
import { buildReport } from './report';
export const DEFAULT_SELLER = 'Vitor Barbalho';
const L_MID: Record<string, number> = { 'Até 50': 30, '51 a 150': 100, '151 a 400': 275, '401 a 1.000': 700, 'Mais de 1.000': 1200 };

/** Contatos/mês (L) ÷ 22 dias úteis; null quando não informado. */
export function convPerDay(a: Answers): number | null {
  if (isUnknown(a, 'L')) return null;
  const n = a['L'] === OPEN ? parseOpenNumber(String(answerText(a, 'L'))) : L_MID[String(a['L'])] ?? null;
  return n === null || n <= 0 ? null : Math.max(1, Math.round(n / 22));
}

const str = (a: Answers, k: string) => { const v = answerText(a, k); return !isUnknown(a, k) && typeof v === 'string' ? v.trim().slice(0, 200) : ''; };

/** Variáveis do deck da proposta (seguras para o link público do cliente). */
export function proposalData(a: Answers, conta: Account, seller?: string) {
  const d = convPerDay(a);
  return {
    cliente: str(a, 'cliente_nome'), closer: seller || str(a, 'closer_nome') || DEFAULT_SELLER, segmento: str(a, 'nicho') || str(a, 'segmento'),
    convDia: d === null ? null : `~${d} conversas/dia`, ticket: conta.ticket, perda: conta.prudente,
    usuarios: defaultUsers(a), plano: chosenPlan(a), gerada: a['proposta_gerada'] === 'sim',
  };
}
export type ProposalData = ReturnType<typeof proposalData>;

export type CaseKey = 'farmacia' | 'dental' | 'odonto';
/** Cases do mesmo segmento primeiro; sempre devolve 2. */
export function pickCases(segmento: string): CaseKey[] {
  const s = segmento.toLowerCase();
  if (/odont|dent|clínic|clinic|saúde|saude|estétic|estetic|médic|medic/.test(s)) return ['dental', 'odonto'];
  return ['farmacia', 'dental'];
}

import { anchoringPayload } from './anchoring';
/** Ancoragem + variáveis do deck, gravadas em fichas.ancoragem para /c/:id. */
export function publicPayload(a: Answers, conta: Account, seller?: string) {
  return { ...anchoringPayload(a, conta), proposta: proposalData(a, conta, seller), relatorio: buildReport(a, conta) };
}
