import { createFileRoute } from '@tanstack/react-router';

// Diagnóstico do serviço: confirma que o banco responde e que as migrações passaram.
export const Route = createFileRoute('/saude')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { banco } = await import('@/lib/db.server');
          const sql = await banco();
          await sql`SELECT 1`;
          return Response.json({ ok: true, banco: true });
        } catch (erro) {
          console.error('Falha na verificação de saúde', erro);
          return Response.json({ ok: false, banco: false }, { status: 503 });
        }
      },
    },
  },
});
