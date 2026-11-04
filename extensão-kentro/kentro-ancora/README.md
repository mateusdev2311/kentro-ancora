# Método ÂNCORA

Venda consultiva da Kentro: diagnóstico, conta ao vivo, planos, relatório de decisão e proposta para o cliente. Usada pelo comercial dentro da Kentro, por uma extensão, e hospedada no Doca.

- **Stack:** TanStack Start (React + server functions) e Postgres. Sem IA.
- **Implantação e operação:** [docs/implantacao.md](docs/implantacao.md).

```sh
npm install
npm run db:local   # Postgres local; a DATABASE_URL aparece no terminal
cp .env.example .env
npm run dev
```

Testes: `npm test`. Build: `npm run build` gera `dist/main.js`, e `npm start` sobe o serviço.
