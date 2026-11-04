import { describe, it, expect } from 'vitest';
import { calculate } from '@/lib/ancora';
import { NICHOS } from '@/lib/diagnostico';
import { applyExtraction } from '@/lib/transcript';
const base = { ticket: 'R$101–500', al1: '6 a 20' };
describe('Diagnóstico enxuto: alavancas calculadas', () => {
  it('alavanca 1 = perdidos × 30% × ticket', () => expect(calculate({ ...base, nicho: NICHOS.outro }).alavancas[0]?.valor).toBe(1170));
  it('saúde: faltas × 50% × horário e avaliações × 30% × ticket', () => { const c = calculate({ ...base, nicho: NICHOS.saude, al3: '6 a 20', horario: 'R$101–300', saude_aval: 'Até 5' }); expect(c.alavancas[2]?.valor).toBe(1300); expect(c.alavancas[1]?.valor).toBe(270); });
  it('varejo: recompra × ticket; sem faltas nem follow-up (0)', () => { const c = calculate({ ...base, nicho: NICHOS.varejo, varejo_recompra: 'Até 5', al3: '21 a 50' }); expect(c.alavancas[3]?.valor).toBe(900); expect(c.alavancas[2]?.valor).toBe(0); expect(c.alavancas[1]?.valor).toBe(0); });
  it('educação: follow-up e ex-alunos', () => { const c = calculate({ ...base, nicho: NICHOS.educacao, edu_follow: 'Até 5', edu_exalunos: 'Até 5' }); expect(c.alavancas[1]?.valor).toBe(270); expect(c.alavancas[3]?.valor).toBe(900); });
  it('ganho soma 1,2,3,4,7', () => expect(calculate({ ...base, nicho: NICHOS.alto, alto_pipeline: 'Até 5', al7: 'Até R$300' }).ganho).toBe(1170 + 270 + 150));
  it('nicho com pergunta não respondida fica a confirmar', () => { const c = calculate({ ...base, nicho: NICHOS.servicos, serv_retencao: 'Não sabe' }); expect(c.alavancas[3]?.valor).toBeNull(); expect(c.parcial).toBe(true); });
  it('capacidade vem da equipe e não soma', () => { const c = calculate({ E: '4 a 6' }); expect(c.horas).toBe(5); expect(c.ganho).toBe(0); });
  it('transcrição aceita nicho e campos do módulo', () => { const a = applyExtraction({ nicho: NICHOS.saude, al3: '6 a 20' }); expect(a['nicho']).toBe(NICHOS.saude); expect(a['al3']).toBe('6 a 20'); expect(a['edu_follow']).toBe('Cliente não respondeu'); });
});
