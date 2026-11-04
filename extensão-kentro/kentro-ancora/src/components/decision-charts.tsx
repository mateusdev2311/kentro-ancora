import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowRight, Bot, CalendarCheck, Layers, MessageCircle, RefreshCw, Send } from 'lucide-react';
import { decimal, money } from '@/lib/ancora';
import { HEALTHY_MULTIPLE, LEAK_FIX, breakEvenMonth, type ReportData } from '@/lib/report';

const short = (n: number) => n >= 1000 ? `R$ ${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : money(n);
const tip = (v: unknown) => money(Number(v));
const tipStyle = { background: 'var(--chart-tip-bg)', border: '1px solid var(--chart-grid)', borderRadius: 12, color: 'var(--chart-text)' };

/** Barras vermelhas: quanto cada dor custa por mês. */
export function LossBars({ r, height = 300 }: { r: ReportData; height?: number }) {
  const data = r.perda_por_alavanca.filter(l => l.valor !== null && l.valor > 0).map(l => ({ nome: l.alavanca, valor: l.valor ?? 0 }));
  if (!data.length) return <p className="chart-empty">Perda por alavanca a confirmar — faltam números do cliente.</p>;
  return <div className="chart-box" role="img" aria-label="Gráfico de barras: perda por alavanca em R$ por mês">
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 100, top: 8, bottom: 8 }}>
        <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
        <XAxis type="number" tickFormatter={short} stroke="var(--chart-text)" fontSize={12} />
        <YAxis type="category" dataKey="nome" width={150} stroke="var(--chart-text)" fontSize={12} />
        <Tooltip formatter={tip} contentStyle={tipStyle} cursor={{ fill: 'var(--chart-grid)' }} />
        <Bar dataKey="valor" name="Perda/mês" fill="var(--loss)" radius={[0, 8, 8, 0]}><LabelList dataKey="valor" position="right" formatter={(v: unknown) => money(Number(v))} fill="var(--loss)" fontSize={13} fontWeight={700} /></Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>;
}

/** 12 meses: perda acumulada (vermelho) x custo acumulado do Kentro (menta). */
export function Projection({ r, height = 320 }: { r: ReportData; height?: number }) {
  if (r.ganho_mensal <= 0) return <p className="chart-empty">Projeção a confirmar — falta a perda mensal.</p>;
  const be = breakEvenMonth(r);
  return <div className="chart-box" role="img" aria-label="Gráfico de 12 meses: perda acumulada contra custo acumulado do Kentro">
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={r.projecao_12m} margin={{ left: 8, right: 16, top: 16, bottom: 8 }}>
        <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
        <XAxis dataKey="mes" tickFormatter={m => `Mês ${m}`} stroke="var(--chart-text)" fontSize={12} />
        <YAxis tickFormatter={short} stroke="var(--chart-text)" fontSize={12} width={90} />
        <Tooltip formatter={tip} labelFormatter={m => `Mês ${m}`} contentStyle={tipStyle} />
        <Legend />
        <Area type="monotone" dataKey="perda_acumulada" name="Perda acumulada (sem Kentro)" stroke="var(--loss)" fill="var(--loss)" fillOpacity={0.18} strokeWidth={3} />
        <Area type="monotone" dataKey="custo_acumulado" name="Custo acumulado do Kentro" stroke="var(--gain)" fill="var(--gain)" fillOpacity={0.14} strokeWidth={3} />
        {be && <ReferenceLine x={be} stroke="var(--chart-text)" strokeDasharray="4 4" label={{ value: `Já se pagou no mês ${be}`, position: 'insideTopLeft', fill: 'var(--chart-text)', fontSize: 12 }} />}
      </AreaChart>
    </ResponsiveContainer>
  </div>;
}

export function PaybackBadge({ r }: { r: ReportData }) {
  return <p className="payback-badge">{r.payback_dias === null ? 'Payback a confirmar' : <>Você se paga em <strong>~{r.payback_dias} dias</strong></>}</p>;
}

/** Régua do múltiplo, com a faixa saudável a partir de 5×. */
export function MultipleGauge({ multiplo }: { multiplo: number | null }) {
  if (multiplo === null) return <p className="chart-empty">Múltiplo a confirmar — falta mensalidade ou perda.</p>;
  const max = Math.max(10, Math.ceil(multiplo * 1.2)); const pos = Math.min(100, (multiplo / max) * 100); const healthy = multiplo >= HEALTHY_MULTIPLE; const mark = `${(HEALTHY_MULTIPLE / max) * 100}%`;
  return <div className="gauge">
    <p className="gauge-sentence">Para cada R$ 1 de mensalidade, você recupera <strong>~{money(multiplo)}</strong>.</p>
    <div className="gauge-track" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={multiplo} aria-label={`Múltiplo de retorno ${decimal(multiplo)}×`}>
      <span className="gauge-healthy" style={{ left: mark }} />
      <span className="gauge-fill" data-healthy={healthy} style={{ width: `${pos}%` }} />
    </div>
    <div className="gauge-scale"><span>0×</span><span style={{ left: mark }}>saudável ≥ {HEALTHY_MULTIPLE}×</span><span>{max}×</span></div>
    {!healthy && <p className="warning flex items-start gap-2"><AlertTriangle className="size-4 shrink-0" />Abaixo de 5×: faltou alavanca ou o plano está grande demais</p>}
  </div>;
}

const ICONS = [MessageCircle, Send, CalendarCheck, RefreshCw, Layers];
/** Onde o dinheiro escapa → como o Kentro tampa. */
export function LeakDiagram({ r }: { r: ReportData }) {
  return <ul className="leak-list">{r.perda_por_alavanca.map((l, i) => { const f = LEAK_FIX[l.alavanca]; const Icon = ICONS[i] ?? Bot; return <li key={l.alavanca} className="leak-row">
    <div className="leak-from"><Icon className="size-5 shrink-0" aria-hidden /><div><p>{f?.vazamento ?? l.alavanca}</p><strong className={l.valor ? 'loss' : ''}>{l.valor === null ? 'a confirmar' : `${money(l.valor)}/mês`}</strong></div></div>
    <ArrowRight className="leak-arrow" aria-label="Kentro tampa com" />
    <div className="leak-to"><p>{f?.tampa ?? 'Kentro'}</p></div>
  </li>; })}</ul>;
}

/** Linha de alavanca: número grande, conta pequena embaixo. */
export function LeverLine({ nome, valor, conta, resposta }: { nome: string; valor: number | null; conta?: string | undefined; resposta?: string | undefined }) {
  return <li className="lever-line"><div className="flex justify-between gap-3"><span>{nome}</span><strong className={valor ? 'loss' : ''}>{valor === null ? 'A confirmar' : money(valor)}</strong></div>
    {conta && <p className="why">{conta}</p>}{resposta && <p className="why">Cliente: “{resposta}”</p>}</li>;
}
