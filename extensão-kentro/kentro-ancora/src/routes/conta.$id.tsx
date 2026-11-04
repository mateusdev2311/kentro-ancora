import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { contaPublica } from '@/lib/fichas.functions';
import { fichaSchema } from '@/lib/ancora';
import { AccountShow } from '@/components/account-report';

const live = z.object({ cliente_nome: z.string(), conta: fichaSchema.shape.conta, updated_at: z.string() });
export const Route = createFileRoute('/conta/$id')({
  ssr: false,
  head: () => ({ meta: [{ title: 'A conta ao vivo — Kentro' }, { name: 'description', content: 'Acompanhe a conta da reunião em tempo real.' }, { property: 'og:title', content: 'A conta ao vivo — Kentro' }, { property: 'og:description', content: 'A conta da reunião, em tempo real.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex, nofollow' }] }),
  component: LiveAccount,
});
function LiveAccount() {
  const { id } = Route.useParams(); const valid = z.string().uuid().safeParse(id).success;
  const q = useQuery({ queryKey: ['conta-ao-vivo', id], enabled: valid, refetchInterval: 3000, queryFn: async () => { const data = await contaPublica({ data: { id } }); return data ? live.parse(JSON.parse(data)) : null; } });
  return <main className="present-overlay static-present">
    {!valid || q.data === null ? <p className="present-body">Conta não encontrada. Confira o link.</p> : !q.data ? <p className="present-body">Carregando a conta…</p> :
      <><AccountShow account={q.data.conta} cliente={q.data.cliente_nome} /><p className="mt-6 text-center text-xs text-muted-foreground">Atualizado {new Date(q.data.updated_at).toLocaleTimeString('pt-BR')} · atualiza sozinho</p></>}
  </main>;
}
