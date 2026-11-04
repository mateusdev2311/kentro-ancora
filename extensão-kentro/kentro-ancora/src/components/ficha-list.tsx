import { Link } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';
export type FichaRow = { id: string; created_at: string; cliente_nome: string; segmento: string; closer_nome: string; user_id: string | null };
export function FichaList({ rows, showCloser = false }: { rows: FichaRow[]; showCloser?: boolean }) {
  return <ul className="space-y-3">{rows.map(f => <li key={f.id}><Link to="/f/$id" params={{ id: f.id }} className="card flex items-center justify-between gap-4"><div><h2 className="break-words font-bold text-primary">{f.cliente_nome || 'Cliente a confirmar'}</h2><p className="mt-1 text-sm text-muted-foreground">{f.segmento || 'Segmento a confirmar'} · {new Date(f.created_at).toLocaleString('pt-BR')}{showCloser && ` · Closer: ${f.closer_nome || 'sem closer'}`}</p></div><ArrowUpRight className="size-5 shrink-0 text-primary" /></Link></li>)}</ul>;
}
