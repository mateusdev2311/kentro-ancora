import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { FolderOpen } from 'lucide-react';
import { minhasFichas } from '@/lib/fichas.functions';
import { PageHeader } from '@/components/app-nav';
import { FichaList } from '@/components/ficha-list';

export const Route = createFileRoute('/_authenticated/fichas')({
  head: () => ({ meta: [{ title: 'Minhas fichas — Venda Consultiva Kentro' }, { name: 'description', content: 'Reabra as fichas ÂNCORA que você criou.' }, { property: 'og:title', content: 'Minhas fichas — Kentro' }, { property: 'og:description', content: 'Histórico de fichas da venda consultiva Kentro.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: Fichas,
});

function Fichas() {
  const { profile } = Route.useRouteContext();
  const { data, isLoading, error } = useQuery({ queryKey: ['minhas-fichas', profile.id], queryFn: () => minhasFichas() });
  return <main className="reading-page"><PageHeader profile={profile} title="Minhas fichas" />
    {isLoading ? <p>Carregando…</p> : error ? <p className="warning">Não foi possível carregar suas fichas.</p> : !data?.length ? <div className="py-12 text-center"><FolderOpen className="mx-auto mb-4 size-10 text-secondary" /><p>Você ainda não salvou nenhuma ficha.</p></div> : <FichaList rows={data} />}
  </main>;
}
