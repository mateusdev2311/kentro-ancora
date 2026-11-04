import { createMiddleware } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

/** Exige a sessão aberta pelo ticket da extensão e entrega o usuário às funções do servidor. */
export const requireSessao = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const { usuarioDoCabecalho } = await import('./sessao.server');
  const usuario = await usuarioDoCabecalho(getRequest()?.headers.get('authorization'));
  if (!usuario) throw new Error('Sessão expirada. Abra o Método ÂNCORA de novo pelo menu da Kentro.');
  return next({ context: { usuario } });
});
