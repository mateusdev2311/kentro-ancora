import { Link } from '@tanstack/react-router';
import { ExternalLink, FileText, FolderOpen, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLogo } from './brand-logo';
import { linkNovaAba } from '@/lib/fichas.functions';
import type { Profile } from '@/routes/_authenticated/route';

/** Abre o app numa aba própria, conectado: é o caminho para apresentar em tela cheia ou imprimir o PDF. */
async function abrirEmNovaAba() {
  // A aba precisa abrir já no clique, senão o navegador a bloqueia como pop-up.
  const aba = window.open('about:blank', '_blank');
  try {
    const { caminho } = await linkNovaAba();
    if (aba) aba.location.href = caminho;
    else window.location.href = caminho;
  } catch {
    aba?.close();
  }
}

export function AppNav({ profile }: { profile: Profile }) {
  const item = (to: '/' | '/fichas' | '/todas-fichas', label: string, Icon: typeof FileText) =>
    <Button asChild variant="outline" className="h-11"><Link to={to}><Icon /><span className="hidden md:inline">{label}</span><span className="sr-only md:hidden">{label}</span></Link></Button>;
  return <>
    {item('/', 'Ficha', FileText)}
    {item('/fichas', 'Minhas fichas', FolderOpen)}
    {profile.role === 'master' && item('/todas-fichas', 'Todas as fichas', Library)}
    <Button variant="ghost" className="h-11" onClick={() => void abrirEmNovaAba()} title="Abrir em nova aba"><ExternalLink /><span className="sr-only">Abrir em nova aba</span></Button>
  </>;
}

export function PageHeader({ profile, title }: { profile: Profile; title: string }) {
  return <header className="mb-8 flex flex-wrap items-center justify-between gap-3"><div><BrandLogo size="sm" /><h1 className="mt-3 text-3xl font-extrabold">{title}</h1></div><div className="flex flex-wrap gap-2"><AppNav profile={profile} /></div></header>;
}
