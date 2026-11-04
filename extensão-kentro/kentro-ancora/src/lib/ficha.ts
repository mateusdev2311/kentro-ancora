export type Q = { id: string; label: string; options: string[]; help?: string; multi?: boolean; otherText?: boolean };
export type Block = { title: string; groups: { title?: string; questions: Q[] }[]; freeText?: { id: string; label: string } };

const NS = "Não sabe";
export const blocks: Block[] = [
  {
    title: "Os números do negócio",
    groups: [
      { title: "1. Contatos novos por mês (L)", questions: [{ id: "L", label: "Somando todos os canais, quantos contatos novos chegam por mês?", options: ["Até 50", "51 a 150", "151 a 400", "401 a 1.000", "Mais de 1.000", NS], help: "Se não souber: num dia normal, quantos? Multiplique por 22 dias úteis." }] },
      { title: "2. Parcela fora do horário (F)", questions: [{ id: "F", label: "De cada 10 contatos, quantos chegam à noite ou no fim de semana?", options: ["1 de 10 ou menos", "2 a 3 de 10", "4 a 5 de 10", "Mais de 5 de 10", NS] }] },
      { title: "3. Desistência sem resposta rápida (D)", questions: [{ id: "D", label: "De cada 10 que chamam fora do horário, quantos ainda respondem quando vocês retornam?", options: ["Quase todos (8 a 10)", "Metade (4 a 6)", "Poucos (1 a 3)", "Ninguém", NS] }] },
      { title: "4. Conversão atual (C)", questions: [{ id: "C", label: "De cada 10 contatos bem atendidos, quantos fecham?", options: ["1 de 10 ou menos", "2 a 3 de 10", "4 a 5 de 10", "Mais de 5 de 10", NS] }] },
      { title: "5. Ticket médio (T)", questions: [{ id: "T", label: "Quanto vale uma venda, em média (consulta, matrícula, pedido)?", options: ["Até R$ 100", "R$ 101 a R$ 500", "R$ 501 a R$ 1.000", "R$ 1.001 a R$ 5.000", "Acima de R$ 5.000", NS] }] },
      { title: "6. Permanência ou recompra (P)", questions: [{ id: "P", label: "Quanto tempo o cliente fica com vocês, ou quantas vezes compra por ano?", options: ["Compra uma vez", "Mais de 1 vez por ano", "Mensal ou contrato recorrente", NS] }] },
      { title: "7. Orçamentos sem fechamento (O)", questions: [{ id: "O", label: "Quantos orçamentos vocês mandam por mês e quantos fecham?", options: ["Não envio orçamentos", "Até 20 por mês", "21 a 100 por mês", "Mais de 100 por mês", NS] }] },
      { title: "8. Agendamentos e faltas (A/N)", questions: [
        { id: "A", label: "Quantos agendamentos por mês, e quantos faltam sem avisar?", options: ["Não vivo de agenda", "Até 50 por mês", "51 a 200 por mês", "Mais de 200 por mês", NS] },
        { id: "N", label: "De cada 10 agendados, quantos faltam?", options: ["1 ou menos", "2 a 3", "4 ou mais", NS] }] },
      { title: "9. Atendentes (E/S)", questions: [
        { id: "E", label: "Quantas pessoas atendem hoje?", options: ["1", "2 a 3", "4 a 6", "7 a 10", "Mais de 10", NS] },
        { id: "S", label: "Quanto custa cada uma, com encargos?", options: ["Até R$ 2.500", "R$ 2.501 a R$ 4.000", "R$ 4.001 a R$ 6.000", "Acima de R$ 6.000", NS] }] },
      { title: "10. Tempo em perguntas repetidas (R)", questions: [{ id: "R", label: "Quanto do dia da equipe vai em perguntas repetidas (preço, horário, endereço, convênio)?", options: ["Até 10%", "11 a 30%", "31 a 50%", "Mais de 50%", NS] }] },
      { title: "11. Base inativa (B)", questions: [{ id: "B", label: "Quantos clientes não compram há mais de 6 meses?", options: ["Não tenho base", "Até 500", "501 a 2.000", "Mais de 2.000", NS] }] },
      { title: "12. Anúncios e ferramentas (M/X)", questions: [
        { id: "M", label: "Quanto investem por mês em anúncios?", options: ["Não anuncio", "Até R$ 1.000", "R$ 1.001 a R$ 5.000", "Acima de R$ 5.000", NS] },
        { id: "X", label: "Quanto pagam hoje, por mês, em chatbot, disparo, CRM e telefonia (somado)?", options: ["Nada", "Até R$ 300", "R$ 301 a R$ 1.000", "Acima de R$ 1.000", NS] }] },
    ],
  },
  {
    title: "Decisão e prazo",
    groups: [{ questions: [
      { id: "decisor", label: "Quem decide a contratação?", options: ["Eu mesmo (decisor presente)", "Decisor presente na sala", "Decisor não está na reunião", "Decisão em comitê ou sócio", NS] },
      { id: "prazo", label: "Quando quer resolver?", options: ["Agora (esta semana)", "Em até 30 dias", "Em 60 a 90 dias", "Sem prazo definido", NS] },
      { id: "meta90", label: "Em 90 dias, o que precisa acontecer para valer a pena?", options: ["Recuperar contatos perdidos", "Aumentar vendas", "Reduzir faltas ou custo", "Organizar a equipe", "Outro (escrever)", NS], otherText: true },
    ] }],
    freeText: { id: "dor", label: "Frase literal da dor principal (como o cliente disse)" },
  },
  {
    title: "Requisitos e contexto",
    groups: [{ questions: [
      { id: "cnpj", label: "Tem CNPJ?", options: ["Sim", "Não", NS] },
      { id: "site", label: "Tem site?", options: ["Sim", "Não", NS] },
      { id: "unidade", label: "Está abrindo unidade nova ou já sofreu bloqueio de número?", options: ["Unidade nova", "Já sofreu bloqueio", "Nenhum dos dois", NS] },
      { id: "sistemas", label: "Quais sistemas a operação usa hoje?", options: ["CRM", "ERP", "Agenda", "Planilha", "Sistema próprio", "Nenhum", "Outro (escrever)", NS], multi: true, otherText: true },
    ] }],
  },
];

export type Answers = Record<string, string | string[]>;

export function fmt(v: string | string[] | undefined, other?: string) {
  const arr = Array.isArray(v) ? v : v ? [v] : [];
  if (!arr.length) return "—";
  return arr.map((x) => (x.startsWith("Outro") ? `Outro: ${other || "—"}` : x)).join(", ");
}

export function buildSummary(a: Answers): string {
  const lines = ["KENTRO · Ficha de Captura", ""];
  blocks.forEach((b, i) => {
    lines.push(`${i + 1}. ${b.title.toUpperCase()}`);
    b.groups.forEach((g) => g.questions.forEach((q) => {
      const prefix = i === 0 ? `${q.id}` : q.label;
      lines.push(`- ${prefix}${i === 0 ? ` (${q.label})` : ""}: ${fmt(a[q.id], a[q.id + "_outro"] as string)}`);
    }));
    if (b.freeText) lines.push(`- ${b.freeText.label}: ${(a[b.freeText.id] as string) || "—"}`);
    lines.push("");
  });
  return lines.join("\n").trim();
}
