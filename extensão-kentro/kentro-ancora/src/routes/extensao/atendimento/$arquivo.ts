import { createFileRoute } from '@tanstack/react-router';
import manifest from '../../../../extension/atendimento/manifest.json?raw';
import abrir from '../../../../extension/atendimento/abrir.html?raw';
import painel from '../../../../extension/atendimento/painel.html?raw';
import icone from '../../../../extension/atendimento/icone.svg?raw';

const ARQUIVOS: Record<string, { corpo: string; tipo: string }> = {
  'manifest.json': { corpo: manifest, tipo: 'application/json; charset=utf-8' },
  'abrir.html': { corpo: abrir, tipo: 'text/html; charset=utf-8' },
  'painel.html': { corpo: painel, tipo: 'text/html; charset=utf-8' },
  'icone.svg': { corpo: icone, tipo: 'image/svg+xml' },
};
// A Kentro recusa instalar (e montar) extensão cujo host não devolve este cabeçalho.
const CORS = { 'Access-Control-Allow-Origin': '*' };

export const Route = createFileRoute('/extensao/atendimento/$arquivo')({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': '*' } }),
      GET: async ({ params }) => {
        const arquivo = Object.hasOwn(ARQUIVOS, params.arquivo) ? ARQUIVOS[params.arquivo] : undefined;
        if (!arquivo) return new Response('Arquivo não encontrado.', { status: 404, headers: CORS });
        let corpo = arquivo.corpo;
        if (params.arquivo === 'manifest.json') {
          const { urlPublica } = await import('@/lib/sessao.server');
          corpo = corpo.split('__URL_PUBLICA__').join(urlPublica());
        }
        return new Response(corpo, { headers: { ...CORS, 'Cache-Control': 'no-cache', 'Content-Type': arquivo.tipo } });
      },
    },
  },
});
