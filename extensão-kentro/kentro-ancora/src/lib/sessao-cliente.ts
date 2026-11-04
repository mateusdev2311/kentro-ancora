// Sessão no navegador. Não usa cookie: dentro do quadro da Kentro, cookie de outro site costuma ser bloqueado.
// A memória cobre o caso de o armazenamento também estar bloqueado.
const CHAVE_TOKEN = 'ancora-sessao';
const CHAVE_CONTEXTO = 'ancora-contexto';
let tokenEmMemoria: string | null = null;
let contextoEmMemoria: string | null = null;

function ler(chave: string): string | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(chave);
  } catch {
    return null;
  }
}
function gravar(chave: string, valor: string | null): void {
  try {
    if (valor === null) sessionStorage.removeItem(chave);
    else sessionStorage.setItem(chave, valor);
  } catch {
    /* sem armazenamento: fica só na memória */
  }
}

export const lerToken = (): string | null => tokenEmMemoria ?? ler(CHAVE_TOKEN);
export function gravarToken(token: string): void {
  tokenEmMemoria = token;
  gravar(CHAVE_TOKEN, token);
}

/** Dados do contato vindos do cartão do atendimento, para preencher uma ficha nova. */
export function gravarContexto(contexto: { contato_nome?: string | undefined }): void {
  contextoEmMemoria = JSON.stringify(contexto);
  gravar(CHAVE_CONTEXTO, contextoEmMemoria);
}
export function consumirContexto(): { contato_nome?: string } {
  const valor = contextoEmMemoria ?? ler(CHAVE_CONTEXTO);
  contextoEmMemoria = null;
  gravar(CHAVE_CONTEXTO, null);
  try {
    return valor ? (JSON.parse(valor) as { contato_nome?: string }) : {};
  } catch {
    return {};
  }
}
