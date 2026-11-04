import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { z } from 'zod';
import ReactMarkdown from 'react-markdown';
import { Anchor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fichaPublica } from '@/lib/fichas.functions';
import { fichaSchema } from '@/lib/ancora';
import { AccountReport } from '@/components/account-report';
import { AnchorMode } from '@/components/anchor-mode';
import { BrandLogo } from '@/components/brand-logo';
import { ProposalDeck } from '@/components/proposal-deck';
import { proposalSchema } from '@/lib/proposal-schema';
import { DecisionReport } from '@/components/decision-report';
import { buildReport, readReport } from '@/lib/report';

const anchorSchema = z.object({ fatos: z.array(z.string()).default([]), alavancas: z.array(z.object({ nome: z.string(), valor: z.number() })).default([]), ganho: z.number().default(0), prudente: z.number().default(0), mensalidade: z.number().default(0), plano: z.string().default(''), bullets: z.array(z.string()).default([]) });
const schema = z.object({ id: z.string(), created_at: z.string(), cliente_nome: z.string(), segmento: z.string(), conta: fichaSchema.shape.conta, proposta_cliente: z.string(), ancoragem: z.unknown() });

export const Route = createFileRoute('/c/$id')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Sua proposta Kentro' }, { name: 'description', content: 'A conta e a proposta Kentro preparadas para você.' }, { property: 'og:title', content: 'Sua proposta Kentro' }, { property: 'og:description', content: 'A conta e a proposta preparadas na nossa conversa.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex, nofollow' }] }),
  component: ClientPage,
});

function ClientPage() {
  const { id } = Route.useParams(); const valid = z.string().uuid().safeParse(id).success; const [anchoring, setAnchoring] = useState(false);
  const q = useQuery({ queryKey: ['ficha-cliente', id], enabled: valid, retry: false, queryFn: async () => { const data = await fichaPublica({ data: { id } }); return data ? schema.parse(JSON.parse(data)) : null; } });
  if (!valid || q.data === null || q.error) return <main className="reading-page"><BrandLogo /><h1 className="mt-8 text-2xl font-bold">Proposta não encontrada</h1><p className="mt-2">Confira o link recebido.</p></main>;
  if (!q.data) return <main className="reading-page"><p>Carregando…</p></main>;
  const f = q.data; const anc = anchorSchema.safeParse(f.ancoragem); const a = anc.success ? anc.data : null; const pr = proposalSchema.safeParse((f.ancoragem as { proposta?: unknown } | null)?.proposta); const deck = pr.success && pr.data.gerada ? pr.data : null; const rep = readReport((f.ancoragem as { relatorio?: unknown } | null)?.relatorio) ?? { ...buildReport({}, f.conta), fatos: a?.fatos ?? [], bullets_fechamento: a?.bullets ?? [], plano: a?.plano ?? '' };
  return <main className="reading-page">
    <BrandLogo />
    <h1 className="mt-8 break-words text-3xl font-extrabold">{f.cliente_nome || 'Sua proposta'}</h1>
    <p className="mb-6 mt-2 text-sm text-muted-foreground">{f.segmento} · {new Date(f.created_at).toLocaleDateString('pt-BR')}</p>
    {a && a.ganho > 0 && <Button className="btn-accent mb-6 min-h-12" onClick={() => setAnchoring(true)}><Anchor />Ver a ancoragem</Button>}
    {f.conta.ganho > 0 && <section className="mb-8"><h2 className="mb-3 text-xl font-extrabold">Relatório de decisão</h2><DecisionReport r={rep} cliente={f.cliente_nome} /></section>}
    {deck && <section className="deck-page-wrap mb-8"><h2 className="mb-3 text-xl font-extrabold">Sua proposta</h2><ProposalDeck data={deck} report={rep} /></section>}
    <div className="mb-8"><AccountReport account={f.conta} /></div>
    {f.proposta_cliente && <article className="generated-text card"><ReactMarkdown>{f.proposta_cliente}</ReactMarkdown></article>}
    {anchoring && a && <AnchorMode data={a} cliente={f.cliente_nome} onClose={() => setAnchoring(false)} />}
  </main>;
}
