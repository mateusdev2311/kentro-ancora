import { useEffect, useState } from 'react';
import { Copy, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { copiarTexto } from '@/lib/copiar';

/** Link público do cliente: só conta, ancoragem e proposta. */
export function ClientLink({ id }: { id: string }) {
  const [url, setUrl] = useState(''); const [copied, setCopied] = useState(false);
  useEffect(() => setUrl(`${window.location.origin}/c/${id}`), [id]);
  return <div className="saved-link mb-6"><p className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary"><LinkIcon className="size-4" />Link para o cliente · só conta, ancoragem e proposta</p>
    <div className="flex flex-wrap items-center gap-2"><a href={url} target="_blank" rel="noreferrer" className="break-all text-sm underline">{url}</a><Button variant="outline" className="h-9" onClick={async () => setCopied(await copiarTexto(url))}><Copy />{copied ? 'Copiado' : 'Copiar'}</Button></div></div>;
}
