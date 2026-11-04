import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { BrandLogo } from '@/components/brand-logo';
import { entrarComTicket } from '@/lib/fichas.functions';
import { gravarContexto, gravarToken } from '@/lib/sessao-cliente';

export const Route = createFileRoute('/entrar')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Método ÂNCORA — Kentro' }, { name: 'robots', content: 'noindex, nofollow' }] }),
  validateSearch: (s: Record<string, unknown>): { ticket?: string } => (typeof s['ticket'] === 'string' ? { ticket: s['ticket'] } : {}),
  component: Entrar,
});

/** Entrada do app: o ticket vem da extensão da Kentro e só vale uma vez. Não há login por senha. */
function Entrar() {
  const { ticket } = Route.useSearch();
  const navigate = useNavigate();
  const [falhou, setFalhou] = useState(!ticket);
  const usado = useRef(false);
  useEffect(() => {
    if (!ticket || usado.current) return;
    usado.current = true;
    void (async () => {
      try {
        const sessao = await entrarComTicket({ data: { ticket } });
        if (!sessao) { setFalhou(true); return; }
        gravarToken(sessao.token);
        gravarContexto(sessao.contexto);
        await navigate({ to: '/', replace: true });
      } catch {
        setFalhou(true);
      }
    })();
  }, [ticket, navigate]);
  return <main className="reading-page flex min-h-screen items-center justify-center">
    <div className="card w-full max-w-sm space-y-4">
      <BrandLogo size="lg" />
      {falhou
        ? <><h1 className="text-xl font-extrabold">Abra pelo menu da Kentro</h1><p className="why">O acesso ao Método ÂNCORA é feito pelo botão <strong>Âncora</strong>, no menu do topo da Kentro. Este link já foi usado ou venceu.</p></>
        : <p role="status">Abrindo o Método ÂNCORA…</p>}
    </div>
  </main>;
}
