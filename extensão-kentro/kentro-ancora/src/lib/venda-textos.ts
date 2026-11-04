// Pacote do closer e proposta do cliente, montados a partir da ficha, sem IA.
// As regras comerciais estão aqui: revise este arquivo quando preços, janelas ou argumentos mudarem.
// Princípio: só usar número informado ou calculado; o que faltar sai como "a confirmar".
import { answerText, isUnknown } from './answer-state';
import { PLANS, chosenPlan, closingBullets, clientFacts, defaultUsers, planValues } from './anchoring';
import { computePlans } from './pricing';
import { money, type Account } from './ancora';
import { NEXT_STEP } from './report';
import type { Answers } from './ficha';

const VALIDADE = '3 dias úteis';
const MULTIPLO_SAUDAVEL = 5;

/** Texto de uma resposta em uma linha; vazio se não foi informada. */
function texto(a: Answers, id: string): string {
  if (isUnknown(a, id)) return '';
  const v = answerText(a, id);
  return (Array.isArray(v) ? v.join(', ') : v).replace(/\s+/g, ' ').trim();
}
function lista(a: Answers, id: string): string[] {
  if (isUnknown(a, id)) return [];
  const v = answerText(a, id);
  return Array.isArray(v) ? v : [v];
}
const ou = (valor: string, reserva = 'a confirmar') => valor || reserva;
const reais = (n: number | null) => (n === null ? 'a confirmar' : money(n));

/** O que a Kentro faz por cada dor confirmada. Dor digitada à mão aparece sem funcionalidade. */
const SOLUCAO_DA_DOR: Record<string, string> = {
  'Leads perdidos fora do horário/por demora': 'Atendimento 24h com IA Kentro e resposta imediata no WhatsApp.',
  'Orçamentos sem follow-up': 'Follow-up automático com cadência e lembretes no CRM.',
  'Faltas na agenda': 'Confirmação e lembrete automáticos antes do horário.',
  'Base inativa (não recompra)': 'Campanhas de reativação segmentadas para a base.',
  'Mídia paga desperdiçada': 'Todo contato atendido e registrado no CRM, com funis para acompanhar cada oportunidade.',
  'Equipe sobrecarregada com perguntas repetidas': 'Automações e assistentes de IA para responder as perguntas repetidas.',
  'Ferramentas desconectadas/retrabalho': 'Tudo numa plataforma só: CRM, chat, agenda e disparos.',
  'Risco de número/bloqueio': 'WhatsApp API Oficial, com o histórico da empresa preservado na plataforma.',
  'Processo diferente/precisa adaptar (hiperpersonalização)': 'Extensões sob medida dentro da plataforma, integradas via MCP.',
};
const HIPERPERSONALIZACAO = 'Processo diferente/precisa adaptar (hiperpersonalização)';

const ADDONS: Record<string, string> = {
  'PABX Kentro': 'R$ 199,90 por mês + R$ 9,90 por ramal (ex.: 10 ramais = R$ 298,90). A API oficial pode cair no PABX; VoIP de qualquer operadora.',
  'IA Kentro': 'o cliente monta: + R$ 300/mês; simples (o closer fecha): R$ 2.000 + R$ 600/mês; complexa: R$ 600/mês + R$ 2 a 15 mil, com reunião de escopo. Prazos: 10 dias para criar + 30 de testes internos + 30 de testes externos.',
  '2Blick': 'somente disparo (2Blick Start sem implantação). É o único produto para disparo.',
};

interface Precos {
  plano: string;
  usuarios: string;
  anual: number;
  mensal: number;
  implantacao: number;
  implantacaoTexto: string;
  apoio: string;
  mentoria: string;
}
function precosDe(a: Answers, conta: Account): Precos {
  const nome = chosenPlan(a);
  const quantidade = defaultUsers(a);
  const v = planValues(quantidade, nome);
  const info = PLANS.find((p) => p.name === nome);
  return {
    plano: nome,
    usuarios: `${quantidade} usuários${conta.usuariosConfirmar ? ' (a confirmar)' : ''}`,
    anual: v.anual,
    mensal: v.mensal,
    implantacao: v.implantacao,
    implantacaoTexto: v.implantacao > 0 ? money(v.implantacao) : 'grátis',
    apoio: info?.apoio ?? '',
    mentoria: info?.key === 'clevel' ? computePlans(quantidade).clevel.mentoriaAvista : '',
  };
}

