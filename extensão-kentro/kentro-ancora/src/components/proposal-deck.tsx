import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Download, Maximize, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { computePlans } from '@/lib/pricing';
import { PLANS, planValues } from '@/lib/anchoring';
import { money } from '@/lib/ancora';
import { NEXT_STEP, VALIDITY, pickCases, type ProposalData } from '@/lib/proposal';
import { LEAK_FIX, type ReportData } from '@/lib/report';
import hero from '@/assets/proposal-v2/fluid-hero.png.asset.json';
import waves from '@/assets/proposal-v2/waves-green.png.asset.json';
import purpleWaves from '@/assets/proposal-v2/waves-purple.png.asset.json';
import logoWhite from '@/assets/proposal-v2/wordmark-white.png.asset.json';
import logoPurple from '@/assets/proposal-v2/wordmark-purple.png.asset.json';
import team from '@/assets/proposal-v2/team.png.asset.json';
import painel from '@/assets/proposal-v2/shot-dashboard.png.asset.json';
import crm from '@/assets/proposal-v2/shot-crm.png.asset.json';
import fluxo from '@/assets/proposal-v2/shot-fluxo.png.asset.json';
import canais from '@/assets/proposal-v2/kentro-canais-strip.png.asset.json';
import case1 from '@/assets/proposal/case1.jpeg.asset.json';
import case2 from '@/assets/proposal/case2.jpeg.asset.json';
import case3 from '@/assets/proposal/extra1.jpeg.asset.json';

const CASES = {
  farmacia: { img: case1.url, nome: 'Farmácia Bom Preço', pessoa: 'Wesley Danilo', seg: 'Farmácia' },
  dental: { img: case2.url, nome: 'Dental Center', pessoa: 'Dr. Felipe Mafra', seg: 'Odontologia' },
  odonto: { img: case3.url, nome: 'Clínica Viva & Sorria', pessoa: 'Dra. Greise Antunes', seg: 'Odontologia' },
};
const titles = ['Capa', 'Sobre a Kentro', 'Seu diagnóstico', 'Método Kentro', 'Plataforma', 'Recursos', 'Ancoragem', 'Cases', 'Investimento', 'Próximos passos'];
const ph = (v: string, fallback = 'A confirmar') => v || fallback;

function Slide({ children, n, theme = 'light', className = '' }: { children: ReactNode; n: number; theme?: 'light' | 'dark' | 'violet'; className?: string }) {
  return <section className={`deck-slide deck-${theme} ${className}`} aria-label={`Slide ${n} de 10`}>
    <img className="deck-logo" src={theme === 'light' ? logoPurple.url : logoWhite.url} alt="Kentro" />
    {children}
    <footer className="deck-footer"><span><b>{String(n).padStart(2, '0')}</b> · Proposta comercial</span><span>www.kentro.com.br</span></footer>
  </section>;
}
function Heading({ label, children }: { label?: string; children: ReactNode }) {
  return <header className="deck-heading">{label && <p className="deck-kicker">{label}</p>}<h2>{children}</h2></header>;
}

