Projeto saiu da Lovable e do Supabase em 04/11/2026: roda no Doca, com Postgres próprio. O backup do código original está em `../kentro-ancora-original-lovable.tar.gz`. Implantação: `docs/implantacao.md`.

- The diagnosis asks once (core + niche module + qualification) from `src/lib/diagnostico.ts`; levers are computed in ancora.ts, never asked, so answers are not duplicated. `src/lib/ficha.ts` stays only for legacy fichas.
- Centralize live calculations in `src/lib/ancora.ts`, shared by UI and persistence, so stored totals cannot differ from the panel.
- Use TanStack server functions for internal calls. AI calls live in `src/lib/ia.server.ts` with the official SDKs and our own API keys.
- Generation (Claude) and transcription (OpenAI) stay on separate models, so model changes do not affect extraction. Both are configurable by env var.
- AI calls run as background jobs in `geracoes` and the UI polls `buscarGeracao`, because they can outlast a proxy timeout.
- Access is by Kentro identity: the extension (`extension/atendimento`) calls `/api/kentro/ticket` with `CHAVE_EXTENSAO`, opens the app with `omni.ui.openEmbed`, and `/entrar` swaps the single-use ticket for a 12h Bearer session. There are no passwords and no cookies.
- Roles live in `usuarios.role`: Kentro admin/supervisor = master, agent = closer. Read them from the database on each request, never from the token or the client.
- All ficha access rules live in `src/lib/fichas.server.ts` and are covered by `src/test/banco.test.ts`: closers read their own, masters read all, only the owner updates, and the public client link (/c/:id) reads an exact UUID and never returns the closer package, transcript or raw answers.
- Migrations are in `src/lib/db-migracoes.server.ts`, applied on startup. Never edit a published one: add another.
- Avoid browser `confirm`/`alert`: the app runs inside a Kentro frame, where they may be blocked. Confirm on the page itself.
- Natural-tone question wording and "por quê" live in `src/lib/question-copy.ts`, keyed by question id, so option catalogs and calculations stay untouched.
- The live-account share link mirrors the computed account into `contas_ao_vivo`; the public page polls `contaPublica` by exact UUID.
- Keep the supplied system prompt literal in a server-only module; user answers remain data, never instructions.
- Preserve legacy answer strings; open answers use a mode marker and companion text, and missing states are normalized to null only in AI input.
- Transcript imports validate against the shared question catalog before replacing answers; only allowlisted HTTPS transcript hosts may be fetched, with every redirect checked and strict size/time bounds.

- Pricing engine in `src/lib/pricing.ts` is supplied verbatim; plan selection, defaults and anchoring payloads live in `src/lib/anchoring.ts` and are stored on the ficha (`plano`, `ancoragem`) so the public link never needs raw answers.
- The proposal deck variables live in `src/lib/proposal.ts` and are stored inside `fichas.ancoragem.proposta`, so /proposta/:id and the public /c/:id render the same deck without raw answers.
- Proposal anchoring consumes the existing computed `ReportData` in every presentation path; print pages are isolated in a body portal with fixed A4 landscape sheets to prevent parent layouts from adding or clipping pages.
- Decision report series come from `src/lib/report.ts` (built from ancora.ts + pricing); AI JSON only contributes closing bullets, saved in `fichas.relatorio_dados` and mirrored in `ancoragem.relatorio` for /c/:id, so numbers never diverge or get invented.
- Plan price and setup are always computed in calculate() from pricing.ts (users from the team answer, default 6 marked a confirmar) and never typed, so anchoring, multiple and payback share one source.
