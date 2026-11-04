// O Doca sobe `node dist/main.js`. O servidor gerado pelo Nitro já traz as dependências dentro de dist/.
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(import.meta.dirname, '..', 'dist');
if (!existsSync(join(dist, 'server', 'index.mjs'))) throw new Error('O build não gerou dist/server/index.mjs.');
writeFileSync(join(dist, 'main.js'), "import './server/index.mjs';\n");
// Vale mesmo que o contêiner leve só a pasta dist/, sem o package.json da raiz.
writeFileSync(join(dist, 'package.json'), '{ "type": "module" }\n');
console.log('dist/ pronto: main.js, server/, public/');
