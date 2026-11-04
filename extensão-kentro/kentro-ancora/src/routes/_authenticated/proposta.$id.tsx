import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buscarFicha } from '@/lib/fichas.functions';
import { ProposalDeck } from '@/components/proposal-deck';
import { ClientLink } from '@/components/client-link';
import { proposalSchema } from '@/lib/proposal-schema';
import { readReport } from '@/lib/report';

export const Route = createFileRoute('/_authenticated/proposta/$id')({
  head: () => ({ meta: [{ title: 'Proposta Kentro — deck do cliente' }, { name: 'description', content: 'Deck da proposta comercial Kentro preenchido com os dados do cliente.' }, { property: 'og:title', content: 'Proposta Kentro' }, { property: 'og:description', content: 'Deck de 10 slides da proposta Kentro.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' }] }),
  component: ProposalPage,
});

function ProposalPage() {
  const { id } = Route.useParams(); const valid = z.string().uuid().safeParse(id).success;
  const q = useQuery({ queryKey: ['proposta', id], enabled: valid, retry: false, queryFn: async () => { const data = await buscarFicha({ data: { id } }); return data ? JSON.parse(data) as { id: string; ancoragem: unknown } : null; } });
  const p = proposalSchema.safeParse((q.data?.ancoragem as { proposta?: unknown } | null)?.proposta);
  return <main className="deck-page-wrap mx-auto max-w-[1400px] px-4 py-6">
    <Button asChild variant="outline" className="mb-4"><Link to="/"><ArrowLeft />Voltar ao Método ÂNCORA</Link></Button>
    {!valid || q.error || (q.data !== undefined && !p.success) ? <p className="text-lg">Proposta não encontrada. Escolha o plano e gere a proposta pela tela de Planos.</p>
      : !q.data || !p.success ? <p>Carregando…</p>
      : <><ClientLink id={id} /><ProposalDeck data={p.data} report={readReport((q.data.ancoragem as { relatorio?: unknown } | null)?.relatorio) ?? undefined} /></>}
  </main>;
}
