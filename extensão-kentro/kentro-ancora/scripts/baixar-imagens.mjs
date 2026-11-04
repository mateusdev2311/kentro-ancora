// As imagens do projeto ficaram no armazenamento da Lovable; o repositório só tem ponteiros (.asset.json).
// Este script baixa cada uma para public/imagens/ e faz o ponteiro apontar para o arquivo local.
// Uso: node scripts/baixar-imagens.mjs [host]   Pode ser repetido: o que já foi baixado é ignorado.
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const raiz = join(import.meta.dirname, '..');
const assets = join(raiz, 'src', 'assets');
const host = process.argv[2] ?? 'id-preview--321d1da5-bc21-4084-8f8e-a24f38e5b7dc.lovable.app';

const ponteiros = (pasta) =>
  readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    return statSync(caminho).isDirectory() ? ponteiros(caminho) : nome.endsWith('.asset.json') ? [caminho] : [];
  });

let baixadas = 0;
for (const arquivo of ponteiros(assets)) {
  const ponteiro = JSON.parse(readFileSync(arquivo, 'utf8'));
  if (ponteiro.url.startsWith('/imagens/')) continue;
  const resposta = await fetch(`https://${host}${ponteiro.url}`);
  if (!resposta.ok) throw new Error(`${ponteiro.original_filename}: HTTP ${resposta.status}`);
  const conteudo = Buffer.from(await resposta.arrayBuffer());
  if (conteudo.length !== ponteiro.size) throw new Error(`${ponteiro.original_filename}: tamanho ${conteudo.length}, esperado ${ponteiro.size}`);
  const destinoRelativo = join(relative(assets, dirname(arquivo)), ponteiro.original_filename).replaceAll('\\', '/');
  const destino = join(raiz, 'public', 'imagens', destinoRelativo);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, conteudo);
  writeFileSync(arquivo, `${JSON.stringify({ url: `/imagens/${destinoRelativo}`, original_filename: ponteiro.original_filename, size: ponteiro.size, content_type: ponteiro.content_type }, null, 2)}\n`);
  baixadas += 1;
  console.log(`ok ${destinoRelativo}`);
}
console.log(`${baixadas} imagens baixadas.`);
