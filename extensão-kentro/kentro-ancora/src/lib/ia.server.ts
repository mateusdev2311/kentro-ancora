// Chamadas à IA com as chaves próprias da Kentro. Geração com Claude; leitura de transcrição com OpenAI,
// para que trocar o modelo de geração não afete a extração.
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const modeloGeracao = () => process.env['IA_MODELO_GERACAO']?.trim() || 'claude-opus-5';
const modeloTranscricao = () => process.env['IA_MODELO_TRANSCRICAO']?.trim() || 'gpt-5.6-luna';

export class RecusaIA extends Error {}

/** Mensagem para a tela a partir do erro de um dos provedores; o detalhe fica só no log. */
export function mensagemErroIA(erro: unknown, contexto: { creditos: string; ocupada: string; geral: string }): string {
  const status = erro instanceof Anthropic.APIError || erro instanceof OpenAI.APIError ? erro.status : undefined;
  if (status === 402) return contexto.creditos;
  if (status === 429) return contexto.ocupada;
  return contexto.geral;
}

/**
 * Texto do Claude, com streaming porque max_tokens é alto.
 * `fallbacks: "default"`: se o modelo recusar por política, a própria API refaz o pedido em outro modelo.
 */
export async function textoClaude(system: string, conteudo: string): Promise<string> {
  const stream = new Anthropic().beta.messages.stream({
    model: modeloGeracao(),
    max_tokens: 128000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    messages: [{ role: 'user', content: conteudo }],
  } as Parameters<Anthropic['beta']['messages']['stream']>[0]);
  const mensagem = await stream.finalMessage();
  if (mensagem.stop_reason === 'refusal') throw new RecusaIA('A IA não pôde atender a esta solicitação.');
  let texto = '';
  for (const bloco of mensagem.content as { type: string; text?: string }[]) {
    // O texto parcial do modelo que recusou no meio da resposta fica antes do bloco "fallback".
    if (bloco.type === 'fallback') texto = '';
    if (bloco.type === 'text') texto += bloco.text ?? '';
  }
  return texto;
}

/** JSON da leitura de transcrição. */
export async function jsonOpenAI(instrucoes: string, conteudo: string): Promise<string> {
  const stream = await new OpenAI().responses.create({
    model: modeloTranscricao(),
    instructions: instrucoes,
    text: { format: { type: 'json_object' } },
    input: [{ role: 'user', content: conteudo }],
    stream: true,
  });
  let saida = '';
  for await (const evento of stream) {
    if (evento.type === 'response.output_text.delta') saida += evento.delta;
    if (evento.type === 'response.refusal.delta') throw new RecusaIA('A IA não pôde extrair essa transcrição.');
  }
  return saida;
}
