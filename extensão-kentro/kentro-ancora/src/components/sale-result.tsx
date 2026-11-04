import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { copiarTexto } from '@/lib/copiar';
export function SaleResult({pacote,proposta}:{pacote:string;proposta:string}) {
 const [tab,setTab]=useState(0);const [copied,setCopied]=useState(false);const [error,setError]=useState('');
 const text=tab===0?pacote:proposta;
 return <section className="space-y-4"><div className="flex flex-wrap gap-2" role="tablist" aria-label="Resultado da venda">{['Pacote do Closer','Proposta para o Cliente'].map((s,i)=><Button key={s} role="tab" aria-selected={tab===i} variant={tab===i?'default':'outline'} className="h-auto min-h-12 whitespace-normal" onClick={()=>{setTab(i);setCopied(false);}}>{s}</Button>)}</div><div className="flex gap-2"><Button variant="outline" onClick={async()=>{if(await copiarTexto(text)){setCopied(true);setTimeout(()=>setCopied(false),2000);}else{setError('Não foi possível copiar. Você pode baixar o texto.');}}}>{copied?<Check/>:<Copy/>}{copied?'Copiado!':'Copiar'}</Button><Button variant="outline" onClick={()=>{const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));const el=document.createElement('a');el.href=url;el.download=tab===0?'pacote-closer.md':'proposta-cliente.md';el.click();URL.revokeObjectURL(url);}}><Download/>Baixar .md</Button></div>{error&&<p role="alert" className="text-destructive">{error}</p>}<article role="tabpanel" className="generated-text"><ReactMarkdown>{text}</ReactMarkdown></article></section>;
}