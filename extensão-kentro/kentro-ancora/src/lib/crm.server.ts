// Consulta ao CRM pela API de integração da Kentro. Só o funil Vendas, e só leitura.
// A API não busca por texto: a lista de oportunidades abertas do funil fica 1 minuto em memória e é filtrada aqui.
import { filtrarOportunidades, respostasDaOportunidade, type DadosOportunidade, type OportunidadeCrm, type ResumoOportunidade } from './crm';

const FUNIL_VENDAS = 6;
const CACHE_MS = 60_000;

interface ConfigCrm {
  base: string;
  fila: number;
  chave: string;
  funil: number;
}

function config(): ConfigCrm | null {
  const chave = process.env['KENTRO_API_KEY']?.trim();
  const fila = Number(process.env['KENTRO_FILA_ID']);
  if (!chave || !Number.isInteger(fila) || fila <= 0) return null;
  const base = (process.env['KENTRO_API_URL']?.trim() || 'https://kentrosistemas.atenderbem.com').replace(/\/+$/, '');
  const funil = Number(process.env['KENTRO_FUNIL_VENDAS']);
  return { base, fila, chave, funil: Number.isInteger(funil) && funil > 0 ? funil : FUNIL_VENDAS };
}

export const crmConfigurado = () => config() !== null;

async function chamar<T>(cfg: ConfigCrm, metodo: string, corpo: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${cfg.base}/int/${metodo}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queueId: cfg.fila, apiKey: cfg.chave, ...corpo }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) throw new Error(`O CRM respondeu ${r.status} em ${metodo}.`);
  return (await r.json()) as T;
}

let cache: { ate: number; lista: OportunidadeCrm[] } | null = null;
let emAndamento: Promise<OportunidadeCrm[]> | null = null;

function oportunidadesDoFunil(cfg: ConfigCrm): Promise<OportunidadeCrm[]> {
  if (cache && cache.ate > Date.now()) return Promise.resolve(cache.lista);
  emAndamento ??= chamar<unknown>(cfg, 'getPipeOpportunities', { pipelineId: cfg.funil })
    .then(l => {
      const lista = (Array.isArray(l) ? l : []).filter((o): o is OportunidadeCrm => typeof o === 'object' && o !== null && typeof (o as OportunidadeCrm).id === 'number');
      cache = { ate: Date.now() + CACHE_MS, lista };
      return lista;
    })
    .finally(() => { emAndamento = null; });
  return emAndamento;
}

export async function buscarNoCrm(usuarioId: string, termo: string): Promise<ResumoOportunidade[]> {
  const cfg = config();
  if (!cfg) throw new Error('CRM não configurado.');
  return filtrarOportunidades(await oportunidadesDoFunil(cfg), termo, usuarioId);
}

/** Dados de uma oportunidade do funil Vendas. Oportunidade de outro funil não é lida. */
export async function oportunidadeDeVendas(id: number): Promise<DadosOportunidade | null> {
  const cfg = config();
  if (!cfg) throw new Error('CRM não configurado.');
  const o = await chamar<OportunidadeCrm | null>(cfg, 'getOpportunity', { id });
  if (!o || typeof o.id !== 'number' || o.fkPipeline !== cfg.funil) return null;
  return respostasDaOportunidade(o);
}

/** Só para os testes. */
export function limparCacheCrm(): void {
  cache = null;
}
