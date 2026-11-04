import { Check, Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { computePlans, type PlanName } from '@/lib/pricing';
import { PLANS, DEFAULT_PLAN } from '@/lib/anchoring';

export function PlansView({ users, setUsers, chosen, recommended = DEFAULT_PLAN, onChoose, onConfirm, onClose, saved, onReport }: { users: number; setUsers: (n: number) => void; chosen: PlanName | null; recommended?: PlanName; onChoose: (p: PlanName) => void; onConfirm: () => void; onClose: () => void; saved: string; onReport?: (() => void) | undefined }) {
  const p = computePlans(users);
  const clamp = (n: number) => setUsers(Math.min(50, Math.max(2, Math.round(n) || 2)));
  return <div className="plans-overlay" role="dialog" aria-modal="true" aria-label="Planos">
    <div className="plans-inner">
      <div className="mb-6 flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-secondary">KENTRO · PLANOS</p><h2 className="text-2xl font-extrabold">Os 4 planos</h2></div><Button variant="outline" onClick={onClose}><X />Voltar</Button></div>
      <div className="card mb-6 flex flex-wrap items-center justify-between gap-4"><div><p className="font-semibold">Quantos usuários?</p><p className="why">Pessoas que vão atender pelo Kentro. Mínimo 2.</p></div>
        <div className="flex items-center gap-2"><Button variant="outline" aria-label="Menos usuários" onClick={() => clamp(users - 1)}><Minus /></Button><input className="field w-20 text-center text-lg font-bold" type="number" min={2} max={50} value={users} onChange={e => clamp(Number(e.target.value))} aria-label="Número de usuários" /><Button variant="outline" aria-label="Mais usuários" onClick={() => clamp(users + 1)}><Plus /></Button></div></div>
      <div className="plans-grid">{PLANS.map(pl => {
        const v = p[pl.key]; const on = chosen === pl.name;
        return <button key={pl.name} type="button" className="plan-card" data-on={on} data-rec={pl.name === recommended} onClick={() => onChoose(pl.name)} aria-pressed={on}>
          {pl.name === recommended && <span className="plan-badge">Recomendado</span>}
          <h3>{pl.name}</h3>
          <p className="plan-price">{v.mensal}<small>/mês</small></p>
          <p className="text-sm">Anual: <strong>{v.anual}</strong>/mês</p>
          {'eco' in v && <p className="text-xs text-secondary">{v.eco}</p>}
          {'sistema' in v && <p className="text-xs text-muted-foreground">Sistema {v.sistema} + consultoria</p>}
          <p className="text-sm">Implantação: <strong>{'implantacao' in v ? v.implantacao : 'grátis'}</strong></p>
          {'mentoria' in v && <p className="text-xs text-muted-foreground">Mentoria: {v.mentoriaAvista}</p>}
          <p className="why mt-2">{pl.apoio}</p>
          {on && <span className="plan-check"><Check /></span>}
        </button>;
      })}</div>
      <p className="mt-3 text-xs text-muted-foreground">{p.usersLabel}</p>
      <div className="mt-6 flex flex-wrap items-center gap-3"><Button className="btn-accent min-h-14 flex-1 whitespace-normal" disabled={!chosen} onClick={onConfirm}>Gerar proposta</Button>{onReport && <Button variant="outline" className="min-h-14" onClick={onReport}>Relatório de decisão</Button>}{saved && <p role="status" className="text-sm font-semibold text-primary">{saved}</p>}</div>
    </div>
  </div>;
}
