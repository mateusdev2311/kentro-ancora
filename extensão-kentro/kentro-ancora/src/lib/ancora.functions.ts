import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { answerSchema, calculate } from './ancora';
import { planRecord } from './anchoring';
import { publicPayload } from './proposal';
import { buildReport } from './report';
import { answerText, isUnknown } from './answer-state';
import { gerarTextosVenda } from './venda-textos';
import { requireSessao } from './sessao.middleware';

const paraJson = (valor: unknown) => JSON.parse(JSON.stringify(valor)) as never;

/** Monta os textos no servidor, a partir das respostas, e salva a ficha. */
export const saveSale = createServerFn({ method: 'POST' }).middleware([requireSessao]).inputValidator(z.object({ id: z.string().uuid(), respostas: answerSchema })).handler(async ({ data, context }) => {
  const { inserirFicha } = await import('./fichas.server');
  const { usuario } = context;
  const text = (k: string) => { const v = answerText(data.respostas, k); return !isUnknown(data.respostas, k) && typeof v === 'string' ? v.slice(0, 300) : ''; };
  const conta = calculate(data.respostas);
  const textos = gerarTextosVenda(data.respostas, conta, usuario.nome);
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
      ...textos,
      plano: paraJson(planRecord(data.respostas)),
      ancoragem: paraJson(publicPayload(data.respostas, conta, usuario.nome || undefined)),
      proposta_gerada: data.respostas['proposta_gerada'] === 'sim',
      relatorio_dados: paraJson(buildReport(data.respostas, conta)),
    });
    if (!salva) return { ok: false as const, message: 'Não foi possível confirmar a gravação. Tente novamente.' };
    return { ok: true as const, id: salva.id, created_at: salva.created_at, ...textos };
  } catch (erro) {
    console.error('Falha ao salvar a ficha', erro);
    return { ok: false as const, message: 'A ficha não foi salva. Suas respostas foram preservadas; tente novamente.' };
  }
});

/** Atualiza plano, proposta e textos de uma ficha já salva. O servidor recalcula tudo a partir das respostas. */
export const syncFicha = createServerFn({ method: 'POST' }).middleware([requireSessao]).inputValidator(z.object({ id: z.string().uuid(), respostas: answerSchema })).handler(async ({ data, context }) => {
  const { atualizarFichaDoDono } = await import('./fichas.server');
  const conta = calculate(data.respostas);
  const ok = await atualizarFichaDoDono(context.usuario, data.id, {
    ...gerarTextosVenda(data.respostas, conta, context.usuario.nome),
    plano: paraJson(planRecord(data.respostas)),
    ancoragem: paraJson(publicPayload(data.respostas, conta, context.usuario.nome || undefined)),
    proposta_gerada: data.respostas['proposta_gerada'] === 'sim',
    relatorio_dados: paraJson(buildReport(data.respostas, conta)),
  });
  if (!ok) throw new Error('Ficha não encontrada.');
  return { ok: true as const };
});
