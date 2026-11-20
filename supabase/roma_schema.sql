-- Roma Gravataria e Moda Masculina — Schema Supabase (Prefixo: roma_)

CREATE TABLE IF NOT EXISTS roma_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  categoria TEXT NOT NULL,
  preco NUMERIC(10,2) NOT NULL,
  preco_pix NUMERIC(10,2) NOT NULL,
  preco_original NUMERIC(10,2),
  estoque INTEGER NOT NULL DEFAULT 0,
  cores JSONB NOT NULL DEFAULT '[]'::jsonb,
  tamanhos JSONB NOT NULL DEFAULT '[]'::jsonb,
  imagem_url TEXT,
  destaque BOOLEAN DEFAULT false,
  mais_vendido BOOLEAN DEFAULT false,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roma_pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido TEXT UNIQUE NOT NULL,
  cliente_nome TEXT NOT NULL,
  cliente_email TEXT,
  cliente_whatsapp TEXT NOT NULL,
  cep TEXT,
  endereco TEXT,
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10,2) NOT NULL,
  frete NUMERIC(10,2) NOT NULL DEFAULT 0,
  desconto_pix NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  forma_pagamento TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  comissao_percentual NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  comissao_valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  comissao_paga BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roma_visitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pagina TEXT NOT NULL,
  origem_utm TEXT DEFAULT 'Direto',
  dispositivo TEXT DEFAULT 'Desktop',
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roma_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  interesse TEXT,
  origem TEXT NOT NULL DEFAULT 'Bot Especialista',
  status TEXT NOT NULL DEFAULT 'Novo',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roma_blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  categoria TEXT NOT NULL,
  resumo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  imagem_url TEXT,
  tempo_leitura TEXT DEFAULT '4 min',
  publicado BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roma_usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_provisoria TEXT,
  precisa_trocar_senha BOOLEAN DEFAULT true,
  nivel_acesso TEXT NOT NULL DEFAULT 'Vendedor',
  permissoes_abas JSONB NOT NULL DEFAULT '{
    "dashboard": true,
    "vendas": true,
    "comissoes": false,
    "produtos": false,
    "visitas": false,
    "leads": true,
    "blog": false,
    "configuracoes": false
  }'::jsonb,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bucket de Storage para imagens otimizadas da Roma
INSERT INTO storage.buckets (id, name, public)
VALUES ('roma-imagens', 'roma-imagens', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "roma_imagens_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'roma-imagens');

CREATE POLICY "roma_imagens_public_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'roma-imagens');

CREATE TABLE IF NOT EXISTS roma_configuracoes (
  id TEXT PRIMARY KEY DEFAULT 'config-default',
  whatsapp_numero TEXT NOT NULL DEFAULT '5511999998888',
  whatsapp_display TEXT NOT NULL DEFAULT '(11) 99999-8888',
  mensagem_padrao_atendente TEXT NOT NULL DEFAULT 'Olá! Vim do site Roma Gravataria e quero falar com um atendente:',
  comissao_padrao_percentual NUMERIC(5,2) NOT NULL DEFAULT 12.00,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para sincronizar auth.users com roma_usuarios
CREATE OR REPLACE FUNCTION public.handle_roma_auth_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.roma_usuarios (id, nome, email, nivel_acesso)
  VALUES (
    new.id::text,
    COALESCE(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'nivel_acesso', 'Vendedor')
  )
  ON CONFLICT (email) DO UPDATE
  SET nome = EXCLUDED.nome;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_roma ON auth.users;
CREATE TRIGGER on_auth_user_created_roma
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_roma_auth_user();
