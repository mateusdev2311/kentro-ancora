import { describe, expect, it } from 'vitest';
import { convPerDay, pickCases, proposalData } from './proposal';
import { calculate } from './ancora';

describe('proposta', () => {
  it('conversas/dia = contatos/mês ÷ 22', () => { expect(convPerDay({ L: '401 a 1.000' })).toBe(32); });
  it('contatos não informados ficam a confirmar', () => { expect(convPerDay({})).toBeNull(); expect(proposalData({}, calculate({})).convDia).toBeNull(); });
  it('vendedor padrão é Vitor Barbalho', () => { expect(proposalData({}, calculate({})).closer).toBe('Vitor Barbalho'); });
  it('perda da proposta é o cenário prudente', () => { const a = { ticket: 'R$101–500', al1: 'x' }; const c = calculate(a); expect(proposalData(a, c).perda).toBe(c.prudente); });
  it('prioriza case do mesmo segmento', () => { expect(pickCases('Clínica odontológica')[0]).toBe('dental'); });
});
