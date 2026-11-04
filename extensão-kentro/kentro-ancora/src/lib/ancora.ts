import { z } from 'zod';
import type { Answers, Q } from './ficha';
import { OPEN, answerText, isUnknown, parseOpenNumber } from './answer-state';
import { leverSource, nichoOf } from './diagnostico';
import { chosenPlan, defaultUsers, planValues } from './anchoring';

export const answerSchema = z.record(z.union([z.string().max(30000), z.array(z.string().max(300)).max(30)])).refine(a => JSON.stringify(a).length <= 90000, 'Ficha muito extensa.');
export const segments = ['Saúde/Clínica', 'Odontologia', 'Estética', 'Farmácia', 'Provedor de internet', 'Educação', 'Comércio/Varejo', 'Serviços', 'Outro'];
export const pains: Q = { id: 'dores', label: 'Quais dores o cliente confirmou?', multi: true, options: ['Leads perdidos fora do horário/por demora', 'Orçamentos sem follow-up', 'Faltas na agenda', 'Base inativa (não recompra)', 'Mídia paga desperdiçada', 'Equipe sobrecarregada com perguntas repetidas', 'Ferramentas desconectadas/retrabalho', 'Risco de número/bloqueio', 'Processo diferente/precisa adaptar (hiperpersonalização)'] };
export const requirements: Q[] = [
 { id:'decisor', label:'Quem decide?', options:['Eu mesmo/decisor presente','Decisor presente na sala','Decisor não está','Comitê/sócio','Não sabe'] },
 { id:'prazo', label:'Quando quer resolver?', options:['Agora/esta semana','Até 30 dias','60–90 dias','Sem prazo','Não sabe'] },
 { id:'meta90', label:'Em 90 dias, o que precisa acontecer?', options:['Recuperar contatos','Aumentar vendas','Reduzir faltas/custo','Organizar a equipe','Outro','Não sabe'], otherText:true },
 { id:'cnpj', label:'Tem CNPJ?', options:['Sim','Não','Não sabe'] },
 { id:'site', label:'Tem site?', options:['Sim','Não','Não sabe'] },
 { id:'unidade', label:'Unidade nova ou já sofreu bloqueio?', options:['Unidade nova','Já sofreu bloqueio','Nenhum','Não sabe'] },
 { id:'sistemas', label:'Sistemas que usa hoje', options:['CRM','ERP','Agenda','Planilha','Sistema próprio','Nenhum','Outro','Não sabe'], multi:true, otherText:true },
];
export const tickets = ['Até R$100','R$101–500','R$501–1.000','R$1.001–5.000','Acima de R$5.000','Não sabe'];
export const slots = ['Até R$100','R$101–300','Acima de R$300','Não sabe'];
const ranges = ['Até 5','6 a 20','21 a 50','Mais de 50'];
export const levers: Q[] = [
 {id:'al1',label:'Quantos contatos perdem por mês?',options:[...ranges,'Não sabe']},
 {id:'al2',label:'Quantos orçamentos ficam sem follow-up por mês?',options:[...ranges,'Não sabe']},
 {id:'al3',label:'Quantas faltas na agenda por mês?',options:[...ranges,'Não vivo de agenda','Não sabe']},
 {id:'al4',label:'Quantos retornos ou recompras por mês?',options:[...ranges,'Não tenho base','Não sabe']},
 {id:'al5',label:'Quanto investem em mídia paga por mês?',options:['Não anuncio','Até R$1.000','R$1.001–5.000','Acima de R$5.000','Não sabe']},
 {id:'al6',label:'Quantas horas por dia em perguntas repetidas?',options:['Até 1h','1–3h','3–5h','Mais de 5h','Não sabe']},
 {id:'al7',label:'Quanto gastam nas ferramentas substituídas por mês?',options:['Nada','Até R$300','R$301–1.000','Acima de R$1.000','Não sabe']},
 {id:'al8',label:'Já tiveram problemas com o número?',options:['Não','Já perdemos histórico','Já tivemos bloqueio','Os dois','Não sabe']},
];
export const leverNames = ['Leads perdidos fora do horário/demora','Orçamentos sem follow-up','Faltas na agenda','Reativação/recompra','Mídia paga','Capacidade da equipe','Ferramentas substituídas','Risco de número'];
function pick(a: Answers, key: string, options: string[], values: number[]) {
 if(a[key]===OPEN) {const text=answerText(a,key);return typeof text==='string'?parseOpenNumber(text):null;}
 if(isUnknown(a,key))return null;
 const value = a[key];
 const i = typeof value === 'string' ? options.indexOf(value) : -1;
 return i < 0 ? null : values[i] ?? null;
}
function product(x: number | null, y: number | null, rate = 1) { return x === 0 || y === 0 ? 0 : x === null || y === null ? null : Math.round(x * rate * y * 100) / 100; }
export function numeric(a: Answers, k: string) {
 const v = answerText(a,k); if (typeof v !== 'string' || !v.trim()) return null;
 if(a[k]===OPEN)return parseOpenNumber(v);
 const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null;
}
const countValues = [3,13,35,70,0];
const rangeOptions = (key: string) => [...ranges, key === 'al3' ? 'Não vivo de agenda' : 'Não tenho base', 'Não sabe'];
/** Chave da resposta que alimenta cada alavanca: núcleo + módulo do nicho; sem nicho, os campos antigos (fichas legadas). */
export function leverKeys(a: Answers): (string | null)[] {
 const n = nichoOf(a); const src = n ? leverSource[n] : null;
 return ['al1', src ? src[2] ?? null : 'al2', src ? src[3] ?? null : 'al3', src ? src[4] ?? null : 'al4', 'al5', 'E', 'al7', 'al8'];
}
export function calculate(a: Answers) {
 const ticket = pick(a,'ticket',tickets,[50,300,750,3000,7000]);
 const horario = pick(a,'horario',slots,[75,200,400]);
 const keys = leverKeys(a);
 // Alavanca sem pergunta no nicho escolhido não se aplica: vale 0 (não é "a confirmar").
 const counts = [0,1,2,3].map(i => { const k = keys[i]; return k === null ? 0 : pick(a, k ?? '', rangeOptions(k ?? ''), countValues); });
 const valores = [product(counts[0] ?? null,ticket,.3),product(counts[1] ?? null,ticket,.3),product(counts[2] ?? null,horario,.5),product(counts[3] ?? null,ticket),null,null,pick(a,'al7',levers[6]?.options ?? [],[0,150,650,1500]),null];
 const ganho = valores.reduce<number>((s,v) => s + (v ?? 0),0);
 // Preço nunca é digitado: sai do motor de preços pelo nº de atendentes e plano.
 const usuarios = defaultUsers(a); const plano = chosenPlan(a); const pv = planValues(usuarios, plano);
 const usuariosConfirmar = !(Number(a['usuarios']) >= 2) && (isUnknown(a,'E') || (a['E']===OPEN && parseOpenNumber(String(answerText(a,'E')))===null));
 const mensalidade: number | null = pv.mensal; const implantacao: number | null = pv.implantacao;
 const multiplo = mensalidade !== null && mensalidade > 0 && ganho > 0 ? ganho / mensalidade : null;
 const payback = mensalidade !== null && implantacao !== null && ganho > 0 ? (implantacao + mensalidade) / (ganho / 30) : null;
 const formulas = leverFormulas(counts, ticket, horario, valores).map((f,i) => i > 0 && i < 4 && keys[i] === null ? 'Não se aplica a este nicho' : f);
 // Capacidade: ~1 h/dia devolvida por atendente (ponto médio da equipe). Fichas antigas usam a pergunta de horas.
 const pessoas = pick(a,'E',['1','2 a 3','4 a 6','7 a 10','Mais de 10'],[1,2.5,5,8.5,12]);
 const horas = pessoas ?? pick(a,'al6',levers[5]?.options ?? [],[1,2,4,6]);
 return { ganho, prudente: ganho / 3, multiplo, payback, ticket, horario, mensalidade: mensalidade as number | null, implantacao: implantacao as number | null, ...({ usuarios, plano, usuariosConfirmar } as { usuarios?: number; plano?: string; usuariosConfirmar?: boolean }), parcial: [0,1,2,3,6].some(i => valores[i] === null), alavancas: leverNames.map((nome,i) => { const k = keys[i] ?? null; return {nome, resposta: k ? answerText(a,k) : 'Não se aplica a este nicho', estado: k === null ? 'informado' : isUnknown(a,k)||(a[k]===OPEN&&parseOpenNumber(String(answerText(a,k)))===null)?'não informado':'informado', valor: valores[i] ?? null, soma:[0,1,2,3,6].includes(i), conta: formulas[i] ?? ''}; }), midia:pick(a,'al5',levers[4]?.options ?? [],[0,1000,3000,7000]), horas };
}
const qty = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
/** A conta que gerou cada alavanca, em palavras (mesmas taxas do cálculo). */
function leverFormulas(c: (number | null)[], ticket: number | null, horario: number | null, v: (number | null)[]): string[] {
 const tail = (i: number) => v[i] === null ? '' : ` = ${money(v[i] ?? 0)}/mês`;
 const need = (parts: [number | null, string][]) => { const miss = parts.filter(([x]) => x === null).map(([, l]) => l); return miss.length ? `A confirmar: falta ${miss.join(' e ')}` : null; };
 const f0 = need([[c[0] ?? null, 'nº de contatos perdidos'], [ticket, 'ticket médio']]) ?? `${qty(c[0] ?? 0)} contatos/mês × 30% recuperável × ${money(ticket)} de ticket${tail(0)}`;
 const f1 = need([[c[1] ?? null, 'nº de orçamentos'], [ticket, 'ticket médio']]) ?? `${qty(c[1] ?? 0)} orçamentos/mês × 30% recuperável × ${money(ticket)} de ticket${tail(1)}`;
 const f2 = need([[c[2] ?? null, 'nº de faltas'], [horario, 'valor do horário']]) ?? `${qty(c[2] ?? 0)} faltas/mês × 50% recuperável × ${money(horario)} por horário${tail(2)}`;
 const f3 = need([[c[3] ?? null, 'nº de retornos'], [ticket, 'ticket médio']]) ?? `${qty(c[3] ?? 0)} retornos/mês × ${money(ticket)} de ticket${tail(3)}`;
 const f6 = v[6] === null ? 'A confirmar: falta o gasto com ferramentas' : `Ferramentas que o Kentro substitui${tail(6)}`;
 return [f0, f1, f2, f3, '', '', f6, ''];
}
export type Account = ReturnType<typeof calculate>;
export type Ficha = { id:string; created_at:string; closer_nome:string; cliente_nome:string; segmento:string; cidade:string; respostas:Answers; conta:Account; pacote_closer:string; proposta_cliente:string };
export const fichaSchema = z.object({id:z.string().uuid(),created_at:z.string(),closer_nome:z.string(),cliente_nome:z.string(),segmento:z.string(),cidade:z.string(),transcricao:z.string().default(''),respostas:answerSchema,conta:z.object({ganho:z.number(),prudente:z.number(),multiplo:z.number().nullable(),payback:z.number().nullable(),ticket:z.number().nullable(),horario:z.number().nullable(),mensalidade:z.number().nullable(),implantacao:z.number().nullable(),parcial:z.boolean(),alavancas:z.array(z.object({nome:z.string(),resposta:z.union([z.string(),z.array(z.string())]),estado:z.string().optional(),valor:z.number().nullable(),soma:z.boolean(),conta:z.string().optional()})),midia:z.number().nullable(),horas:z.number().nullable()}),pacote_closer:z.string(),proposta_cliente:z.string()});
export const money = (n: number | null) => n === null ? '—' : n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const decimal = (n:number | null) => n === null ? '—' : n.toLocaleString('pt-BR',{maximumFractionDigits:1});
export const SEPARATOR = '=== PROPOSTA PARA O CLIENTE ===';
export function splitOutput(text:string) {
 const i=text.indexOf(SEPARATOR); if(i<0) throw new Error('A IA não retornou os dois blocos esperados.');
 const pacote_closer=text.slice(0,i).trim(); const proposta_cliente=text.slice(i+SEPARATOR.length).trim();
 if(!pacote_closer || !proposta_cliente) throw new Error('A IA retornou um dos blocos vazio.');
 return {pacote_closer,proposta_cliente};
}