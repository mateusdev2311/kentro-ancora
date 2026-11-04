import { AlertTriangle } from 'lucide-react';
import { BrandLogo } from './brand-logo';
import { decimal, money, type Account } from '@/lib/ancora';
import { LeverLine, MultipleGauge } from './decision-charts';
type View = Omit<Account,'alavancas'> & { alavancas: { nome: string; valor: number | null; soma: boolean; conta?: string | undefined; resposta?: string | string[] | undefined; estado?: string | undefined }[] };

export function AccountReport({ account: c }: { account: View }) {
  return <section className="card account-report" aria-label="Conta ao vivo">
    <div className="flex items-center justify-between gap-2"><h2 className="font-bold text-primary">Conta ao vivo</h2>{c.parcial && <span className="text-xs text-muted-foreground">Parcial · itens a confirmar</span>}</div>
    <ul className="mt-4">{c.alavancas.filter(l => l.soma).map(l => <LeverLine key={l.nome} nome={l.nome} valor={l.valor} conta={l.conta} resposta={l.estado === 'não informado' || !l.resposta ? undefined : Array.isArray(l.resposta) ? l.resposta.join(', ') : l.resposta} />)}</ul>
    <dl className="account-grid">
      <div><dt>Ganho mensal</dt><dd className="loss">{money(c.ganho)}</dd></div>
      <div><dt>Cenário prudente</dt><dd className="loss">{money(c.prudente)}</dd></div>
      <div><dt>Múltiplo</dt><dd>{decimal(c.multiplo)}{c.multiplo !== null ? '×' : ''}</dd></div>
      <div><dt>Payback</dt><dd>{decimal(c.payback)}{c.payback !== null ? ' dias' : ''}</dd></div>
    </dl>
    <div className="mt-5"><MultipleGauge multiplo={c.multiplo} /></div>
  </section>;
}

export function AccountShow({ account: c, cliente }: { account: View; cliente?: string | undefined }) {
  return <div className="present-body">
    <div className="present-brand"><BrandLogo size="lg" /><p>A conta</p></div>
    {cliente && <p className="present-client">{cliente}</p>}
    <div className="present-main"><p>Ganho mensal</p><strong className="loss">{money(c.ganho)}</strong></div>
    <div className="present-grid">
      <div><p>Cenário prudente</p><strong className="loss">{money(c.prudente)}</strong></div>
      <div><p>Múltiplo</p><strong>{decimal(c.multiplo)}{c.multiplo !== null ? '×' : ''}</strong></div>
      <div><p>Payback</p><strong>{decimal(c.payback)}{c.payback !== null ? ' dias' : ''}</strong></div>
    </div>
    <ul className="present-levers">{c.alavancas.filter(l => l.soma).map(l => <li key={l.nome}><span>{l.nome}</span><strong className={l.valor ? 'loss' : ''}>{l.valor === null ? 'a confirmar' : money(l.valor)}</strong></li>)}</ul>
    {c.multiplo !== null && c.multiplo < 5 && <p className="warning">Abaixo de 5×: faltou alavanca ou o plano está grande demais</p>}
  </div>;
}
