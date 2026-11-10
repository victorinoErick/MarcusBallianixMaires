/* =========================================================
   Marcus Balliani × M. Aires — server.js
   Express servindo o site estático (public/) e a API de leads,
   com PostgreSQL via "pg". Pronto para deploy no Railway (processo
   persistente) ou no Vercel (função serverless via vercel.json).
========================================================= */

"use strict";

const path = require("path");
const crypto = require("crypto");
const express = require("express");
const rateLimit = require("express-rate-limit");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


/* =========================
   BANCO DE DADOS (PostgreSQL)
========================= */

const connectionString = process.env.DATABASE_URL;

// Railway (e a maioria dos provedores gerenciados) exige SSL em
// produção; localmente, sem SSL, para não exigir certificado.
const useSSL =
  connectionString && !/localhost|127\.0\.0\.1/.test(connectionString);

const pool = new Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  // Em função serverless (Vercel), cada invocação pode abrir sua
  // própria instância do pool — mantemos poucas conexões para não
  // estourar o limite do Postgres quando há várias invocações em paralelo.
  max: process.env.VERCEL ? 3 : 10,
});

async function criarTabela() {
  await pool.query(`
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
  `);

  await pool.query(
    `CREATE INDEX IF NOT EXISTS leads_email_idx ON leads (email);`
  );
}

// Memoizado: roda uma única vez por processo (ou por instância "quente"
// de função serverless) e é aguardado dentro de cada rota que usa o
// banco, em vez de travar a subida do servidor inteiro caso falhe.
let tabelaPronta = null;
function garantirPronto() {
  if (!tabelaPronta) {
    tabelaPronta = criarTabela().catch((erro) => {
      tabelaPronta = null; // permite tentar de novo na próxima requisição
      throw erro;
    });
  }
  return tabelaPronta;
}


/* =========================
   MIDDLEWARES GERAIS
========================= */

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


/* =========================
   API — LEADS (captação para futuras promoções)
========================= */

// No máximo 5 envios a cada 10 minutos por IP, contra spam/abuso.
const leadsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    erro: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  },
});

const MENSAGEM_SUCESSO =
  "Seu interesse foi registrado. Em breve você receberá novidades.";

app.post("/api/leads", leadsLimiter, async (req, res) => {
  try {
    await garantirPronto();

    const body = req.body || {};

    // Honeypot: campo invisível que só bots preenchem. Respondemos
    // sucesso normalmente, mas não salvamos nada no banco.
    if (body.empresa) {
      return res.json({ ok: true, mensagem: MENSAGEM_SUCESSO });
    }

    const nome = typeof body.nome === "string" ? body.nome.trim() : "";
    const emailBruto = typeof body.email === "string" ? body.email : "";
    const email = emailBruto.trim().toLowerCase().replace(/\s+/g, "");
    const aceitaMarketing = body.aceitaMarketing === true;

    if (!nome || nome.length > 120) {
      return res.status(400).json({
        ok: false,
        erro: "Informe um nome válido (até 120 caracteres).",
      });
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        ok: false,
        erro: "Informe um e-mail válido.",
      });
    }

    if (!aceitaMarketing) {
      return res.status(400).json({
        ok: false,
        erro: "É necessário aceitar receber novidades por e-mail.",
      });
    }

    const unsubscribeToken = crypto.randomBytes(24).toString("hex");

    // Se o e-mail já existir, apenas atualizamos nome e reativamos o
    // consentimento — sem revelar ao cliente que ele já estava cadastrado.
    await pool.query(
      `
      INSERT INTO leads (nome, email, aceita_marketing, consentimento_em, unsubscribe_token)
      VALUES ($1, $2, true, now(), $3)
      ON CONFLICT (email) DO UPDATE SET
        nome = EXCLUDED.nome,
        aceita_marketing = true,
        consentimento_em = now(),
        descadastrado_em = NULL
      `,
      [nome, email, unsubscribeToken]
    );

    return res.json({ ok: true, mensagem: MENSAGEM_SUCESSO });
  } catch (erro) {
    console.error("Erro ao salvar lead:", erro);
    return res.status(500).json({
      ok: false,
      erro: "Erro interno. Tente novamente em instantes.",
    });
  }
});

