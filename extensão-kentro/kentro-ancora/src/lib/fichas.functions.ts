import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { answerSchema } from './ancora';
import { requireSessao } from './sessao.middleware';

const comId = z.object({ id: z.string().uuid() });
// O corpo das colunas jsonb vai como texto: a tela já valida o formato com zod ao receber.
const emTexto = <T extends object>(linha: T | null) => (linha ? JSON.stringify(linha) : null);

/** Quem está conectado. Sem sessão devolve null, para a tela mandar à página de entrada. */
export const minhaSessao = createServerFn({ method: 'POST' }).handler(async () => {
  const { usuarioDoCabecalho } = await import('./sessao.server');
  return usuarioDoCabecalho(getRequest()?.headers.get('authorization'));
});

export const entrarComTicket = createServerFn({ method: 'POST' }).inputValidator(z.object({ ticket: z.string().min(20).max(200) })).handler(async ({ data }) => {
  const { trocarTicket } = await import('./sessao.server');
  return trocarTicket(data.ticket);
});

/** Link de uso único para abrir o app em uma aba própria (apresentar à tela cheia, imprimir o PDF). */
export const linkNovaAba = createServerFn({ method: 'POST' }).middleware([requireSessao]).handler(async ({ context }) => {
  const { emitirTicket } = await import('./sessao.server');
  const { usuario } = context;
  // Reemitir mantém o papel gravado: 1 = supervisor (master), 2 = agente (closer).
  const ticket = await emitirTicket({ id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.role === 'master' ? 1 : 2 });
  if (!ticket) throw new Error('Usuário desativado.');
  return { caminho: `/entrar?ticket=${encodeURIComponent(ticket)}` };
});

export const buscarFicha = createServerFn({ method: 'POST' }).middleware([requireSessao]).inputValidator(comId).handler(async ({ data, context }) => {
  const { lerFicha } = await import('./fichas.server');
  return emTexto(await lerFicha(context.usuario, data.id));
});

export const minhasFichas = createServerFn({ method: 'POST' }).middleware([requireSessao]).handler(async ({ context }) => {
  const { listarMinhasFichas } = await import('./fichas.server');
  return listarMinhasFichas(context.usuario);
});

export const todasFichas = createServerFn({ method: 'POST' }).middleware([requireSessao]).handler(async ({ context }) => {
  const { listarTodasFichas } = await import('./fichas.server');
  return listarTodasFichas(context.usuario);
});

export const usuariosParaFiltro = createServerFn({ method: 'POST' }).middleware([requireSessao]).handler(async ({ context }) => {
  const { listarUsuarios } = await import('./fichas.server');
  return listarUsuarios(context.usuario);
});

/** Público: quem tem o UUID exato do link do cliente. Não exige sessão. */
export const fichaPublica = createServerFn({ method: 'POST' }).inputValidator(comId).handler(async ({ data }) => {
  const { fichaDoCliente } = await import('./fichas.server');
  return emTexto(await fichaDoCliente(data.id));
});

/** Público: quem tem o UUID exato do link da conta ao vivo. Não exige sessão. */
export const contaPublica = createServerFn({ method: 'POST' }).inputValidator(comId).handler(async ({ data }) => {
  const { contaAoVivoPublica } = await import('./fichas.server');
  return emTexto(await contaAoVivoPublica(data.id));
});

const conteudoConta = z.object({ cliente_nome: z.string().max(300), conta: z.string().max(20000) });
export const criarConta = createServerFn({ method: 'POST' }).middleware([requireSessao]).inputValidator(conteudoConta).handler(async ({ data, context }) => {
  const { criarContaAoVivo } = await import('./fichas.server');
  return { id: await criarContaAoVivo(context.usuario, data.cliente_nome, JSON.parse(data.conta) as never) };
});
export const atualizarConta = createServerFn({ method: 'POST' }).middleware([requireSessao]).inputValidator(conteudoConta.extend({ id: z.string().uuid() })).handler(async ({ data, context }) => {
  const { atualizarContaAoVivo } = await import('./fichas.server');
  return { ok: await atualizarContaAoVivo(context.usuario, data.id, data.cliente_nome, JSON.parse(data.conta) as never) };
});

export const buscarRascunho = createServerFn({ method: 'POST' }).middleware([requireSessao]).handler(async ({ context }) => {
  const { lerRascunho } = await import('./fichas.server');
  return emTexto(await lerRascunho(context.usuario));
});
export const guardarRascunho = createServerFn({ method: 'POST' }).middleware([requireSessao]).inputValidator(z.object({ respostas: answerSchema, conta_ao_vivo_id: z.string().uuid().nullable() })).handler(async ({ data, context }) => {
  const { salvarRascunho } = await import('./fichas.server');
  await salvarRascunho(context.usuario, data.respostas as never, data.conta_ao_vivo_id);
  return { ok: true as const };
});
export const limparRascunho = createServerFn({ method: 'POST' }).middleware([requireSessao]).handler(async ({ context }) => {
  const { apagarRascunho } = await import('./fichas.server');
  await apagarRascunho(context.usuario);
  return { ok: true as const };
});
