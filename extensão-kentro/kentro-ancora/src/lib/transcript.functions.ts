import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSessao } from './sessao.middleware';

export const importTranscript = createServerFn({ method: 'POST' }).middleware([requireSessao]).inputValidator(z.object({ text: z.string().max(30000), link: z.string().max(2000) })).handler(async ({ data, context }) => {
  const { iniciarGeracao } = await import('./geracoes.server');
  const { executarTranscricao } = await import('./transcript.server');
  return iniciarGeracao(context.usuario.id, 'transcricao', () => executarTranscricao(data));
});
