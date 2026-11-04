// Migrações do banco, aplicadas em ordem na subida do serviço. Nunca edite uma já publicada: acrescente outra.
// As regras de acesso (quem lê o quê) ficam em fichas.server.ts, e os limites de tamanho, aqui nos CHECKs.
export const MIGRACOES: { id: string; sql: string }[] = [
  {
    id: '0001_base',
    sql: `
CREATE TABLE usuarios (
  id text PRIMARY KEY,
  nome text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'closer' CHECK (role IN ('master','closer')),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tickets_acesso (
  hash text PRIMARY KEY,
  usuario_id text NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  contexto jsonb NOT NULL DEFAULT '{}'::jsonb,
  expira_em timestamptz NOT NULL,
  usado_em timestamptz
);
CREATE INDEX tickets_acesso_expira_idx ON tickets_acesso (expira_em);

CREATE TABLE fichas (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id text NOT NULL REFERENCES usuarios(id),
  closer_nome text NOT NULL DEFAULT '' CHECK (length(closer_nome) <= 300),
  cliente_nome text NOT NULL DEFAULT '' CHECK (length(cliente_nome) <= 300),
  segmento text NOT NULL DEFAULT '',
  cidade text NOT NULL DEFAULT '',
  transcricao text NOT NULL DEFAULT '',
  respostas jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(respostas::text) <= 100000),
  conta jsonb NOT NULL DEFAULT '{}'::jsonb,
  pacote_closer text NOT NULL DEFAULT '' CHECK (length(pacote_closer) <= 200000),
  proposta_cliente text NOT NULL DEFAULT '' CHECK (length(proposta_cliente) <= 200000),
  plano jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(plano::text) <= 20000),
  ancoragem jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(ancoragem::text) <= 200000),
  proposta_gerada boolean NOT NULL DEFAULT false,
  relatorio_dados jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(relatorio_dados::text) <= 200000)
);
CREATE INDEX fichas_created_at_idx ON fichas (created_at DESC);
CREATE INDEX fichas_user_created_idx ON fichas (user_id, created_at DESC);

CREATE TABLE contas_ao_vivo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES usuarios(id),
  cliente_nome text NOT NULL DEFAULT '' CHECK (length(cliente_nome) <= 300),
  conta jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(conta::text) <= 20000),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rascunhos (
  user_id text PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  respostas jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(respostas::text) <= 100000),
  conta_ao_vivo_id uuid REFERENCES contas_ao_vivo(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE geracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  status text NOT NULL DEFAULT 'processando' CHECK (status IN ('processando','concluida','erro')),
  resultado jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX geracoes_created_idx ON geracoes (created_at);
`,
  },
  // A IA saiu do produto: os textos da venda são montados direto da ficha.
  { id: '0002_remove_geracoes', sql: 'DROP TABLE IF EXISTS geracoes;' },
];
