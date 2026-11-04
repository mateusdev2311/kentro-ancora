// A IA pode levar minutos, mais do que um proxy costuma esperar numa requisição aberta.
// Por isso a geração roda em segundo plano neste processo e a tela consulta o resultado.
import { banco } from './db.server';

const LIMITE_MINUTOS = 15;

/** O erro ao usuário é um resultado normal ({ok:false, message}); só uma falha inesperada cai no catch. */
export async function iniciarGeracao<R>(usuarioId: string, tipo: string, executar: () => Promise<R>): Promise<{ id: string }> {
  const sql = await banco();
  await sql`DELETE FROM geracoes WHERE created_at < now() - interval '7 days'`;
  const [linha] = await sql<{ id: string }[]>`INSERT INTO geracoes (user_id, tipo) VALUES (${usuarioId}, ${tipo}) RETURNING id`;
  if (!linha) throw new Error('Geração não registrada.');
  const { id } = linha;
  void (async () => {
    let status: 'concluida' | 'erro' = 'concluida';
    let resultado: unknown;
    try {
      resultado = await executar();
    } catch (erro) {
      console.error('Falha na geração', tipo, erro);
      status = 'erro';
      resultado = { ok: false, message: 'A IA não concluiu. Suas respostas foram preservadas; tente novamente.' };
    }
    try {
      await sql`UPDATE geracoes SET status = ${status}, resultado = ${sql.json(resultado as never)}, updated_at = now() WHERE id = ${id}`;
    } catch (erro) {
      console.error('Falha ao gravar a geração', id, erro);
    }
  })();
  return { id };
}

/** Só o dono consulta. Uma geração interrompida (reinício do serviço) vira erro depois do limite. */
export async function consultarGeracao(usuarioId: string, id: string): Promise<{ status: string; resultado: unknown } | null> {
  const sql = await banco();
  const [linha] = await sql<{ status: string; resultado: unknown; vencida: boolean }[]>`
    SELECT status, resultado, (status = 'processando' AND created_at < now() - make_interval(mins => ${LIMITE_MINUTOS})) AS vencida
    FROM geracoes WHERE id = ${id} AND user_id = ${usuarioId}`;
  if (!linha) return null;
  if (linha.vencida) return { status: 'erro', resultado: { ok: false, message: 'A geração foi interrompida. Suas respostas foram preservadas; tente novamente.' } };
  return { status: linha.status, resultado: linha.resultado };
}
