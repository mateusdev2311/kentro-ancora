import { Anchor } from 'lucide-react';
import roxa from '@/assets/kentro-roxa-wordmark.webp.asset.json';
import branca from '@/assets/kentro-branca-wordmark.webp.asset.json';

/** Logo Kentro + selo da âncora do Método ÂNCORA. */
export function BrandLogo({ size = 'md', light = false }: { size?: 'sm' | 'md' | 'lg'; light?: boolean }) {
  return <div className={`brand-lockup brand-${size}`} data-light={light}>
    <img src={(light ? branca : roxa).url} alt="Kentro" className="brand-wordmark" />
    <span className="brand-divider" aria-hidden="true" />
    <span className="brand-anchor"><span className="anchor-seal" aria-hidden="true"><Anchor /></span><span className="anchor-text"><small>Método</small>ÂNCORA</span></span>
  </div>;
}
