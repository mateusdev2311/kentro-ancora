import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { banco } from './db.server';

export type Papel = 'master' | 'closer';
export interface Usuario {
  id: string;
  email: string;
  nome: string;
  role: Papel;
  ativo: boolean;
}
export interface UsuarioKentro {
  id: string | number;
  nome?: string | null | undefined;
  email?: string | null | undefined;
  tipo?: number | null | undefined;
}
export type ContextoTicket = { contato_nome?: string | undefined };

const TICKET_SEGUNDOS = 60;
const SESSAO_SEGUNDOS = 12 * 60 * 60;

const sha256 = (valor: string) => createHash('sha256').update(valor).digest();

function exigirVariavel(nome: string): string {
  const valor = process.env[nome]?.trim();
  if (!valor) throw new Error(`Falta a variável ${nome}.`);
  return valor;
}

/** Chave colada na instalação da extensão. A comparação não vaza o conteúdo pelo tempo de resposta. */
export function chaveExtensaoValida(chave: string | null | undefined): boolean {
  const esperada = process.env['CHAVE_EXTENSAO']?.trim();
  if (!esperada || !chave) return false;
  return timingSafeEqual(sha256(chave.trim()), sha256(esperada));
}

/** Administrador e supervisor da Kentro veem todas as fichas; o restante, só as próprias. */
export function papelDoTipo(tipo: number | null | undefined): Papel {
  return tipo === 0 || tipo === 1 || tipo === 98 || tipo === 99 ? 'master' : 'closer';
}

/** Cria o ticket de uso único que a extensão usa para abrir o app. Quem chega aqui já apresentou a chave. */
export async function emitirTicket(kentro: UsuarioKentro, contexto: ContextoTicket = {}): Promise<string | null> {
  const sql = await banco();
  const id = String(kentro.id);
  const [usuario] = await sql<{ ativo: boolean }[]>`
    INSERT INTO usuarios (id, nome, email, role)
    VALUES (${id}, ${(kentro.nome ?? '').slice(0, 200)}, ${(kentro.email ?? '').slice(0, 200)}, ${papelDoTipo(kentro.tipo)})
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, email = EXCLUDED.email, role = EXCLUDED.role, updated_at = now()
    RETURNING ativo`;
  if (!usuario?.ativo) return null;
  await sql`DELETE FROM tickets_acesso WHERE expira_em < now() - interval '1 day'`;
  const ticket = randomBytes(32).toString('base64url');
  await sql`
    INSERT INTO tickets_acesso (hash, usuario_id, contexto, expira_em)
    VALUES (${sha256(ticket).toString('hex')}, ${id}, ${sql.json(contexto)}, now() + make_interval(secs => ${TICKET_SEGUNDOS}))`;
  return ticket;
}

/** Troca o ticket por uma sessão. Um segundo uso, ou um ticket vencido, não devolve nada. */
export async function trocarTicket(ticket: string): Promise<{ token: string; contexto: ContextoTicket } | null> {
  const sql = await banco();
  const [linha] = await sql<{ usuario_id: string; contexto: ContextoTicket }[]>`
    UPDATE tickets_acesso t SET usado_em = now()
    FROM usuarios u
    WHERE t.hash = ${sha256(ticket).toString('hex')} AND t.usado_em IS NULL AND t.expira_em > now() AND u.id = t.usuario_id AND u.ativo
    RETURNING t.usuario_id, t.contexto`;
  if (!linha) return null;
  return { token: assinarSessao(linha.usuario_id), contexto: linha.contexto };
}

const assinatura = (conteudo: string) => createHmac('sha256', exigirVariavel('SEGREDO_SESSAO')).update(conteudo).digest('base64url');

export function assinarSessao(usuarioId: string, agoraMs = Date.now()): string {
  const conteudo = Buffer.from(JSON.stringify({ sub: usuarioId, exp: Math.floor(agoraMs / 1000) + SESSAO_SEGUNDOS })).toString('base64url');
  return `${conteudo}.${assinatura(conteudo)}`;
}

export function lerSessao(token: string, agoraMs = Date.now()): string | null {
  const [conteudo, recebida, sobra] = token.split('.');
  if (!conteudo || !recebida || sobra !== undefined) return null;
  const a = Buffer.from(assinatura(conteudo));
  const b = Buffer.from(recebida);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const dados = JSON.parse(Buffer.from(conteudo, 'base64url').toString('utf8')) as { sub?: unknown; exp?: unknown };
    if (typeof dados.sub !== 'string' || typeof dados.exp !== 'number' || dados.exp * 1000 <= agoraMs) return null;
    return dados.sub;
  } catch {
    return null;
  }
}

/** Usuário de um cabeçalho Authorization. O papel e o "ativo" vêm do banco a cada chamada, nunca do token. */
export async function usuarioDoCabecalho(cabecalho: string | null | undefined): Promise<Usuario | null> {
  if (!cabecalho?.startsWith('Bearer ')) return null;
  const id = lerSessao(cabecalho.slice(7).trim());
  if (!id) return null;
  const sql = await banco();
  const [usuario] = await sql<Usuario[]>`SELECT id, email, nome, role, ativo FROM usuarios WHERE id = ${id} AND ativo`;
  return usuario ?? null;
}

/** Endereço público do serviço, sem barra final. */
export const urlPublica = () => exigirVariavel('URL_PUBLICA').replace(/\/+$/, '');
