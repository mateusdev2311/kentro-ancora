# Método ÂNCORA: implantação no Doca

```
Kentro (navegador do comercial)                Doca (este serviço, HTTPS)
┌───────────────────────────────┐ omni.http   ┌─────────────────────────────────┐
│ Extensão: botão "Âncora" e    │────────────▶│ /api/kentro/ticket              │
│ cartão do atendimento         │             │                                 │
└──────────────┬────────────────┘             │ App React + server functions    │
    openEmbed  │ URL com ticket de uso único  │ Postgres do Doca                │
┌──────────────▼────────────────┐   HTTPS     │                                 │
│ Diálogo com o app             │────────────▶│ /entrar troca o ticket por      │
└───────────────────────────────┘             │ uma sessão de 12 horas          │
Cliente: /c/:id e /conta/:id  ───────────────▶│ (públicos, pelo UUID exato)     │
                                              └─────────────────────────────────┘
```

O sistema não usa IA. A conta, o relatório e a proposta saem do cálculo, e os textos da venda saem de modelos preenchidos com a ficha ([src/lib/venda-textos.ts](../src/lib/venda-textos.ts)).

## 1. Antes do primeiro deploy

Crie o repositório e envie o projeto. `dist/`, `node_modules/` e `.env` ficam de fora pelo `.gitignore`. As 25 imagens (11,7 MB) já estão em `public/imagens/` e devem entrar no repositório.

## 2. Projeto no Doca

| Campo | Valor |
|---|---|
| Tipo | API ou microsserviço |
| Pasta do projeto | `extensão-kentro/kentro-ancora` (o repositório começa na pasta `Projetos`) |
| Como construir | NestJS (`npm run build`, depois `dist/main.js`). O app não é Nest, mas o build gera esse arquivo |
| Subdomínio | `kentro-ancora` (HTTPS obrigatório) |
| Porta / verificação | 3000 / `GET /` |
| Node | **22.12 ou mais novo**, exigido pelo TanStack Start. Confira no Doca se o build falhar |
| Banco | Crie um Postgres e **ligue ao projeto** |

Variáveis (modelo em [.env.example](../.env.example)):

| Variável | Valor |
|---|---|
| `DATABASE_URL` | Do banco do Doca |
| `URL_PUBLICA` | `https://kentro-ancora.kentro.com.br` |
| `SEGREDO_SESSAO` | Gere: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |

As tabelas são criadas na primeira subida. Confira em `GET /saude`: deve responder `{"ok":true,"banco":true}`.

## 3. Extensão na instância Kentro sistemas

Manifest: `https://kentro-ancora.kentro.com.br/extensao/atendimento/manifest.json`

1. Em **Configurações › Extensões instaladas › Instalar por URL**, informe o manifest.
2. Comece restrito ao usuário de teste (**Integração - Mateus, id 504**) e só depois abra ao comercial.

Público definitivo (`userIds`, conferido em 04/11/2026 pelo campo Setor = Comercial):

| Id | Usuário |
|---|---|
| 317 | Raphael Maia |
| 431 | Comercial - Maybeane |
| 570 | Lucas Fraga |
| 692 | Comercial - Aline |
| 693 | Comercial - Amanda |
| 704 | Bianca |
| 504 | Integração - Mateus (testes) |

Quem entra novo no comercial precisa ser acrescentado a esse filtro.

Papéis: agente vira **closer** (vê as próprias fichas); administrador e supervisor viram **master** (veem todas). O papel é atualizado a cada abertura pela extensão.

## 4. Roteiro do primeiro teste

Na Kentro, com o usuário de teste:

1. Clique em **Âncora** no menu do topo: o app abre no diálogo, já conectado.
2. Preencha uma ficha de teste e recarregue: o rascunho volta.
3. Clique em **Gerar venda ancorada** e abra o link do cliente numa janela anônima.
4. Escolha um plano e gere a proposta.
5. Dentro do diálogo, teste **Baixar PDF**, **Apresentar** (tela cheia) e copiar link. Se a Kentro bloquear algum, use o botão de **nova aba** (seta no topo): a aba abre conectada e sem essas limitações.
6. Abra um atendimento e use o cartão **Abrir ficha ÂNCORA**: numa ficha vazia, o nome do contato já vem preenchido.

## Manter os textos da venda

Os argumentos, as objeções e as janelas de negociação estão em [src/lib/venda-textos.ts](../src/lib/venda-textos.ts); os motivos de fechamento, em `closingBullets`, no arquivo [src/lib/anchoring.ts](../src/lib/anchoring.ts). Mudou preço de add-on, janela ou argumento? Altere ali. Os preços dos planos vêm de [src/lib/pricing.ts](../src/lib/pricing.ts).

Ficha já salva guarda o texto da época; ele só é refeito quando o plano é confirmado de novo nela.

## Limites conhecidos

- **Sem autenticação na entrada (decisão de 04/11/2026):** `/api/kentro/ticket` é aberto e confia no usuário e no tipo informados. Quem conhecer o endereço pode, de qualquer lugar da internet, abrir uma sessão como qualquer usuário, inclusive master, e ler todas as fichas, com os dados e as transcrições dos clientes. Para fechar isso, seria preciso voltar a exigir uma chave nesse endereço.
- **Transcrição:** fica guardada na ficha como referência (texto ou link). Ela não preenche as respostas.
- **Links públicos:** quem tiver o UUID lê a proposta ou a conta ao vivo. Eles não expiram.

## Desenvolvimento

- `npm run db:local`: Postgres embutido na porta 54359.
- `npm run dev`: app na porta 8080 (com as variáveis no `.env`).
- `npm test`: inclui as regras de acesso num Postgres real.
- `npm run build` e `npm start`: como o Doca executa.