function Slides({ d, r, mentoria, setMentoria, printable = false }: { d: ProposalData; r?: ReportData | undefined; mentoria: boolean; setMentoria: (b: boolean) => void; printable?: boolean }) {
  const p = computePlans(d.usuarios, mentoria);
  const pv = planValues(d.usuarios, d.plano);
  const ganho = r?.ganho_mensal;
  const prudente = r?.cenario_prudente ?? (d.perda > 0 ? d.perda : null);
  const monthly = pv.mensal;
  const multiple = ganho !== undefined && ganho > 0 && monthly > 0 ? ganho / monthly : null;
  const payback = ganho !== undefined && ganho > 0 ? Math.round((pv.implantacao + monthly) / (ganho / 30)) : null;
  const facts = r?.fatos.slice(0, 6) ?? [];
  const leaks = r?.perda_por_alavanca ?? [];
  return <>
    <Slide n={1} theme="dark" className="deck-cover">
      <img className="deck-cover-img" src={hero.url} alt="Plataforma de atendimento Kentro" />
      <img className="deck-cover-wave" src={waves.url} alt="" />
      <div className="deck-cover-copy">
        <div className="deck-pills"><span>CHAT + CRM + IA</span><span>API Oficial do WhatsApp · Meta</span></div>
        <h1>Transforme cada conversa <em>em venda.</em></h1>
        <p className="deck-sub">Proposta comercial para <strong>{ph(d.cliente, 'Cliente a confirmar')}</strong></p>
        <p className="deck-status"><i />SISTEMA ATIVO · +14.670 AGENTES · +1.600 OPERAÇÕES</p>
      </div>
      <dl className="deck-cover-meta"><div><dt>Responsável</dt><dd>{d.closer}</dd></div><div><dt>Validade da proposta</dt><dd>{VALIDITY}</dd></div><div><dt>Plano escolhido</dt><dd>{d.plano} · {d.usuarios} usuários</dd></div></dl>
    </Slide>
    <Slide n={2}>
      <div className="deck-about"><img className="deck-team" src={team.url} alt="Equipe Kentro" /><div><Heading>Sobre a <em>Kentro</em></Heading><p className="deck-purpose">Existimos para que nenhuma empresa <mark>perca clientes</mark> por atendimento desorganizado.</p><div className="deck-stats">{[['+1.600', 'empresas atendidas'], ['+14.670', 'agentes todos os dias'], ['+150%', 'de crescimento ano a ano'], ['Startup Destaque', 'InovAtiva 2023.2']].map(([n, l]) => <div key={l}><strong>{n}</strong><span>{l}</span></div>)}</div></div></div>
    </Slide>
    <Slide n={3} theme="violet">
      <Heading label="Método ÂNCORA · diagnóstico">O que você nos contou.</Heading>
      <div className="deck-diagnosis"><div><p className="deck-label">{ph(d.cliente, 'Sua operação')} · {ph(d.segmento, 'Segmento a confirmar')}</p><ul className="deck-facts">{(facts.length ? facts : [d.convDia || 'Volume de conversas: a confirmar', `Ticket médio: ${money(d.ticket)}`, `${d.usuarios} usuários no plano escolhido`]).map((f, i) => <li key={i}><Check />{f}</li>)}</ul></div><div className="deck-diagnosis-total"><p>Potencial mensal identificado</p><strong className="loss">{money(ganho ?? null)}</strong><p>Cenário prudente · potencial ÷ 3</p><strong className="loss deck-number-sm">{money(prudente)}</strong><small>{r?.parcial || !r ? 'Diagnóstico parcial. O que não foi informado permanece a confirmar.' : 'Estimativa calculada a partir das informações da reunião; não é promessa de resultado.'}</small></div></div>
      <p className="deck-callout">A proposta parte da sua realidade — não de uma média genérica de mercado.</p>
    </Slide>
    <Slide n={4} theme="dark">
      <img className="deck-method-wave" src={purpleWaves.url} alt="" />
      <Heading label="O Método Kentro">Não vendemos um software.<br /><em>Aplicamos um método.</em></Heading>
      <div className="deck-method">{[['CENTRALIZAR', 'Todos os canais e o histórico em um único lugar. Nada mais se perde.'], ['AUTOMATIZAR', 'IA e fluxos assumem o repetitivo: triagem, qualificação, follow-up e cobrança.'], ['CONVERTER', 'Funil visível, dono por conversa e follow-up no tempo certo. Venda vira processo, não sorte.'], ['FIDELIZAR', 'Pós-venda ativo, recompra e reativação da base.']].map(([t, x], i) => <div key={t}><span className="deck-step-num">{i + 1}</span><h3>{t}</h3><p>{x}</p></div>)}</div>
      <p className="deck-method-caption">Método validado em +1.600 operações. A plataforma existe para executá-lo.</p>
    </Slide>
    <Slide n={5}>
      <Heading>A plataforma que executa<br />o <em>Método Kentro.</em></Heading>
      <div className="deck-platform"><img className="deck-screen" src={painel.url} alt="Painel de atendimento Kentro" /><div className="deck-features">{[['Chat', 'WhatsApp API Oficial Meta, Instagram, voz, e-mail e webchat em uma única tela.'], ['CRM', 'Funil, histórico unificado e automações comerciais.'], ['IA', 'Agentes treinados no seu negócio, com transbordo humano.']].map(([t, x]) => <div key={t}><h3>{t}</h3><p>{x}</p></div>)}</div></div>
      <img className="deck-channels" src={canais.url} alt="Canais de atendimento integrados" />
      <p className="deck-bottom-line">Um só sistema no lugar de ferramentas pagas separadas.</p>
    </Slide>
    <Slide n={6}>
      <Heading>O essencial, <em>em três frentes.</em></Heading>
      <div className="deck-resources">{[
        ['CENTRALIZAR', 'Omnichannel + Voz', ['Todos os canais numa tela, com dono de conversa', 'Histórico completo por cliente', 'PABX/URA integrado e relatórios em tempo real']],
        ['CONVERTER · FIDELIZAR', 'CRM + Disparos', ['Funis personalizados por operação', 'Follow-up automático, remarketing e reativação', 'Campanhas segmentadas para a base']],
        ['AUTOMATIZAR', 'IA Humanizada', ['Treinada no seu negócio', 'Triagem, qualificação e agenda', 'Transbordo humano no momento certo']],
      ].map(([k, t, items]) => <div key={String(t)}><p className="deck-kicker">{k}</p><h3>{t}</h3><ul>{Array.isArray(items) && items.map(x => <li key={x}><ArrowRight />{x}</li>)}</ul></div>)}</div>
      <div className="deck-shots"><img src={crm.url} alt="Funil CRM Kentro" /><img src={fluxo.url} alt="Fluxos de automação Kentro" /></div>
      <p className="deck-small-note">Recursos e serviços adicionais conforme o plano e o escopo contratado.</p>
    </Slide>
    <Slide n={7}>
      <Heading label="Sua ancoragem">O que está escapando.<br /><em>O que vamos organizar.</em></Heading>
      <div className="deck-anchor-layout"><div className="deck-leaks">{leaks.length ? leaks.slice(0, 5).map(l => <div key={l.alavanca}><div><h3>{LEAK_FIX[l.alavanca]?.vazamento ?? l.alavanca}</h3><p>{LEAK_FIX[l.alavanca]?.tampa ?? 'Processo e acompanhamento na plataforma Kentro'}</p></div><strong className="loss">{money(l.valor)}<small>/mês</small></strong></div>) : <p className="deck-await">Alavancas do diagnóstico: a confirmar na reunião.</p>}</div><aside className="deck-anchor-summary"><p>Cenário prudente de recuperação</p><strong className="loss">{money(prudente)}<small>/mês</small></strong><hr /><p>Investimento · {d.plano}</p><strong>{money(monthly)}<small>/mês</small></strong><p>Implantação: {money(pv.implantacao)}</p><div className="deck-ratios"><p>Potencial / mensalidade<strong>{multiple === null ? 'A confirmar' : `${multiple.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}×`}</strong></p><p>Payback estimado<strong>{payback === null ? 'A confirmar' : `${payback} dias`}</strong></p></div></aside></div>
      <p className="deck-small-note">Potencial calculado: soma das alavancas informadas. Prudente = soma ÷ 3. Payback = (implantação + mensalidade) ÷ (potencial mensal ÷ 30). Estimativa, não garantia.</p>
    </Slide>
    <Slide n={8}>
      <Heading label="Cases">Histórias de quem parou<br />de <em>perder cliente.</em></Heading>
      <div className="deck-cases">{pickCases(d.segmento).map(k => { const c = CASES[k]; return <div key={k}><img src={c.img} alt={c.nome} /><div><span className="deck-case-seg">{c.seg}</span><h3>{c.nome}</h3><p>{c.pessoa}</p></div></div>; })}</div>
      <p className="deck-bottom-line">Atendimento organizado, relacionamento próximo e uma operação conectada.</p>
    </Slide>
    <Slide n={9}>
      <div className="deck-investment-heading"><Heading label="Investimento">Valor acima de <em>preço.</em></Heading>{!printable && <Button variant="outline" className="deck-toggle" aria-pressed={mentoria} onClick={() => setMentoria(!mentoria)}><span data-on={mentoria} />Mentoria C-Level</Button>}</div>
      <p className="deck-users">Valores para {p.usersLabel} · plano anual em destaque</p>
      <div className="deck-plans">{PLANS.map(pl => { const v = p[pl.key]; const on = pl.name === d.plano; return <div key={pl.name} className="deck-plan" data-on={on}><span className="deck-plan-tag">{on ? 'Plano escolhido' : pl.key === 'social' ? 'Suporte premium' : 'Kentro'}</span><h3>{pl.name}</h3><p className="deck-plan-note">{pl.apoio}</p><p className="deck-plan-label">Plano anual</p><strong className="deck-plan-price">{v.anual}<small>/mês</small></strong><p>Mensal: <b>{v.mensal}</b></p>{'eco' in v && <p className="deck-eco">{v.eco}</p>}{pl.key === 'excel' && 'sistema' in v && <p className="deck-plan-detail">Sistema {v.sistema} + consultoria de 4h</p>}<p className="deck-plan-impl">Implantação: <b>{'implantacao' in v ? v.implantacao : 'GRÁTIS'}</b></p>{pl.key === 'clevel' && <p className="deck-plan-detail">{mentoria ? `Com mentoria: ${p.clevel.mentoria}/mês no anual. ${p.clevel.mentoriaAvista}.` : 'Mentoria opcional: R$ 5.000 à vista ou 12× R$ 500.'}</p>}</div>; })}</div>
      <div className="deck-investment-notes"><p>Implantação paga uma única vez. Fidelidade de 1, 3, 6 ou 12 meses, a combinar.</p><p>Mensagens da Meta pagas diretamente pelo cliente, a preço de custo. Serviços adicionais conforme escopo.</p></div>
    </Slide>
    <Slide n={10} theme="dark">
      <img className="deck-method-wave" src={waves.url} alt="" />
      <Heading label="Próximos passos">Vamos <em>começar?</em></Heading>
      <p className="deck-next-intro">Da assinatura ao ar — cada passo te deixa mais perto da operação rodando.</p>
      <div className="deck-next-steps">{[['Escolha do plano', 'Plano e forma de pagamento definidos.'], ['Assinatura digital', 'Contrato eletrônico, resolvido em minutos.'], ['Kickoff estratégico', 'Agenda fechada ainda nesta semana.'], ['Pagamento', 'Boleto, cartão ou PIX, conforme combinado.'], ['API Oficial Meta', 'Conexão oficial do WhatsApp da operação.'], ['Implantação em etapas', 'Canais, funil, fluxos e treinamento na Kentro Academy.']].map(([t, x], i) => <div key={t}><span className="deck-step-num">{i + 1}</span><div><h3>{t}</h3><p>{x}</p></div></div>)}</div>
      <p className="deck-next-cta">Próximo passo: <strong>{r?.proximo_passo || NEXT_STEP}</strong></p>
      {!!r?.bullets_fechamento.length && <p className="deck-closing-bullet">{r.bullets_fechamento[0]}</p>}
    </Slide>
  </>;
}