function objecoes(a: Answers, conta: Account, p: Precos): string[] {
  const temConta = conta.prudente > 0;
  const saida = [
    temConta
      ? `**"Está caro."** A mensalidade é ${money(p.mensal)}. Pela conta do próprio cliente, mesmo no cenário conservador escapam ${money(conta.prudente)} por mês. A pergunta é quanto custa continuar como está.`
      : '**"Está caro."** Sem a conta fechada o preço fica solto. Volte às alavancas a confirmar antes de discutir valor.',
    '**"Preciso pensar."** Pergunte o que falta para decidir: o número, o plano ou o prazo. Trate esse ponto na hora; não encerre sem o próximo passo marcado.',
    '**"Quanto custa cada mensagem?"** O cliente paga as mensagens direto para a Meta, a preço de custo, sem margem da Kentro. Não cite tarifa de cabeça.',
  ];
  if (['Decisor não está', 'Comitê/sócio'].includes(texto(a, 'decisor'))) {
    saida.push(`**"Preciso falar com o sócio."** O decisor não está na reunião (${texto(a, 'decisor')}). Marque a conversa com ele já com data e leve o relatório de decisão com a conta.`);
  }
  if (['Sem prazo', '60–90 dias'].includes(texto(a, 'prazo')) && temConta) {
    saida.push(`**"Não é o momento."** O prazo indicado foi "${texto(a, 'prazo')}". Em 3 meses de espera, a conta conservadora soma ${money(conta.prudente * 3)} que continuam escapando.`);
  }
  const ferramentas = texto(a, 'al7');
  if (ferramentas && ferramentas !== 'Nada') {
    saida.push(`**"Já pago outras ferramentas."** O gasto atual (${ferramentas}) já entrou na conta como economia, porque a Kentro reúne CRM, chat, agenda e disparos.`);
  }
  if (['Já tivemos bloqueio', 'Celular pessoal', 'Os dois'].includes(texto(a, 'al8'))) {
    saida.push(`**"E o número?"** Hoje: ${texto(a, 'al8').toLowerCase()}. Com a API Oficial, o histórico fica com a empresa. Decida isso antes de o próximo bloqueio decidir por vocês.`);
  }
  if (p.plano === 'Social Pro') saida.push('**"Não temos tempo para implantar."** No Social Pro a implantação é a quatro mãos, com suporte premium.');
  return saida;
}

