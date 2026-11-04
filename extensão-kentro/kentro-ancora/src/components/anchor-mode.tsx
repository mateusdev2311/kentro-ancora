import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, LoaderCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLogo } from './brand-logo';
import { money } from '@/lib/ancora';

export type AnchorData = { fatos: string[]; alavancas: { nome: string; valor: number }[]; ganho: number; prudente: number; mensalidade: number; plano: string; bullets: string[] };
type Slide = { section: string; kind: 'fact' | 'lever' | 'ganho' | 'prudente' | 'anchor' | 'bullets'; i?: number };

function useCountUp(target: number, run: boolean) {
  const [v, setV] = useState(run ? 0 : target);
  useEffect(() => {
    if (!run) { setV(target); return; }
    let raf = 0; const t0 = performance.now(); const d = 1100;
    const tick = (t: number) => { const p = Math.min(1, (t - t0) / d); setV(target * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return v;
}
function Money({ value, className }: { value: number; className?: string }) { return <strong className={className}>{money(useCountUp(value, true))}</strong>; }

export function buildSlides(d: AnchorData): Slide[] {
  const s: Slide[] = [];
  d.fatos.forEach((_, i) => s.push({ section: 'O que você me contou', kind: 'fact', i }));
  d.alavancas.forEach((_, i) => s.push({ section: 'O que está escapando', kind: 'lever', i }));
  if (d.ganho > 0) { s.push({ section: 'A conta', kind: 'ganho' }); s.push({ section: 'A conta', kind: 'prudente' }); s.push({ section: 'A âncora', kind: 'anchor' }); }
  s.push({ section: 'Por que agora', kind: 'bullets' });
  return s;
}

/** Ancoragem ao vivo: um passo por toque ou seta, fundo escuro Kentro. */
export function AnchorMode({ data, onClose, cliente, bulletsState, onNeedBullets }: { data: AnchorData; onClose?: (() => void) | undefined; cliente?: string | undefined; bulletsState?: 'idle' | 'loading' | 'error' | undefined; onNeedBullets?: (() => void) | undefined }) {
  const slides = useMemo(() => buildSlides(data), [data]);
  const [n, setN] = useState(0); const ref = useRef<HTMLDivElement>(null);
  const cur = slides[Math.min(n, slides.length - 1)];
  const next = useCallback(() => setN(x => Math.min(x + 1, slides.length - 1)), [slides.length]);
  const prev = useCallback(() => setN(x => Math.max(x - 1, 0)), []);
  useEffect(() => {
    if (onClose) ref.current?.requestFullscreen?.().catch(() => { /* opcional */ });
    const key = (e: KeyboardEvent) => { if (['ArrowRight', ' ', 'PageDown', 'Enter'].includes(e.key)) { e.preventDefault(); next(); } if (['ArrowLeft', 'PageUp'].includes(e.key)) prev(); if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); };
  }, [next, prev, onClose]);
  useEffect(() => { if (cur?.kind === 'bullets' && !data.bullets.length && bulletsState === 'idle') onNeedBullets?.(); }, [cur, data.bullets.length, bulletsState, onNeedBullets]);
  if (!cur) return null;
  const sectionSlides = slides.filter(s => s.section === cur.section); const upto = slides.slice(0, n + 1).filter(s => s.section === cur.section);
  return <div ref={ref} className="anchor-stage" role="dialog" aria-modal="true" aria-label="Ancorar ao vivo" onClick={e => { if ((e.target as HTMLElement).closest('button,a')) return; const x = e.clientX / window.innerWidth; if (x < 0.25) prev(); else next(); }}>
    <div className="anchor-top"><BrandLogo size="sm" light />{onClose && <Button variant="outline" className="anchor-btn" onClick={onClose}><X />Sair</Button>}</div>
    <div className="anchor-body" key={cur.section}>
      <p className="anchor-section">{cur.section}</p>
      {cliente && cur.kind === 'fact' && cur.i === 0 && <p className="anchor-client">{cliente}</p>}
      {cur.kind === 'fact' && <ul className="anchor-facts">{upto.map(s => <li key={s.i} className="anchor-in">{data.fatos[s.i ?? 0]}</li>)}</ul>}
      {cur.kind === 'lever' && <ul className="anchor-levers">{upto.map(s => { const l = data.alavancas[s.i ?? 0]; return l && <li key={s.i} className="anchor-in"><span>{l.nome}</span><Money value={l.valor} className="loss" /><small>/mês</small></li>; })}</ul>}
      {(cur.kind === 'ganho' || cur.kind === 'prudente') && <div className="anchor-total anchor-in"><p>Ganho mensal</p><Money value={data.ganho} className="anchor-huge loss" />{cur.kind === 'prudente' && <p className="anchor-prudent anchor-in">Mesmo sendo conservador, no mínimo <Money value={data.prudente} className="loss" />/mês</p>}</div>}
      {cur.kind === 'anchor' && <div className="anchor-compare anchor-in"><div className="anchor-loss"><p>Você perde ~</p><Money value={data.prudente} className="anchor-huge loss" /><p>por mês</p></div><div className="anchor-price"><p>O Kentro custa</p><strong>{money(data.mensalidade)}</strong><p>/mês · {data.plano}</p></div></div>}
      {cur.kind === 'bullets' && (data.bullets.length ? <ul className="anchor-bullets">{data.bullets.map((b, i) => <li key={b} className="anchor-in" style={{ animationDelay: `${i * 0.25}s` }}>{b}</li>)}</ul> : bulletsState === 'loading' ? <p className="anchor-wait"><LoaderCircle className="animate-spin" />Preparando os motivos…</p> : bulletsState === 'error' ? <Button className="btn-accent" onClick={onNeedBullets}>Tentar gerar de novo</Button> : <p className="anchor-wait">Motivos a confirmar.</p>)}
    </div>
    <div className="anchor-nav"><Button variant="ghost" className="anchor-btn" onClick={prev} disabled={n === 0} aria-label="Voltar"><ChevronLeft /></Button><span>{upto.length}/{sectionSlides.length} · {n + 1} de {slides.length}</span><Button variant="ghost" className="anchor-btn" onClick={next} disabled={n >= slides.length - 1} aria-label="Avançar"><ChevronRight /></Button></div>
  </div>;
}