function useScale(ref: React.RefObject<HTMLDivElement | null>) {
  const [s, setS] = useState(0.3);
  useLayoutEffect(() => { const el = ref.current; if (!el) return; const ro = new ResizeObserver(() => setS(Math.min(el.clientWidth / 1920, el.clientHeight / 1080))); ro.observe(el); return () => ro.disconnect(); }, [ref]);
  return s;
}

export function ProposalDeck({ data, report, onClose }: { data: ProposalData; report?: ReportData | undefined; onClose?: () => void }) {
  const [i, setI] = useState(0); const [mentoria, setMentoria] = useState(false); const [full, setFull] = useState(false);
  const [printReady, setPrintReady] = useState(false); const [printing, setPrinting] = useState(false);
  const stage = useRef<HTMLDivElement>(null); const root = useRef<HTMLDivElement>(null); const printRoot = useRef<HTMLDivElement>(null);
  const scale = useScale(stage); const touch = useRef<number | null>(null);
  const go = useCallback((n: number) => setI(x => Math.max(0, Math.min(9, x + n))), []);
  useEffect(() => {
    setPrintReady(true);
    const k = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.closest('input,textarea,button')) return; if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(1); } if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1); } if (e.key === 'Escape' && !document.fullscreenElement) { setFull(false); onClose?.(); } };
    const f = () => setFull(!!root.current && document.fullscreenElement === root.current);
    window.addEventListener('keydown', k); document.addEventListener('fullscreenchange', f);
    return () => { window.removeEventListener('keydown', k); document.removeEventListener('fullscreenchange', f); };
  }, [go, onClose]);
  const present = () => { if (!root.current?.requestFullscreen) { setFull(true); return; } void root.current.requestFullscreen().catch(() => setFull(true)); };
  const download = async () => {
    setPrinting(true);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      await document.fonts.ready;
      const imgs = Array.from(printRoot.current?.querySelectorAll('img') ?? []);
      await Promise.all(imgs.map(img => img.decode().catch(() => undefined)));
      window.print();
    } finally { setPrinting(false); }
  };
  const slides = <Slides d={data} r={report} mentoria={mentoria} setMentoria={setMentoria} />;
  return <div ref={root} className="deck-root" data-full={full}>
    <div className="deck-toolbar"><p>Proposta · {data.cliente || 'Cliente a confirmar'}</p><div><Button className="btn-accent" onClick={full ? () => { if (document.fullscreenElement) void document.exitFullscreen(); else setFull(false); } : present}><Maximize />{full ? 'Sair da tela cheia' : 'Apresentar'}</Button><Button variant="outline" disabled={printing} onClick={() => void download()}><Download />{printing ? 'Preparando…' : 'Baixar PDF'}</Button>{onClose && <Button variant="outline" onClick={onClose}><X />Fechar</Button>}</div></div>
    <div ref={stage} className="deck-stage" onTouchStart={e => { touch.current = e.touches[0]?.clientX ?? null; }} onTouchEnd={e => { const x = e.changedTouches[0]?.clientX; if (touch.current !== null && x !== undefined && Math.abs(x - touch.current) > 40) go(x < touch.current ? 1 : -1); touch.current = null; }}><div className="deck-scaler" style={{ transform: `scale(${scale})` }}><div className="deck-track" style={{ transform: `translateX(-${i * 1920}px)` }}>{slides}</div></div></div>
    <div className="deck-nav"><Button variant="outline" size="icon" aria-label="Slide anterior" disabled={i === 0} onClick={() => go(-1)}><ChevronLeft /></Button><div className="deck-dots">{titles.map((title, n) => <Button variant="ghost" key={title} size="icon" title={title} aria-label={`Ir para o slide ${n + 1}`} aria-current={n === i ? 'step' : undefined} data-on={n === i} onClick={() => setI(n)} />)}</div><span className="deck-nav-title">{i + 1} / 10 · {titles[i]}</span><Button variant="outline" size="icon" aria-label="Próximo slide" disabled={i === 9} onClick={() => go(1)}><ChevronRight /></Button></div>
    {printReady && createPortal(<div ref={printRoot} className="deck-print" aria-hidden="true"><Slides d={data} r={report} mentoria={mentoria} setMentoria={setMentoria} printable /></div>, document.body)}
  </div>;
}
