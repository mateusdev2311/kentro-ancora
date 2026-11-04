import { describe,it,expect } from 'vitest';
import { calculate } from '@/lib/ancora';
import { OPEN, UNANSWERED, answerState,parseOpenNumber } from '@/lib/answer-state';
describe('Respostas',()=>{
 it('usa número aberto claro em leads e ticket',()=>expect(calculate({al1:OPEN,al1_aberto:'Perdemos cerca de 12 contatos por mês',ticket:OPEN,ticket_aberto:'R$ 250,00'}).ganho).toBe(900));
 it('usa faltas abertas e valor exato do horário',()=>expect(calculate({al3:OPEN,al3_aberto:'8 faltas',horario:OPEN,horario_aberto:'R$ 150,50'}).ganho).toBe(602));
 it('usa retornos e ferramentas abertos',()=>expect(calculate({al4:OPEN,al4_aberto:'10 retornos',ticket:'Até R$100',al7:OPEN,al7_aberto:'R$ 450 por mês'}).ganho).toBe(950));
 it('não informado soma zero sem virar zero real',()=>{const c=calculate({al1:UNANSWERED,al7:UNANSWERED});expect(c.ganho).toBe(0);expect(c.alavancas[0]?.valor).toBeNull();expect(c.alavancas[0]?.estado).toBe('não informado');});
 it('zero aberto é real',()=>{const c=calculate({al1:OPEN,al1_aberto:'0 contatos',ticket:'Até R$100'});expect(c.alavancas[0]?.valor).toBe(0);expect(c.alavancas[0]?.estado).toBe('informado');});
 it('texto sem número permanece contexto',()=>{const c=calculate({al1:OPEN,al1_aberto:'Não conseguimos acompanhar',ticket:'Até R$100'});expect(c.alavancas[0]?.valor).toBeNull();expect(c.alavancas[0]?.resposta).toBe('Não conseguimos acompanhar');});
 it('não converte faixas, múltiplas quantidades ou negativos',()=>{for(const s of ['10 a 20','entre 10 e 20','-3','5 por dia, 100 por mês','30%','mais de 50'])expect(parseOpenNumber(s)).toBeNull();});
 it('lê reais pt-BR e mil',()=>{expect(parseOpenNumber('R$ 1.234,56')).toBe(1234.56);expect(parseOpenNumber('cerca de 2 mil reais')).toBe(2000);});
 it('distingue todos os estados de pergunta',()=>{expect(answerState({},'L')).toBe('em branco');expect(answerState({L:'Até 50'},'L')).toBe('respondida por opção');expect(answerState({L:OPEN},'L')).toBe('resposta aberta');expect(answerState({L:UNANSWERED},'L')).toBe('cliente não respondeu');});
});