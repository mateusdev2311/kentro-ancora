import type { Answers } from './ficha';
export const OPEN = 'Responder aberto';
export const UNANSWERED = 'Cliente não respondeu';
export function answerState(a:Answers,id:string) {
 const v=a[id];
 if(v===OPEN) return 'resposta aberta';
 if(v===UNANSWERED) return 'cliente não respondeu';
 if(!v || (Array.isArray(v)&&v.length===0)) return 'em branco';
 return 'respondida por opção';
}
export function answerText(a:Answers,id:string):string|string[] {
 const v=a[id];
 if(v===OPEN) {const text=a[id+'_aberto'];return typeof text==='string'?text:'';}
 return v??'';
}
export function isUnknown(a:Answers,id:string) {
 const v=answerText(a,id);
 return !v || (Array.isArray(v)&&v.length===0) || v===UNANSWERED || v==='Não sabe';
}
/** Accept one unambiguous nonnegative pt-BR value, not ranges, ratios or multiple quantities. */
export function parseOpenNumber(text:string):number|null {
 const s=text.trim().toLowerCase();
 if(!s || /\d\s*(?:a|até|e|–|—|-|\/|%)\s*\d|\d\s*%|(?:menos de|mais de|entre|até|acima|abaixo|não|nao|talvez)|[-−]\s*\d/.test(s))return null;
 const matches=[...s.matchAll(/\d+(?:\.\d{3})*(?:,\d+)?/g)];
 if(matches.length!==1)return null;
 const m=matches[0];if(!m)return null;
 let n=Number(m[0].replaceAll('.','').replace(',','.'));
 if(/^\s*mil\b/.test(s.slice((m.index??0)+m[0].length)))n*=1000;
 return Number.isFinite(n)&&n>=0?n:null;
}