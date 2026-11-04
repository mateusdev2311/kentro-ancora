import type { Q } from './ficha';
import { pains, segments } from './ancora';
import { allNichoQuestions, coreQuestions, nichoQuestion, qualification } from './diagnostico';

/** Todas as perguntas da ficha, para exibir as respostas na ficha salva. */
export const allQuestions: Q[] = [
  { id: 'cliente_nome', label: 'Nome do cliente/empresa', options: [] },
  { id: 'segmento', label: 'Segmento', options: segments },
  { id: 'cidade', label: 'Cidade/UF', options: [] },
  { id: 'closer_nome', label: 'Nome do closer', options: [] },
  { id: 'estudo', label: 'Ficha de pré-reunião / estudo do cliente', options: [] },
  nichoQuestion,
  ...coreQuestions,
  ...allNichoQuestions,
  pains,
  { id: 'dor', label: 'Frase literal da dor principal (como o cliente disse)', options: [] },
  ...qualification,
  { id: 'mensalidade', label: 'Mensalidade do plano (R$)', options: [] },
  { id: 'implantacao', label: 'Implantação (R$)', options: [] },
  { id: 'produto', label: 'Produto principal', options: ['Social Pro', 'Start', 'Excelência Pro', 'C-Level'] },
  { id: 'addons', label: 'Add-ons', multi: true, options: ['PABX Kentro', 'IA Kentro', '2Blick'] },
];
