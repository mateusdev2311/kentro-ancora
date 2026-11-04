import { useCallback } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { buscarGeracao } from './ancora.functions';

const INTERVALO_MS = 3000;
const LIMITE_MS = 16 * 60 * 1000;
const espera = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

/**
 * Dispara uma geração de IA e espera o resultado consultando o servidor.
 * Uma falha de rede numa consulta não derruba a espera: a geração continua no servidor.
 */
export function useGeracao<Entrada, Resultado>(iniciar: (arg: { data: Entrada }) => Promise<{ id: string }>) {
  const consultar = useServerFn(buscarGeracao);
  return useCallback(async (arg: { data: Entrada }): Promise<Resultado> => {
    const { id } = await iniciar(arg);
    const limite = Date.now() + LIMITE_MS;
    while (Date.now() < limite) {
      await espera(INTERVALO_MS);
      let geracao: Awaited<ReturnType<typeof consultar>>;
      try {
        geracao = await consultar({ data: { id } });
      } catch {
        continue;
      }
      if (!geracao) throw new Error('Geração não encontrada.');
      if (geracao.status !== 'processando') return JSON.parse(geracao.resultado) as Resultado;
    }
    throw new Error('A geração demorou mais do que o esperado.');
  }, [iniciar, consultar]);
}