function montarPacote(a: Answers, conta: Account, p: Precos): string {
  const cliente = ou(texto(a, 'cliente_nome'));
  const dores = lista(a, 'dores');
  const dorLiteral = texto(a, 'dor');
  const fatos = clientFacts(a);
  const somam = conta.alavancas.filter((l) => l.soma && l.conta !== 'Não se aplica a este nicho');
  const addons = lista(a, 'addons');
  const b: string[] = [];

  b.push(`# Pacote do closer · ${cliente}`, '', '_Uso interno. Não envie este texto ao cliente._', '');

  b.push('## 1. Ficha de diagnóstico', '');
  b.push(`- **Nicho:** ${ou(texto(a, 'nicho'))}`, `- **Cidade:** ${ou(texto(a, 'cidade'))}`, `- **Quem decide:** ${ou(texto(a, 'decisor'))}`, `- **Prazo:** ${ou(texto(a, 'prazo'))}`, `- **Meta em 90 dias:** ${ou(texto(a, 'meta90'))}`, '');
  if (fatos.length) b.push('**O que o cliente contou:**', '', ...fatos.map((f) => `- ${f}`), '');
  b.push(dores.length ? '**Dores confirmadas:**' : '**Dores confirmadas:** a confirmar.', '', ...dores.map((d) => `- ${d}`), '');
  b.push(dorLiteral ? `**Frase literal da dor:** "${dorLiteral}"` : '**Frase literal da dor:** a confirmar.', '');

  b.push('## 2. A conta', '');
  b.push(...somam.map((l) => `- **${l.nome}:** ${l.valor === null ? 'a confirmar' : `${money(l.valor)}/mês`}${l.conta ? ` (${l.conta})` : ''}`), '');
  b.push(`- **Ganho mensal:** ${conta.ganho > 0 ? money(conta.ganho) : 'a confirmar'}`);
  b.push(`- **Cenário prudente (ganho ÷ 3):** ${conta.prudente > 0 ? money(conta.prudente) : 'a confirmar'}`);
  b.push(`- **Múltiplo (ganho ÷ mensalidade):** ${conta.multiplo === null ? 'a confirmar' : `${conta.multiplo.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}×`}`);
  b.push(`- **Payback:** ${conta.payback === null ? 'a confirmar' : `${Math.round(conta.payback)} dias`}`, '');
  if (conta.parcial) b.push('Conta parcial: as alavancas a confirmar ainda não entraram na soma.', '');
  if (conta.multiplo !== null && conta.multiplo < MULTIPLO_SAUDAVEL) {
    b.push(`> **Atenção: múltiplo abaixo de ${MULTIPLO_SAUDAVEL}×.** Faltou alavanca no diagnóstico ou o plano está grande demais. Volte ao SPIN ou avalie outro produto.`, '');
  }
  const reforcos = [
    conta.midia !== null && conta.midia > 0 ? `Mídia paga: ${texto(a, 'al5')} por mês.` : '',
    texto(a, 'E') ? `Capacidade da equipe: ${texto(a, 'E')} atendendo hoje.` : '',
    texto(a, 'al8') && texto(a, 'al8') !== 'Não' ? `Risco de número: ${texto(a, 'al8').toLowerCase()}.` : '',
  ].filter(Boolean);
  if (reforcos.length) b.push('**Reforços (não entram na soma):**', '', ...reforcos.map((r) => `- ${r}`), '');

  b.push('## 3. Plano e produtos', '');
  b.push(`**${p.plano}** · ${p.usuarios}. ${p.apoio}`, '');
  if (dores.length) b.push('**Como cada dor é resolvida:**', '', ...dores.map((d) => `- **${d}:** ${SOLUCAO_DA_DOR[d] ?? 'definir a funcionalidade com o cliente.'}`), '');
  if (addons.length) b.push('**Add-ons:**', '', ...addons.map((x) => `- **${x}:** ${ADDONS[x] ?? 'a confirmar.'}`), '');
  if (dores.includes(HIPERPERSONALIZACAO)) {
    b.push('**Hiperpersonalização:** a Kentro constrói pequenos sistemas como extensões dentro da plataforma, integrados via MCP. Venda a possibilidade; o técnico define o escopo em reunião de escopo.', '');
  }

  b.push('## 4. Preço ancorado', '', 'Comece pela opção anual.', '');
  b.push(`1. **Anual:** ${money(p.anual)}/mês`, `2. **Mensal:** ${money(p.mensal)}/mês`, '', `**Implantação:** ${p.implantacaoTexto}.${p.mentoria ? ` **Mentoria:** ${p.mentoria}.` : ''}`, '');

  const alternativaEquipe = texto(a, 'S');
  b.push('## 5. Script de revelação', '');
  b.push(temGanho(conta)
    ? `1. **A conta:** "Pelos números que você me passou, escapam ${money(conta.ganho)} por mês. Sendo bem conservador, ${money(conta.prudente)}."`
    : '1. **A conta:** complete os números a confirmar antes de revelar o preço.');
  b.push(alternativaEquipe
    ? `2. **A alternativa:** "Dá para organizar por conta própria ou contratar mais gente: cada pessoa custa ${alternativaEquipe} por mês, com encargos."`
    : '2. **A alternativa:** "Dá para organizar por conta própria ou contratar mais gente. Vamos ver o que isso custaria."');
  b.push(`3. **O plano:** "O ${p.plano} resolve o que você me contou." Apresente o plano logo acima do que resolveria.`);
  b.push(`4. **O preço:** diga o preço inteiro, começando pelo anual: ${money(p.anual)}/mês, ou ${money(p.mensal)}/mês no mensal. O cliente faz a conta; você organiza e fecha.`, '');

  b.push('## 6. Objeções prováveis', '', ...objecoes(a, conta, p).map((o) => `- ${o}`), '');

  b.push('## 7. Próximos passos e fechamento', '');
  b.push(`- **Próximo passo:** ${NEXT_STEP}.`, '- **Fidelidade:** 1, 3, 6 ou 12 meses, definida com o cliente.', '- **Forma de pagamento:** a definir com o cliente.', '- **Origem no CRM:** Indicação Comercial.', '');
  b.push('**Janelas de negociação (nunca prometa fora delas):**', '');
  b.push('- Até 24 h do fim da reunião: 50% de bônus na implantação.', '- Após 24 h: implantação cheia; até 50% de desconto na 1ª mensalidade, a seu critério.', '- Fora desses prazos: sem desconto; só com a diretoria.', '- Nunca desconto recorrente. A condição não vai escrita na proposta. "Fecho se..." vira condicional, com o cliente participando de todo o processo.', '');
  if (addons.includes('IA Kentro')) b.push('**Garantia:** existe somente na IA Kentro e só vale se o cliente participou dos testes internos, a falha ocorreu apenas nos testes externos e ele cumpriu as tarefas no prazo.', '');

  b.push('**Resumo para o WhatsApp:**', '');
  const ganhoCurto = temGanho(conta) ? ` Pela nossa conta, mesmo sendo conservador, são ${money(conta.prudente)} por mês que hoje escapam.` : '';
  b.push(`> Olá! Foi ótimo conversar sobre a ${cliente}.${ganhoCurto} O plano é o ${p.plano} (${p.usuarios}): ${money(p.anual)}/mês no anual ou ${money(p.mensal)}/mês no mensal. Próximo passo: ${NEXT_STEP}. Posso seguir?`);
  return b.join('\n').trim();
}

