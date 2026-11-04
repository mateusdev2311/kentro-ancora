const hosts=new Set(['docs.google.com','drive.google.com','gemini.google.com','docs.googleusercontent.com']);
export function allowedTranscriptUrl(value:string):URL|null {
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&hosts.has(u.hostname)?u:null;}catch{return null;}
}