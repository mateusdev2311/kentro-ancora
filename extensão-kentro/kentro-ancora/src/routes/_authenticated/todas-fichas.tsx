import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { todasFichas, usuariosParaFiltro } from '@/lib/fichas.functions';
import { PageHeader } from '@/components/app-nav';
import { FichaList } from '@/components/ficha-list';

export const Route = createFileRoute('/_authenticated/todas-fichas')({
  beforeLoad: ({ context }) => { if (context.profile.role !== 'master') throw redirect({ to: '/' }); },
  head: () => ({ meta: [{ title: 'Todas as fichas — Venda Consultiva Kentro' }, { name: 'description', content: 'Fichas e propostas de todos os closers.' }, { property: 'og:title', content: 'Todas as fichas — Kentro' }, { property: 'og:description', content: 'Visão master das fichas ÂNCORA.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: AllFichas,
});

function AllFichas() {
  const { profile } = Route.useRouteContext();
  const [closer, setCloser] = useState('todos'); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const fichas = useQuery({ queryKey: ['todas-fichas'], queryFn: () => todasFichas() });
  const users = useQuery({ queryKey: ['perfis'], queryFn: () => usuariosParaFiltro() });
  const name = (id: string) => { const u = users.data?.find(x => x.id === id); return u ? u.nome || u.email : 'Usuário removido'; };
  const groups = useMemo(() => {
    const rows = (fichas.data ?? []).filter(f => (closer === 'todos' || f.user_id === closer) && (!from || f.created_at.slice(0, 10) >= from) && (!to || f.created_at.slice(0, 10) <= to));
    const m = new Map<string, typeof rows>(); rows.forEach(f => { const k = f.user_id; m.set(k, [...(m.get(k) ?? []), f]); }); return [...m.entries()];
  }, [fichas.data, closer, from, to]);
  return <main className="reading-page"><PageHeader profile={profile} title="Todas as fichas" />
    <div className="card mb-6 grid gap-4 sm:grid-cols-3">
      <label className="space-y-2"><span className="text-sm font-semibold">Closer</span><select className="field" value={closer} onChange={e => setCloser(e.target.value)}><option value="todos">Todos</option>{users.data?.map(u => <option key={u.id} value={u.id}>{u.nome || u.email}</option>)}</select></label>
      <label className="space-y-2"><span className="text-sm font-semibold">De</span><input className="field" type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
      <label className="space-y-2"><span className="text-sm font-semibold">Até</span><input className="field" type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
    </div>
    {fichas.isLoading ? <p>Carregando…</p> : fichas.error ? <p className="warning">Não foi possível carregar as fichas.</p> : !groups.length ? <p className="py-12 text-center">Nenhuma ficha com esses filtros.</p> :
      <div className="space-y-8">{groups.map(([k, rows]) => <section key={k}><h2 className="mb-3 font-bold text-primary">{name(k)} · {rows.length}</h2><FichaList rows={rows} showCloser /></section>)}</div>}
  </main>;
}
