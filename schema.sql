-- Tabela de contas de usuários
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de assistentes
CREATE TABLE IF NOT EXISTS assistants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  first_message TEXT NOT NULL,
  model TEXT NOT NULL,
  voice TEXT,
  voice_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  user_id UUID NOT NULL REFERENCES auth.users(id),
  published BOOLEAN NOT NULL DEFAULT false,
  assistant_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de chamadas
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  assistant_id UUID REFERENCES assistants(id),
  client_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  duration INTEGER DEFAULT 0,
  call_start TIMESTAMP WITH TIME ZONE,
  call_end TIMESTAMP WITH TIME ZONE,
  recording_url TEXT,
  call_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar a performance
CREATE INDEX IF NOT EXISTS assistants_user_id_idx ON assistants(user_id);
CREATE INDEX IF NOT EXISTS calls_user_id_idx ON calls(user_id);
CREATE INDEX IF NOT EXISTS calls_assistant_id_idx ON calls(assistant_id);

-- Políticas de segurança para Row Level Security (RLS)

-- Habilitar RLS nas tabelas
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Políticas para accounts
CREATE POLICY "Usuários podem ver apenas suas próprias contas"
  ON accounts FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar apenas suas próprias contas"
  ON accounts FOR UPDATE
  USING (auth.uid() = id);

-- Políticas para assistants
CREATE POLICY "Usuários podem ver apenas seus próprios assistentes"
  ON assistants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir apenas seus próprios assistentes"
  ON assistants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar apenas seus próprios assistentes"
  ON assistants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir apenas seus próprios assistentes"
  ON assistants FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para calls
CREATE POLICY "Usuários podem ver apenas suas próprias chamadas"
  ON calls FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir apenas suas próprias chamadas"
  ON calls FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar apenas suas próprias chamadas"
  ON calls FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir apenas suas próprias chamadas"
  ON calls FOR DELETE
  USING (auth.uid() = user_id);
