import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSessao } from './sessao.middleware';

const FALHA = 'Não foi possível consultar o CRM agora. Tente de novo em instantes.';

/** Se o serviço tem a chave da API da Kentro. Sem ela, a tela não mostra a busca. */
export const crmDisponivel = createServerFn({ method: 'POST' }).middleware([requireSessao]).handler(async () => {
  const { crmConfigurado } = await import('./crm.server');
  return crmConfigurado();
});

export const buscarOportunidades = createServerFn({ method: 'POST' }).middleware([requireSessao]).inputValidator(z.object({ termo: z.string().max(100) })).handler(async ({ data, context }) => {
  const { buscarNoCrm } = await import('./crm.server');
  try {
    return { ok: true as const, lista: await buscarNoCrm(context.usuario.id, data.termo) };
  } catch (erro) {
    console.error('Falha ao buscar oportunidades', erro);
    return { ok: false as const, message: FALHA };
  }
});

export const dadosDaOportunidade = createServerFn({ method: 'POST' }).middleware([requireSessao]).inputValidator(z.object({ id: z.number().int().positive() })).handler(async ({ data }) => {
  const { oportunidadeDeVendas } = await import('./crm.server');
  try {
    const dados = await oportunidadeDeVendas(data.id);
    return dados ? { ok: true as const, dados } : { ok: false as const, message: 'Essa oportunidade não está no funil Vendas.' };
  } catch (erro) {
    console.error('Falha ao ler a oportunidade', erro);
    return { ok: false as const, message: FALHA };
  }
});
