import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AccountShow } from './account-report';
import type { Account } from '@/lib/ancora';

export function PresentationMode({ account, cliente, onClose }: { account: Account; cliente?: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.requestFullscreen?.().catch(() => { /* tela cheia é opcional */ });
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const fs = () => { if (!document.fullscreenElement) onClose(); };
    window.addEventListener('keydown', key); document.addEventListener('fullscreenchange', fs);
    return () => { window.removeEventListener('keydown', key); document.removeEventListener('fullscreenchange', fs); if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); };
  }, [onClose]);
  return <div ref={ref} className="present-overlay" role="dialog" aria-modal="true" aria-label="Apresentar conta">
    <Button variant="outline" className="present-close" onClick={onClose}><X />Voltar ao formulário</Button>
    <AccountShow account={account} cliente={cliente} />
  </div>;
}
