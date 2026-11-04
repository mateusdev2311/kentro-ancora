import { describe, expect, it } from 'vitest';
import { calculate } from '@/lib/ancora';
import { closingBullets } from '@/lib/anchoring';
import { OPEN, UNANSWERED } from '@/lib/answer-state';
import { gerarTextosVenda } from '@/lib/venda-textos';
import type { Answers } from '@/lib/ficha';

const gerar = (a: Answers, vendedor = 'Ana') => gerarTextosVenda(a, calculate(a), vendedor);
const fichaCompleta: Answers = {
  cliente_nome: 'Clínica Sorriso',
  nicho: 'Saúde (clínicas/odonto/estética)',
  ticket: 'R$501–1.000',
  al1: 'Mais de 50',
  al7: 'Acima de R$1.000',
  al8: 'Já tivemos bloqueio',
  E: '4 a 6',
  S: 'R$2.501–4.000',
  dores: ['Faltas na agenda', 'Risco de número/bloqueio'],
  dor: 'A gente perde cliente de madrugada',
  decisor: 'Comitê/sócio',
  prazo: 'Agora/esta semana',
  plano_escolhido: 'Social Pro',
};

describe('pacote do closer', () => {
  it('traz as 7 seções do método', () => {
    const { pacote_closer } = gerar(fichaCompleta);
    for (const s of ['1. Ficha de diagnóstico', '2. A conta', '3. Plano e produtos', '4. Preço ancorado', '5. Script de revelação', '6. Objeções prováveis', '7. Próximos passos']) expect(pacote_closer).toContain(s);
  });

  it('usa a frase literal e liga cada dor a uma funcionalidade', () => {
    const { pacote_closer } = gerar(fichaCompleta);
    expect(pacote_closer).toContain('"A gente perde cliente de madrugada"');
    expect(pacote_closer).toContain('Confirmação e lembrete automáticos');
    expect(pacote_closer).toContain('WhatsApp API Oficial');
  });

  it('mostra os números da conta, sem divergir do cálculo', () => {
    const conta = calculate(fichaCompleta);
    const { pacote_closer } = gerar(fichaCompleta);
    expect(pacote_closer).toContain(conta.ganho.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    expect(pacote_closer).toContain(conta.prudente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  });

  it('avisa só quando o múltiplo está abaixo de 5×', () => {
    expect(gerar({ al7: 'Até R$300' }).pacote_closer).toContain('múltiplo abaixo de 5×');
    expect(gerar({ ticket: 'Acima de R$5.000', al1: 'Mais de 50' }).pacote_closer).not.toContain('múltiplo abaixo de 5×');
  });

  it('só levanta a objeção do sócio quando o decisor não está', () => {
    expect(gerar(fichaCompleta).pacote_closer).toContain('Preciso falar com o sócio');
    expect(gerar({ ...fichaCompleta, decisor: 'Decisor presente na sala' }).pacote_closer).not.toContain('Preciso falar com o sócio');
  });

  it('traz as janelas de negociação', () => {
    const { pacote_closer } = gerar(fichaCompleta);
    expect(pacote_closer).toContain('Até 24 h do fim da reunião: 50% de bônus');
    expect(pacote_closer).toContain('Nunca desconto recorrente');
  });

  it('ficha vazia não inventa: o que falta sai como a confirmar', () => {
    const { pacote_closer } = gerar({});
    expect(pacote_closer).toContain('a confirmar');
    expect(pacote_closer).toContain('**Ganho mensal:** a confirmar');
    expect(pacote_closer).not.toContain('undefined');
    expect(pacote_closer).not.toContain('null');
    expect(pacote_closer).not.toContain('NaN');
  });

  it('não trata "cliente não respondeu" como resposta', () => {
    const { pacote_closer } = gerar({ dor: UNANSWERED, decisor: UNANSWERED });
    expect(pacote_closer).not.toContain(UNANSWERED);
  });

  it('usa a resposta aberta do cliente', () => {
    const { pacote_closer } = gerar({ decisor: OPEN, decisor_aberto: 'Só a diretora' });
    expect(pacote_closer).toContain('Só a diretora');
  });

  it('C-Level mostra mentoria e implantação grátis', () => {
    const { pacote_closer } = gerar({ plano_escolhido: 'Kentro C-Level' });
    expect(pacote_closer).toContain('5.000,00');
    expect(pacote_closer).toContain('**Implantação:** grátis');
  });
});

describe('proposta do cliente', () => {
  it('nunca expõe condições de negociação, fórmulas nem nomes internos', () => {
    const { proposta_cliente } = gerar({ ...fichaCompleta, addons: ['IA Kentro', 'PABX Kentro'] });
    expect(proposta_cliente).not.toMatch(/b[oô]nus|desconto|diretoria|24 h|÷|alavanca|recuper[aá]vel|closer|múltiplo|SPIN|\bprudente\b|Indicação Comercial/i);
  });

  it('usa o valor conservador e as duas opções, com o anual primeiro', () => {
    const conta = calculate(fichaCompleta);
    const { proposta_cliente } = gerar(fichaCompleta);
    expect(proposta_cliente).toContain(conta.prudente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    expect(proposta_cliente.indexOf('**Anual:**')).toBeGreaterThan(-1);
    expect(proposta_cliente.indexOf('**Anual:**')).toBeLessThan(proposta_cliente.indexOf('**Mensal:**'));
  });

  it('só cita a garantia quando há IA Kentro', () => {
    expect(gerar(fichaCompleta).proposta_cliente).not.toContain('Garantia');
    expect(gerar({ ...fichaCompleta, addons: ['IA Kentro'] }).proposta_cliente).toContain('Garantia da IA Kentro');
  });

  it('assina com o vendedor e pede a decisão', () => {
    const { proposta_cliente } = gerar(fichaCompleta, 'Ana');
    expect(proposta_cliente).toContain('Ana, Kentro');
    expect(proposta_cliente).toContain('Vamos decidir agora?');
    expect(gerar(fichaCompleta, '').proposta_cliente).toContain('Equipe Kentro');
  });

  it('ficha vazia não mostra ganho de R$ 0,00', () => {
    const { proposta_cliente } = gerar({});
    expect(proposta_cliente).not.toContain('R$ 0,00');
    expect(proposta_cliente).toContain('será confirmado');
  });
});

describe('motivos de fechamento', () => {
  it('saem da ficha e da conta, no máximo 5', () => {
    const b = closingBullets(fichaCompleta, calculate(fichaCompleta));
    expect(b.length).toBeGreaterThanOrEqual(3);
    expect(b.length).toBeLessThanOrEqual(5);
    expect(b.join(' ')).toContain('Cada mês de espera');
    expect(b.join(' ')).toContain('quer resolver isso agora');
  });

  it('sem dados, não inventa motivo', () => {
    expect(closingBullets({}, calculate({}))).toEqual([]);
  });
});
