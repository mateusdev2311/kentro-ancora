import { describe,it,expect } from 'vitest';
import { calculate } from '@/lib/ancora';
describe('Conta ÂNCORA',()=>{
 it('leads: 13 × 30% × ticket de 300',()=>expect(calculate({ticket:'R$101–500',al1:'6 a 20'}).ganho).toBe(1170));
 it('orçamentos: 35 × 30% × ticket de 750',()=>expect(calculate({ticket:'R$501–1.000',al2:'21 a 50'}).ganho).toBe(7875));
 it('faltas: 13 × 50% × horário de 200',()=>expect(calculate({horario:'R$101–300',al3:'6 a 20'}).ganho).toBe(1300));
 it('retornos multiplicam ticket sem taxa',()=>expect(calculate({ticket:'Até R$100',al4:'Até 5'}).ganho).toBe(150));
 it('ferramentas usam 650 no meio da faixa',()=>expect(calculate({al7:'R$301–1.000'}).ganho).toBe(650));
 it('mídia, equipe e risco não somam',()=>expect(calculate({al5:'Acima de R$5.000',al6:'Mais de 5h',al8:'Os dois'}).ganho).toBe(0));
 it('prudente divide ganho por três',()=>expect(calculate({al7:'Acima de R$1.000'}).prudente).toBe(500));
 it('preço sai do motor: 6 usuários Social Pro por padrão, a confirmar',()=>{const c=calculate({});expect(c.usuarios).toBe(6);expect(c.mensalidade).toBe(1027);expect(c.implantacao).toBe(1942.83);expect(c.usuariosConfirmar).toBe(true);});
 it('preço digitado é ignorado',()=>expect(calculate({mensalidade:'300',implantacao:'1200'}).mensalidade).toBe(1027));
 it('atendentes informados definem usuários',()=>{const c=calculate({E:'7 a 10'});expect(c.usuarios).toBe(10);expect(c.usuariosConfirmar).toBe(false);});
 it('múltiplo divide ganho pela mensalidade calculada',()=>expect(calculate({al7:'Acima de R$1.000'}).multiplo).toBeCloseTo(1500/1027));
 it('payback inclui implantação e mensalidade',()=>expect(calculate({al7:'Acima de R$1.000'}).payback).toBeCloseTo((1942.83+1027)/50));
 it('campos vazios e Não sabe não inventam dados',()=>{const c=calculate({al1:'Não sabe'});expect(c.alavancas[0]?.valor).toBeNull();expect(c.ticket).toBeNull();expect(c.multiplo).toBeNull();});
 it('sem agenda e sem base valem zero',()=>{const c=calculate({al3:'Não vivo de agenda',al4:'Não tenho base'});expect(c.alavancas[2]?.valor).toBe(0);expect(c.alavancas[3]?.valor).toBe(0);});
 it('horas são devolvidas em 22 dias úteis',()=>expect((calculate({al6:'3–5h'}).horas??0)*22).toBe(88));
});