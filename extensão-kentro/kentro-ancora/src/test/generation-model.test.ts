import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => {
  class APIError extends Error {
    constructor(public status: number) {
      super('erro da API');
    }
  }
  const stream = vi.fn();
  class Anthropic {
    static APIError = APIError;
    beta = { messages: { stream } };
  }
  return { Anthropic, APIError, stream };
});
vi.mock('@anthropic-ai/sdk', () => ({ default: sdk.Anthropic }));

import { executarBullets, executarVenda } from '@/lib/ancora-ia.server';

const respostaCom = (content: unknown[], stop_reason = 'end_turn') => ({ finalMessage: async () => ({ stop_reason, content }) });

describe('Geração com Claude', () => {
  beforeEach(() => sdk.stream.mockReset());

  it.each([
    ['venda', executarVenda],
    ['fechamento', executarBullets],
  ])('usa o modelo escolhido e o fallback da API para %s', async (_, executar) => {
    sdk.stream.mockReturnValue(respostaCom([{ type: 'text', text: '- Primeiro argumento\n=== PROPOSTA PARA O CLIENTE ===\n- Segundo argumento' }]));
    const resultado = await executar({});
    expect(sdk.stream).toHaveBeenLastCalledWith(expect.objectContaining({
      model: 'claude-opus-5',
      fallbacks: 'default',
      betas: ['server-side-fallback-2026-07-01'],
      messages: [expect.objectContaining({ role: 'user' })],
    }));
    expect(resultado.ok).toBe(true);
  });

  it('separa o pacote do closer da proposta do cliente', async () => {
    sdk.stream.mockReturnValue(respostaCom([{ type: 'text', text: 'Pacote\n=== PROPOSTA PARA O CLIENTE ===\nProposta' }]));
    const resultado = await executarVenda({});
    expect(resultado).toMatchObject({ ok: true, pacote_closer: 'Pacote', proposta_cliente: 'Proposta' });
  });

  it('descarta o texto do modelo que recusou no meio da resposta', async () => {
    sdk.stream.mockReturnValue(respostaCom([
      { type: 'text', text: 'parcial do modelo que recusou' },
      { type: 'fallback', from: { model: 'a' }, to: { model: 'b' } },
      { type: 'text', text: 'Pacote final\n=== PROPOSTA PARA O CLIENTE ===\nProposta final' },
    ]));
    const resultado = await executarVenda({});
    expect(resultado).toMatchObject({ ok: true, pacote_closer: 'Pacote final', proposta_cliente: 'Proposta final' });
  });

  it('avisa quando toda a cadeia recusa', async () => {
    sdk.stream.mockReturnValue(respostaCom([], 'refusal'));
    expect(await executarVenda({})).toEqual({ ok: false, message: 'A IA não pôde atender a esta solicitação.' });
    expect(await executarBullets({})).toEqual({ ok: false, message: 'A IA não pôde gerar os bullets.' });
  });

  it.each([
    [402, 'Os créditos de IA precisam ser repostos para gerar a venda.'],
    [429, 'A IA está ocupada. Aguarde antes de tentar novamente.'],
    [500, 'A IA não concluiu a geração. Suas respostas foram preservadas; tente novamente quando estiver pronto.'],
  ])('traduz o erro %i da API sem expor o detalhe', async (status, mensagem) => {
    const erroLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    sdk.stream.mockReturnValue({ finalMessage: async () => { throw new sdk.APIError(status); } });
    expect(await executarVenda({})).toEqual({ ok: false, message: mensagem });
    erroLog.mockRestore();
  });
});
