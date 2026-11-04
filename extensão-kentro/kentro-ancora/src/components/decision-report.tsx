import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLogo } from './brand-logo';
import { LeakDiagram, LossBars, MultipleGauge, PaybackBadge, Projection } from './decision-charts';
import { decimal, money } from '@/lib/ancora';
import type { ReportData } from '@/lib/report';

const TITLES = ['De onde vieram os números', 'O que está escapando', 'A projeção no tempo', 'A âncora', 'Por que agora'];

/** Relatório de Decisão: 5 blocos em paisagem 16:9, seta/toque, tela cheia. */
export function DecisionReport({ r, cliente, onClose, autoFullscreen }: { r: ReportData; cliente?: string | undefined; onClose?: (() => void) | undefined; autoFullscreen?: boolean }) {
  const [n, setN] = useState(0); const ref = useRef<HTMLDivElement>(null); const touch = useRef<number | null>(null);
  const next = useCallback(() => setN(x => Math.min(x + 1, TITLES.length - 1)), []);
  const prev = useCallback(() => setN(x => Math.max(x - 1, 0)), []);
  const full = useCallback(() => { void ref.current?.requestFullscreen?.().catch(() => {}); }, []);
  useEffect(() => {
    if (autoFullscreen) full();
    const key = (e: KeyboardEvent) => { if ((e.target as HTMLElement).closest('input,textarea')) return; if (['ArrowRight', 'PageDown'].includes(e.key)) { e.preventDefault(); next(); } if (['ArrowLeft', 'PageUp'].includes(e.key)) prev(); if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); };
  }, [next, prev, onClose, autoFullscreen, full]);
  const lossShown = r.cenario_prudente > 0 ? r.cenario_prudente : r.ganho_mensal;
  return <div ref={ref} className="report-stage" aria-roledescription="apresentação" aria-label="Relatório de decisão"
    onTouchStart={e => { touch.current = e.touches[0]?.clientX ?? null; }}
    onTouchEnd={e => { const s = touch.current; const x = e.changedTouches[0]?.clientX; touch.current = null; if (s === null || x === undefined) return; if (x - s < -50) next(); if (x - s > 50) prev(); }}>
    <div className="report-top"><BrandLogo size="sm" light /><span className="report-kicker">{cliente ? `${cliente} · ` : ''}Relatório de decisão · {n + 1}/{TITLES.length}</span>
      <div className="flex gap-2"><Button variant="outline" className="anchor-btn" onClick={full} aria-label="Tela cheia"><Maximize /></Button>{onClose && <Button variant="outline" className="anchor-btn" onClick={onClose}><X />Sair</Button>}</div></div>
    <section className="report-slide" key={n} aria-live="polite">
      <h2 className="report-title">{TITLES[n]}</h2>
      {n === 0 && (r.fatos.length ? <ul className="report-facts">{r.fatos.map(f => <li key={f}>{f}</li>)}</ul> : <p className="report-muted">Os números do cliente ainda estão a confirmar.</p>)}
      {n === 0 && r.a_confirmar.length > 0 && <p className="report-muted mt-4">A confirmar: {r.a_confirmar.join(' · ')}</p>}
      {n === 1 && <div className="report-split"><div className="report-chart"><LossBars r={r} height={340} /></div><div className="report-side">
        <p className="report-label">Escapa por mês</p><strong className="report-big loss">{money(r.ganho_mensal)}</strong>
        <p className="why">Soma das alavancas: {r.perda_por_alavanca.filter(l => l.valor).map(l => money(l.valor)).join(' + ') || 'a confirmar'}</p>
        <p className="report-label mt-5">Cenário prudente</p><strong className="report-mid loss">{money(r.cenario_prudente)}</strong><p className="why">perda mensal ÷ 3, para não inflar</p>
        <ul className="report-formulas">{r.perda_por_alavanca.map(l => <li key={l.alavanca}><b>{l.alavanca}:</b> {l.conta || 'a confirmar'}</li>)}</ul></div></div>}
      {n === 2 && <><Projection r={r} height={380} /><div className="report-row"><PaybackBadge r={r} /><p className="why">Perda acumulada = {money(r.ganho_mensal)} × meses · Custo = {money(r.implantacao)} de implantação + {money(r.mensalidade)} × meses</p></div></>}
      {n === 3 && <div className="report-anchor"><div className="report-loss"><p className="report-label">Você deixa escapar ~</p><strong className="report-huge loss">{money(lossShown)}</strong><p className="report-label">por mês{r.cenario_prudente > 0 ? ' · cenário prudente' : ''}</p></div>
        <div className="report-price"><p className="report-label">O Kentro custa</p><strong>{money(r.mensalidade)}</strong><p className="why">/mês · {r.plano}</p>
          <p className="report-label mt-4">Múltiplo</p><strong>{decimal(r.multiplo)}{r.multiplo !== null ? '×' : ''}</strong><PaybackBadge r={r} /></div>
        <div className="report-gauge"><MultipleGauge multiplo={r.multiplo} /></div></div>}
      {n === 4 && <div className="report-split"><div>{r.bullets_fechamento.length ? <ul className="report-bullets">{r.bullets_fechamento.map(b => <li key={b}>{b}</li>)}</ul> : <p className="report-muted">Motivos de fechamento a gerar com a IA.</p>}
        <p className="report-next">Próximo passo: <strong>{r.proximo_passo}</strong></p></div><div className="report-chart"><LeakDiagram r={r} /></div></div>}
    </section>
    <div className="report-nav"><Button variant="outline" className="anchor-btn" onClick={prev} disabled={n === 0} aria-label="Anterior"><ChevronLeft /></Button>
      <div className="report-dots">{TITLES.map((t, i) => <button key={t} type="button" aria-label={t} aria-current={i === n} onClick={() => setN(i)} />)}</div>
      <Button variant="outline" className="anchor-btn" onClick={next} disabled={n === TITLES.length - 1} aria-label="Próximo"><ChevronRight /></Button></div>
  </div>;
}
