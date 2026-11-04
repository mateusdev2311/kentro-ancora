# Método ÂNCORA: implantação no Doca

```
Kentro (navegador do comercial)                Doca (este serviço, HTTPS)
┌───────────────────────────────┐ omni.http   ┌─────────────────────────────────┐
│ Extensão: botão "Âncora" e    │────────────▶│ /api/kentro/ticket (com a chave)│
│ cartão do atendimento         │             │                                 │
└──────────────┬────────────────┘             │ App React + server functions    │──▶ Anthropic (geração)
    openEmbed  │ URL com ticket de uso único  │ Postgres do Doca                │──▶ OpenAI (transcrição)
┌──────────────▼────────────────┐   HTTPS     │                                 │
│ Diálogo com o app             │────────────▶│ /entrar troca o ticket por      │
└───────────────────────────────┘             │ uma sessão de 12 horas          │
Cliente: /c/:id e /conta/:id  ───────────────▶│ (públicos, pelo UUID exato)     │
                                              └─────────────────────────────────┘
```

## 1. Antes do primeiro deploy

Crie o repositório e envie o projeto. `dist/`, `node_modules/` e `.env` ficam de fora pelo `.gitignore`. As 25 imagens (11,7 MB) já estão em `public/imagens/` e devem entrar no repositório.

## 2. Projeto no Doca

| Campo | Valor |
|---|---|
| Tipo | API ou microsserviço |
| Pasta do projeto | `.` |
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
| `CHAVE_EXTENSAO` | Gere: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `SEGREDO_SESSAO` | Gere outro valor com o mesmo comando |
| `ANTHROPIC_API_KEY` | Chave da Anthropic |
| `OPENAI_API_KEY` | Chave da OpenAI |

As tabelas são criadas na primeira subida. Confira em `GET /saude`: deve responder `{"ok":true,"banco":true}`.

## 3. Extensão na instância Kentro sistemas

Manifest: `https://kentro-ancora.kentro.com.br/extensao/atendimento/manifest.json`

1. Em **Configurações › Extensões instaladas › Instalar por URL**, informe o manifest.
2. Em **Chave de acesso**, cole o valor de `CHAVE_EXTENSAO`.
3. Comece restrito ao usuário de teste (**Integração - Mateus, id 504**) e só depois abra ao comercial.

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
3. Gere a venda com IA e abra o link do cliente numa janela anônima.
4. Escolha um plano e gere a proposta.
5. Dentro do diálogo, teste **Baixar PDF**, **Apresentar** (tela cheia) e copiar link. Se a Kentro bloquear algum, use o botão de **nova aba** (seta no topo): a aba abre conectada e sem essas limitações.
6. Abra um atendimento e use o cartão **Abrir ficha ÂNCORA**: numa ficha vazia, o nome do contato já vem preenchido.

## Limites conhecidos

- **Identidade:** o SDK da Kentro não dá prova assinada do usuário, e a chave da instalação chega ao navegador de quem recebe a extensão. Alguém com conhecimento técnico e essa chave poderia se passar por outro usuário e ver as fichas dele. Se a chave vazar, troque `CHAVE_EXTENSAO` e a chave da instalação.
- **Geração interrompida:** a geração roda no processo do serviço. Um reinício no meio dela perde a geração, e a tela avisa para tentar de novo.
- **Links públicos:** quem tiver o UUID lê a proposta ou a conta ao vivo. Eles não expiram.

## Desenvolvimento

- `npm run db:local`: Postgres embutido na porta 54359.
- `npm run dev`: app na porta 8080 (com as variáveis no `.env`).
- `npm test`: inclui as regras de acesso num Postgres real.
- `npm run build` e `npm start`: como o Doca executa.
- Para trocar de modelo sem mudar o código: `IA_MODELO_GERACAO` e `IA_MODELO_TRANSCRICAO`.
