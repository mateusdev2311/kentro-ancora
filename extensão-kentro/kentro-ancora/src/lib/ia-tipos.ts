import type { Answers } from './ficha';

type Falha = { ok: false; message: string };
export type ResultadoVenda = { ok: true; pacote_closer: string; proposta_cliente: string; relatorio: string | null } | Falha;
export type ResultadoBullets = { ok: true; bullets: string[] } | Falha;
export type ResultadoTranscricao = { ok: true; answers: Answers } | Falha;
