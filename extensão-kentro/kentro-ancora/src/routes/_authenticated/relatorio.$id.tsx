import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buscarFicha } from '@/lib/fichas.functions';
import { answerSchema, calculate } from '@/lib/ancora';
import { buildReport, readReport } from '@/lib/report';
import { DecisionReport } from '@/components/decision-report';
import { ClientLink } from '@/components/client-link';

export const Route = createFileRoute('/_authenticated/relatorio/$id')({
  head: () => ({ meta: [{ title: 'Relatório de decisão — Kentro' }, { name: 'description', content: 'Relatório visual de decisão: perda por alavanca, projeção de 12 meses, âncora e payback.' }, { property: 'og:title', content: 'Relatório de decisão — Kentro' }, { property: 'og:description', content: 'De onde vieram os números, o que escapa e por que decidir agora.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' }] }),
  component: ReportPage,
});

function ReportPage() {
  const { id } = Route.useParams(); const valid = z.string().uuid().safeParse(id).success;
  const q = useQuery({ queryKey: ['relatorio', id], enabled: valid, retry: false, queryFn: async () => { const data = await buscarFicha({ data: { id } }); return data ? JSON.parse(data) as { id: string; cliente_nome: string; respostas: unknown; relatorio_dados: unknown } : null; } });
  if (!valid || q.data === null || q.error) return <main className="reading-page"><h1 className="text-2xl font-bold">Relatório não encontrado</h1><Button asChild className="mt-4"><Link to="/fichas">Voltar às fichas</Link></Button></main>;
  if (!q.data) return <main className="reading-page"><p>Carregando…</p></main>;
  const ans = answerSchema.safeParse(q.data.respostas); const answers = ans.success ? ans.data : {};
  const r = readReport(q.data.relatorio_dados) ?? buildReport(answers, calculate(answers));
  return <main className="mx-auto max-w-[1400px] px-4 py-6">
    <Button asChild variant="outline" className="mb-4"><Link to="/f/$id" params={{ id }}><ArrowLeft />Ficha</Link></Button>
    <ClientLink id={id} />
    <DecisionReport r={r} cliente={q.data.cliente_nome} />
  </main>;
}
