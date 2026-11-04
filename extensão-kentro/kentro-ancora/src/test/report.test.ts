import { describe, expect, it } from 'vitest';
import { calculate } from '@/lib/ancora';
import { buildReport } from '@/lib/report';

describe('relatório de decisão', () => {
  const a = { ticket: 'R$101–500', al1: '6 a 20', mensalidade: '300', implantacao: '600' };
  it('fórmula da alavanca de leads mostra a conta', () => { const f = calculate(a).alavancas[0]?.conta ?? ''; expect(f).toContain('13 contatos/mês × 30% recuperável ×'); expect(f).toContain('1.170,00/mês'); });
  it('projeção: perda = ganho × mês; custo = implantação + mensalidade × mês', () => { const r = buildReport(a, calculate(a)); expect(r.projecao_12m[1]).toEqual({ mes: 2, perda_acumulada: 2340, custo_acumulado: 3996.83 }); expect(r.projecao_12m).toHaveLength(12); });
  it('múltiplo e payback em dias', () => { const r = buildReport(a, calculate(a)); expect(r.multiplo).toBe(1.14); expect(r.payback_dias).toBe(76); });
  it('alavanca sem dado fica a confirmar, nunca zero', () => { const r = buildReport({ al1: 'Não sabe' }, calculate({ al1: 'Não sabe' })); expect(r.perda_por_alavanca[0]?.valor).toBeNull(); expect(r.a_confirmar).toContain('Leads perdidos fora do horário/demora'); });
});
