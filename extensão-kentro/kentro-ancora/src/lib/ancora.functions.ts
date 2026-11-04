import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { answerSchema, calculate } from './ancora';
import { planRecord } from './anchoring';
import { publicPayload } from './proposal';
import { buildReport, mergeReport } from './report';
import { answerText, isUnknown } from './answer-state';
import { requireSessao } from './sessao.middleware';

const paraJson = (valor: unknown) => JSON.parse(JSON.stringify(valor)) as never;

export const generateSale = createServerFn({ method: 'POST' }).middleware([requireSessao]).inputValidator(answerSchema).handler(async ({ data, context }) => {
  const { iniciarGeracao } = await import('./geracoes.server');
  const { executarVenda } = await import('./ancora-ia.server');
  return iniciarGeracao(context.usuario.id, 'venda', () => executarVenda(data));
});

export const generateClosingBullets = createServerFn({ method: 'POST' }).middleware([requireSessao]).inputValidator(answerSchema).handler(async ({ data, context }) => {
  const { iniciarGeracao } = await import('./geracoes.server');
  const { executarBullets } = await import('./ancora-ia.server');
  return iniciarGeracao(context.usuario.id, 'bullets', () => executarBullets(data));
});

export const buscarGeracao = createServerFn({ method: 'POST' }).middleware([requireSessao]).inputValidator(z.object({ id: z.string().uuid() })).handler(async ({ data, context }) => {
  const { consultarGeracao } = await import('./geracoes.server');
  const geracao = await consultarGeracao(context.usuario.id, data.id);
  return geracao ? { status: geracao.status, resultado: JSON.stringify(geracao.resultado ?? null) } : null;
});

export const saveSale = createServerFn({ method: 'POST' }).middleware([requireSessao]).inputValidator(z.object({ id: z.string().uuid(), respostas: answerSchema, pacote_closer: z.string().min(1).max(200000), proposta_cliente: z.string().min(1).max(200000), relatorio: z.string().max(50000).nullish() })).handler(async ({ data, context }) => {
  const { inserirFicha } = await import('./fichas.server');
  const { usuario } = context;
  const text = (k: string) => { const v = answerText(data.respostas, k); return !isUnknown(data.respostas, k) && typeof v === 'string' ? v.slice(0, 300) : ''; };
  const conta = calculate(data.respostas);
  const relatorio = (() => { try { return data.relatorio ? JSON.parse(data.relatorio) : null; } catch { return null; } })();
  try {
    const salva = await inserirFicha(usuario, {
      id: data.id,
      cliente_nome: text('cliente_nome'),
      closer_nome: usuario.nome || text('closer_nome') || '',
      segmento: text('nicho') || text('segmento'),
      cidade: text('cidade'),
      respostas: paraJson(data.respostas),
      transcricao: typeof data.respostas['transcricao'] === 'string' ? data.respostas['transcricao'] : '',
      conta: paraJson(conta),
      pacote_closer: data.pacote_closer,
      proposta_cliente: data.proposta_cliente,
      plano: paraJson(planRecord(data.respostas)),
      ancoragem: paraJson(publicPayload(data.respostas, conta, usuario.nome || undefined)),
      proposta_gerada: data.respostas['proposta_gerada'] === 'sim',
      relatorio_dados: paraJson(mergeReport(relatorio, buildReport(data.respostas, conta))),
    });
    if (!salva) return { ok: false as const, message: 'Não foi possível confirmar a gravação. Tente salvar novamente.' };
    return { ok: true as const, id: salva.id, created_at: salva.created_at };
  } catch (erro) {
    console.error('Falha ao salvar a ficha', erro);
    return { ok: false as const, message: 'Os textos estão prontos, mas a ficha não foi salva. Tente salvar novamente.' };
  }
});

/** Atualiza plano e proposta de uma ficha já salva. O servidor recalcula tudo a partir das respostas. */
export const syncFicha = createServerFn({ method: 'POST' }).middleware([requireSessao]).inputValidator(z.object({ id: z.string().uuid(), respostas: answerSchema })).handler(async ({ data, context }) => {
  const { atualizarFichaDoDono } = await import('./fichas.server');
  const conta = calculate(data.respostas);
  const ok = await atualizarFichaDoDono(context.usuario, data.id, {
    plano: paraJson(planRecord(data.respostas)),
    ancoragem: paraJson(publicPayload(data.respostas, conta, context.usuario.nome || undefined)),
    proposta_gerada: data.respostas['proposta_gerada'] === 'sim',
    relatorio_dados: paraJson(buildReport(data.respostas, conta)),
  });
  if (!ok) throw new Error('Ficha não encontrada.');
  return { ok: true as const };
});