const temGanho = (conta: Account) => conta.ganho > 0;

/** Vai ao cliente: sem fórmulas, sem margem e sem as condições de negociação. */
function montarProposta(a: Answers, conta: Account, p: Precos, vendedor: string): string {
  const empresa = texto(a, 'cliente_nome');
  const dores = lista(a, 'dores');
  const dorLiteral = texto(a, 'dor');
  const addons = lista(a, 'addons');
  const b: string[] = [];

  b.push(`# Proposta Kentro${empresa ? ` para ${empresa}` : ''}`, '');
  b.push(`Olá${empresa ? `, equipe ${empresa}` : ''}! Obrigado pela conversa. Abaixo está o que entendemos da sua operação e como a Kentro pode ajudar.`, '');

  b.push('## O que entendemos', '');
  if (dorLiteral) b.push(`Nas suas palavras: "${dorLiteral}"`, '');
  if (dores.length) b.push(...dores.map((d) => `- ${d.replace(/ \(hiperpersonalização\)$/, '')}`), '');
  if (!dorLiteral && !dores.length) b.push('Os pontos principais serão confirmados com você antes de seguirmos.', '');

  b.push('## O ganho estimado', '');
  b.push(temGanho(conta)
    ? `Com os números que você nos passou, estimamos de forma conservadora **${money(conta.prudente)} por mês** que hoje escapam e que podem ser recuperados.`
    : 'O ganho estimado será confirmado com os números que faltam da sua operação.', '');

  b.push('## O plano recomendado', '');
  b.push(`**${p.plano}** · ${p.usuarios}. ${p.apoio}`, '');
  const solucoes = dores.filter((d) => SOLUCAO_DA_DOR[d]);
  if (solucoes.length) b.push('O que ele resolve:', '', ...solucoes.map((d) => `- ${SOLUCAO_DA_DOR[d]}`), '');
  if (addons.length) b.push(`Também incluímos na conversa: ${addons.join(', ')}.`, '');

  b.push('## Investimento', '');
  b.push(`1. **Anual:** ${reais(p.anual)}/mês`, `2. **Mensal:** ${reais(p.mensal)}/mês`, '', `Implantação: ${p.implantacaoTexto}.${p.mentoria ? ` Mentoria: ${p.mentoria}.` : ''}`, '');
  b.push('As mensagens do WhatsApp são pagas direto para a Meta, a preço de custo, sem margem da Kentro.', '');
  if (addons.includes('IA Kentro')) {
    b.push('**Garantia da IA Kentro:** vale quando vocês participam dos testes internos, cumprem as tarefas no prazo e a falha ocorre apenas nos testes externos.', '');
  }

  // Na proposta o número de referência é o conservador; a comparação com o ganho cheio fica de fora.
  const motivos = closingBullets(a, conta).filter((m) => !m.startsWith('O ganho estimado'));
  if (motivos.length) b.push('## Por que decidir agora', '', ...motivos.map((m) => `- ${m}`), '');

  b.push('## Próximo passo', '');
  b.push(`Vamos decidir agora? Responda com a opção escolhida (anual ou mensal) e seguimos com ${NEXT_STEP}. Esta proposta vale por ${VALIDADE}.`, '');
  b.push(`${vendedor || 'Equipe Kentro'}, Kentro`);
  return b.join('\n').trim();
}

export function gerarTextosVenda(a: Answers, conta: Account, vendedor: string): { pacote_closer: string; proposta_cliente: string } {
  const precos = precosDe(a, conta);
  return { pacote_closer: montarPacote(a, conta, precos), proposta_cliente: montarProposta(a, conta, precos, vendedor) };
}