// Exporta os e-mails ainda ativos (não descadastrados) em CSV.
// Protegido por Authorization: Bearer <ADMIN_TOKEN>.
app.get("/api/leads/export", async (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, erro: "Não autorizado." });
  }

  try {
    await garantirPronto();

    const { rows } = await pool.query(
      `
      SELECT id, nome, email, aceita_marketing, origem, criado_em
      FROM leads
      WHERE descadastrado_em IS NULL
      ORDER BY criado_em DESC
      `
    );

    const cabecalho = ["id", "nome", "email", "aceita_marketing", "origem", "criado_em"];
    const linhas = rows.map((linha) =>
      cabecalho.map((campo) => csvEscape(linha[campo])).join(",")
    );
    const csv = [cabecalho.join(","), ...linhas].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="leads-marcus-balliani-m-aires.csv"'
    );
    return res.send(csv);
  } catch (erro) {
    console.error("Erro ao exportar leads:", erro);
    return res.status(500).json({ ok: false, erro: "Erro interno." });
  }
});

function csvEscape(valor) {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor);
  if (/[",\n]/.test(texto)) {
    return '"' + texto.replace(/"/g, '""') + '"';
  }
  return texto;
}


/* =========================
   DESCADASTRO (LGPD)
========================= */

app.get("/descadastrar", async (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";

  try {
    await garantirPronto();

    const { rows } = token
      ? await pool.query(
          `
          UPDATE leads
          SET descadastrado_em = now()
          WHERE unsubscribe_token = $1
          RETURNING email
          `,
          [token]
        )
      : { rows: [] };

    const sucesso = rows.length > 0;

    return res.status(sucesso ? 200 : 404).send(paginaDescadastro(sucesso));
  } catch (erro) {
    console.error("Erro ao processar descadastro:", erro);
    return res.status(500).send(paginaDescadastro(false));
  }
});

function paginaDescadastro(sucesso) {
  const titulo = sucesso ? "Descadastro confirmado" : "Link inválido";
  const mensagem = sucesso
    ? "Você não receberá mais novidades e promoções por e-mail. Se mudar de ideia, basta se cadastrar novamente no site."
    : "Não encontramos esse link de descadastro. Ele pode já ter sido usado ou estar incorreto.";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titulo} · Marcus Balliani × M. Aires</title>
<style>
  :root { --bg:#10130f; --surface:#171b15; --cream:#f1eadc; --muted:#aeb6a8; --line:rgba(241,234,220,.16); --lime:#c9e56b; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    background: var(--bg);
    color: var(--cream);
    font-family: Inter, ui-sans-serif, -apple-system, "Segoe UI", sans-serif;
    padding: 24px;
  }
  .card {
    max-width: 480px;
    width: 100%;
    border: 1px solid var(--line);
    background: var(--surface);
    padding: 42px;
    border-radius: 18px;
    text-align: center;
  }
  .kicker {
    color: var(--lime);
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-size: 10px;
    font-weight: 800;
  }
  h1 {
    font-family: Georgia, "Times New Roman", serif;
    font-weight: 400;
    font-size: 30px;
    margin: 14px 0 10px;
  }
  p { color: var(--muted); line-height: 1.7; margin: 0; }
  a {
    display: inline-flex;
    margin-top: 26px;
    color: #12150f;
    background: var(--cream);
    border-radius: 100px;
    padding: 0 22px;
    min-height: 44px;
    align-items: center;
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 10px;
    font-weight: 800;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="kicker">Marcus Balliani × M. Aires</div>
    <h1>${titulo}</h1>
    <p>${mensagem}</p>
    <a href="/">Voltar ao site</a>
  </div>
</body>
</html>`;
}


/* =========================
   HEALTHCHECK (Railway)
========================= */

app.get("/health", (req, res) => {
  res.json({ ok: true });
});


/* =========================
   INICIALIZAÇÃO
========================= */

// No Railway (ou localmente com "npm start"), server.js roda como
// processo persistente e precisa escutar uma porta de verdade.
// No Vercel, o arquivo é importado por uma função serverless
// (vercel.json) que só usa o "app" exportado abaixo — nesse caso
// não chamamos app.listen().
if (require.main === module) {
  garantirPronto()
    .catch((erro) => {
      console.error("Não foi possível preparar o banco de dados:", erro);
    })
    .finally(() => {
      app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
      });
    });
}

module.exports = app;
