import { useEffect, useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * A Kentro sempre abre página externa num diálogo, mas o quadro tem allow="fullscreen".
 * Este botão leva o app ao monitor inteiro. O navegador só permite isso a partir de um clique.
 */
export function BotaoTelaCheia() {
  const [cheia, setCheia] = useState(false);
  const [disponivel, setDisponivel] = useState(false);
  useEffect(() => {
    setDisponivel(document.fullscreenEnabled);
    const mudou = () => setCheia(document.fullscreenElement === document.documentElement);
    mudou();
    document.addEventListener('fullscreenchange', mudou);
    return () => document.removeEventListener('fullscreenchange', mudou);
  }, []);
  if (!disponivel) return null;
  const titulo = cheia ? 'Sair da tela cheia' : 'Tela cheia';
  const alternar = () => {
    const pedido = cheia ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    void pedido.catch(() => { /* o botão de nova aba continua como alternativa */ });
  };
  return <Button variant="ghost" className="h-11" onClick={alternar} title={titulo}>{cheia ? <Minimize /> : <Maximize />}<span className="sr-only">{titulo}</span></Button>;
}
