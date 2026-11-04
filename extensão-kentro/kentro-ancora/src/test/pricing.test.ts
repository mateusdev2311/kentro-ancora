import { describe, expect, it } from 'vitest';
import { computePlans } from '@/lib/pricing';
import { defaultUsers, planValues, clientFacts } from '@/lib/anchoring';

describe('motor de preços', () => {
  it('6 usuários: Social Pro mensal R$ 1.027,00 e anual R$ 903,76', () => {
    const p = computePlans(6); expect(p.social.mensal).toBe('R$ 1.027,00'); expect(p.social.anual).toBe('R$ 903,76'); expect(p.social.implantacao).toBe('R$ 1.942,83');
  });
  it('mínimo de 2 usuários', () => expect(computePlans(1).raw.startM).toBe(497));
  it('Excelência Pro soma consultoria de R$ 1.200', () => expect(planValues(6, 'Excelência Pro').mensal).toBe(897 + 1200));
  it('25 usuários: pacote + 70 por usuário acima de 20', () => expect(computePlans(25).raw.startM).toBe(1447 + 70 * 5));
  it('usuários padrão: 6 sem resposta, 3 para "2 a 3"', () => { expect(defaultUsers({})).toBe(6); expect(defaultUsers({ E: '2 a 3' })).toBe(3); });
  it('fatos pulam o não informado', () => expect(clientFacts({ L: 'Não sabe', C: '2 a 3 de 10' })).toEqual(['De cada 10 bem atendidos, 2 a 3 fecham']));
});
