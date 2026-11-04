import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { minhaSessao } from '@/lib/fichas.functions';

export type Profile = { id: string; email: string; nome: string; role: string; ativo: boolean };

export const Route = createFileRoute('/_authenticated')({
  ssr: false,
  beforeLoad: async () => {
    const profile = await minhaSessao();
    if (!profile) throw redirect({ to: '/entrar' });
    return { profile: profile as Profile };
  },
  component: () => <Outlet />,
});
