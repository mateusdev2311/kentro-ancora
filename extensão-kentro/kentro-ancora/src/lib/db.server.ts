import postgres from 'postgres';
import { MIGRACOES } from './db-migracoes.server';

export type Sql = postgres.Sql;

let conexao: Sql | undefined;
let pronto: Promise<void> | undefined;

function cliente(): Sql {
  if (conexao) return conexao;
  const url = process.env['DATABASE_URL']?.trim();
  if (!url) throw new Error('Falta a variável DATABASE_URL.');
  conexao = postgres(url, { max: 10, idle_timeout: 60, connect_timeout: 15, onnotice: () => {} });
  return conexao;
}

async function migrar(sql: Sql): Promise<void> {
  await sql.begin(async (tx) => {
    // A trava impede duas instâncias de migrarem ao mesmo tempo.
    await tx`SELECT pg_advisory_xact_lock(727001)`;
    await tx`CREATE TABLE IF NOT EXISTS _migracoes (id text PRIMARY KEY, aplicada_em timestamptz NOT NULL DEFAULT now())`;
    const feitas = new Set((await tx<{ id: string }[]>`SELECT id FROM _migracoes`).map((m) => m.id));
    for (const migracao of MIGRACOES) {
      if (feitas.has(migracao.id)) continue;
      await tx.unsafe(migracao.sql);
      await tx`INSERT INTO _migracoes (id) VALUES (${migracao.id})`;
    }
  });
}

/** Banco com as migrações aplicadas. Se a preparação falhar, a próxima chamada tenta de novo. */
export async function banco(): Promise<Sql> {
  const sql = cliente();
  pronto ??= migrar(sql).catch((erro: unknown) => {
    pronto = undefined;
    throw erro;
  });
  await pronto;
  return sql;
}

/** Só para os testes: fecha a conexão para outro banco poder ser usado. */
export async function encerrarBanco(): Promise<void> {
  await conexao?.end({ timeout: 2 });
  conexao = undefined;
  pronto = undefined;
}
