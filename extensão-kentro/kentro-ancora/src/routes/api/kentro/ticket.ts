import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const corpo = z.object({
  usuario: z.object({
    id: z.union([z.string().min(1).max(40), z.number().int()]),
    nome: z.string().max(300).nullish(),
    email: z.string().max(300).nullish(),
    tipo: z.number().int().nullish(),
  }),
  contexto: z.object({ contato_nome: z.string().max(300).optional() }).optional(),
});
const responder = (dados: unknown, status: number) => Response.json(dados, { status, headers: { 'Cache-Control': 'no-store' } });

// Chamado pela extensão, pelo servidor da Kentro (omni.http.request). A chave fica na instalação da extensão.
export const Route = createFileRoute('/api/kentro/ticket')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { chaveExtensaoValida, emitirTicket, urlPublica } = await import('@/lib/sessao.server');
        if (!chaveExtensaoValida(request.headers.get('x-ancora-chave'))) return responder({ erro: 'CHAVE_INVALIDA' }, 401);
        const dados = corpo.safeParse(await request.json().catch(() => null));
        if (!dados.success) return responder({ erro: 'DADOS_INVALIDOS' }, 400);
        const ticket = await emitirTicket(dados.data.usuario, dados.data.contexto ?? {});
        if (!ticket) return responder({ erro: 'USUARIO_DESATIVADO' }, 403);
        return responder({ url: `${urlPublica()}/entrar?ticket=${encodeURIComponent(ticket)}` }, 200);
      },
    },
  },
});
