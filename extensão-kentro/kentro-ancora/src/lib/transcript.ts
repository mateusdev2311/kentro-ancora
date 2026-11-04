import { z } from 'zod';
import type { Answers, Q } from './ficha';
import { pains,segments } from './ancora';
import { allNichoQuestions,coreQuestions,nichoQuestion,qualification } from './diagnostico';
import { OPEN,UNANSWERED } from './answer-state';
export const allQuestions:Q[]=[
 {id:'cliente_nome',label:'Nome do cliente/empresa',options:[]},
 {id:'segmento',label:'Segmento',options:segments},
 {id:'cidade',label:'Cidade/UF',options:[]},
 {id:'closer_nome',label:'Nome do closer',options:[]},
 {id:'estudo',label:'Ficha de pré-reunião / estudo do cliente',options:[]},
 nichoQuestion,...coreQuestions,...allNichoQuestions,pains,
 {id:'dor',label:'Frase literal da dor principal (como o cliente disse)',options:[]},
 ...qualification,
 {id:'mensalidade',label:'Mensalidade do plano (R$)',options:[]},
 {id:'implantacao',label:'Implantação (R$)',options:[]},
 {id:'produto',label:'Produto principal',options:['Social Pro','Start','Excelência Pro','C-Level']},
 {id:'addons',label:'Add-ons',multi:true,options:['PABX Kentro','IA Kentro','2Blick']},
];
export const extractionSchema=z.record(z.union([z.string().max(30000),z.array(z.string().max(300)).max(30),z.object({aberto:z.string().max(30000)}).strict(),z.null()]));
export function applyExtraction(raw:unknown):Answers {
 const data=extractionSchema.parse(raw);const answers:Answers={};
 for(const q of allQuestions){
  const v=data[q.id];
  if(v===null||v===undefined){answers[q.id]=UNANSWERED;continue;}
  if(typeof v==='object'&&!Array.isArray(v)){
   if(!v.aberto.trim()){answers[q.id]=UNANSWERED;continue;}
   if(q.options.length){answers[q.id]=OPEN;answers[q.id+'_aberto']=v.aberto;}
   else answers[q.id]=v.aberto;
  }else if(typeof v==='string'&&q.options.includes(v)){answers[q.id]=q.multi?[v]:v;}
  else if(q.multi&&Array.isArray(v)&&v.length>0&&v.every(x=>q.options.includes(x))){answers[q.id]=v;}
  else throw new Error('A IA retornou uma opção inválida. A ficha não foi alterada.');
 }
 return answers;
}
export function generationAnswers(a:Answers) {
 return Object.fromEntries(allQuestions.map(q=>{
  const v=a[q.id];const text=v===OPEN?a[q.id+'_aberto']:v;
  const absent=!text||text===UNANSWERED||text==='Não sabe'||(Array.isArray(text)&&!text.length);
  return [q.id,{pergunta:q.label,estado:absent?'não informado':v===OPEN?'resposta aberta':'respondida',resposta:absent?null:text,complemento:a[q.id+'_outro']??null}];
 }));
}