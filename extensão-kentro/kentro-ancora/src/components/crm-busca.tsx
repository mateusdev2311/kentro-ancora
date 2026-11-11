import { useEffect, useState } from 'react';
import { LoaderCircle, Search, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Answers } from '@/lib/ficha';
import { ROTULO_CRM, aplicarOportunidade, desvincularOportunidade, type ResumoOportunidade } from '@/lib/crm';
import { buscarOportunidades, crmDisponivel, dadosDaOportunidade } from '@/lib/crm.functions';

const rotulos = (ids: string[]) => ids.map(id => ROTULO_CRM[id] ?? id).join(', ');

/** Busca a oportunidade no funil Vendas e preenche a ficha com o que o CRM já sabe. */
export function CrmBusca({ a, substituir }: { a: Answers; substituir: (next: Answers) => void }) {
  const [disponivel, setDisponivel] = useState(false);
  const [termo, setTermo] = useState('');
  const [lista, setLista] = useState<ResumoOportunidade[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [trocando, setTrocando] = useState(false);
  const vinculada = typeof a['crm_oportunidade'] === 'string' && a['crm_oportunidade'] ? { id: a['crm_oportunidade'], titulo: String(a['crm_oportunidade_titulo'] ?? '') } : null;
  const doCrm = Array.isArray(a['crm_preenchidos']) ? a['crm_preenchidos'] : [];

  const buscar = async (t: string) => {
    setBusy(true); setMsg('');
    try {
      const r = await buscarOportunidades({ data: { termo: t } });
      if (!r.ok) { setLista(null); setMsg(r.message); return; }
      setLista(r.lista);
      if (!r.lista.length) setMsg(t.trim() ? 'Nenhuma oportunidade aberta no funil Vendas com esse termo.' : 'Nenhuma oportunidade aberta no funil Vendas está com você. Busque pelo nome, telefone ou e-mail.');
    } catch { setMsg('Não foi possível consultar o CRM agora. Tente de novo em instantes.'); } finally { setBusy(false); }
  };

  useEffect(() => {
    void crmDisponivel().then(ok => { setDisponivel(ok); if (ok && !vinculada) void buscar(''); }).catch(() => setDisponivel(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const escolher = async (id: number) => {
    setBusy(true); setMsg('');
    try {
      const r = await dadosDaOportunidade({ data: { id } });
      if (!r.ok) { setMsg(r.message); return; }
      const x = aplicarOportunidade(a, r.dados);
      substituir(x.respostas);
      setTrocando(false); setLista(null);
      setMsg([
        x.preenchidos.length ? `Veio do CRM: ${rotulos(x.preenchidos)}. Confira com o cliente; tudo continua editável.` : 'A oportunidade não tem dados para preencher a ficha.',
        x.mantidos.length ? `Mantido o que você já tinha respondido: ${rotulos(x.mantidos)}.` : '',
      ].filter(Boolean).join(' '));
    } catch { setMsg('Não foi possível ler a oportunidade. Tente de novo.'); } finally { setBusy(false); }
  };

  if (!disponivel) return null;
  return <div className="card space-y-4">
    <div><p className="font-semibold">Oportunidade no CRM · funil Vendas</p><p className="why mt-1">Vincule a oportunidade para trazer o que a pré-venda já levantou: cliente, nicho, cidade, quantas pessoas atendem e se tem site.</p></div>
    {vinculada && !trocando ? <div className="saved-link space-y-2">
      <p className="text-sm">Vinculada à oportunidade <strong>#{vinculada.id}</strong>{vinculada.titulo ? ` · ${vinculada.titulo}` : ''}</p>
      {doCrm.length > 0 && <p className="why">Preenchido pelo CRM e ainda não alterado: {rotulos(doCrm)}.</p>}
      <div className="flex flex-wrap gap-2"><Button variant="outline" className="h-10" onClick={() => { setTrocando(true); setMsg(''); void buscar(termo); }} disabled={busy}><Search />Trocar</Button><Button variant="ghost" className="h-10" onClick={() => { substituir(desvincularOportunidade(a)); setMsg('Oportunidade desvinculada. As respostas continuam na ficha.'); }} disabled={busy}><Unlink />Desvincular</Button></div>
    </div> : <>
      <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); void buscar(termo); }}>
        <input className="field min-w-0 flex-1" maxLength={100} value={termo} onChange={e => setTermo(e.target.value)} placeholder="Nome, empresa, cidade, telefone ou e-mail" aria-label="Buscar oportunidade no CRM" />
        <Button type="submit" variant="outline" className="h-11" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <Search />}Buscar</Button>
      </form>
      {lista && lista.length > 0 && <div className="space-y-2">
        {!termo.trim() && <p className="why">Suas oportunidades abertas:</p>}
        {lista.map(o => <Button key={o.id} variant="outline" className="opt h-auto w-full justify-start whitespace-normal text-left" disabled={busy} onClick={() => void escolher(o.id)}>
          <span><strong>{o.empresa || o.titulo || `Oportunidade #${o.id}`}</strong>{o.empresa && o.titulo && o.titulo !== o.empresa ? ` · ${o.titulo}` : ''}<span className="block text-xs text-muted-foreground">#{o.id}{o.cidade ? ` · ${o.cidade}` : ''}{o.minha ? ' · sua' : ''}</span></span>
        </Button>)}
      </div>}
      {vinculada && <Button variant="ghost" className="h-10" onClick={() => { setTrocando(false); setLista(null); setMsg(''); }}>Manter a oportunidade #{vinculada.id}</Button>}
    </>}
    {msg && <p role="status" className="text-sm">{msg}</p>}
  </div>;
}
