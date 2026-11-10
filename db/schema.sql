-- Marcus Balliani × M. Aires
-- Tabela de leads captados pelo formulário "Quero saber" do site.
-- O server.js também executa este CREATE TABLE IF NOT EXISTS na
-- inicialização, para que o deploy funcione sem passo manual.
-- Este arquivo existe como referência / para rodar manualmente se preciso.

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  aceita_marketing BOOLEAN NOT NULL DEFAULT false,
  consentimento_em TIMESTAMPTZ,
  origem TEXT NOT NULL DEFAULT 'site-landing',
  unsubscribe_token TEXT UNIQUE,
  descadastrado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_email_idx ON leads (email);
