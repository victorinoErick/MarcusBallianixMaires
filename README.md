# Marcus Balliani × M. Aires

Site institucional com uma intro imersiva (uma fruta é cortada no scroll
revelando a marca), scroll fluido em todo o site, uma nova loja
(Squeeze House, no Complexo Matarazzo) e um formulário que salva nome e
e-mail em um banco PostgreSQL para o envio de futuras promoções.

## Estrutura

```
/public
  index.html       → marcação do site (intro, seções, formulário)
  style.css        → identidade visual e animações em CSS
  script.js        → GSAP + ScrollTrigger + Lenis, reveals e envio do form
  images/          → hero.jpg, performance.jpg, energia.jpg, m-aires.jpg,
                     comunidade.jpg (adicione os arquivos reais aqui)
/db
  schema.sql       → referência do esquema da tabela "leads"
server.js          → Express: site estático + API + banco de dados
package.json
.env.example
```

## Como rodar localmente

```bash
npm install
```

Crie um arquivo `.env` na raiz (copie de `.env.example`) e preencha:

```
DATABASE_URL=postgresql://usuario:senha@host:5432/banco
PORT=3000
ADMIN_TOKEN=um-token-secreto-seu
```

Você precisa de um PostgreSQL acessível (local, Docker ou um serviço
na nuvem) — a tabela `leads` é criada automaticamente na primeira
execução, não é preciso rodar `db/schema.sql` manualmente.

```bash
npm start
```

Acesse `http://localhost:3000`.

## Deploy no Railway

1. **Crie um projeto novo** no Railway (New Project).
2. **Adicione o serviço PostgreSQL**: "New" → "Database" → "PostgreSQL".
   O Railway cria a variável `DATABASE_URL` automaticamente dentro do
   serviço do banco.
3. **Conecte o repositório do GitHub**: "New" → "GitHub Repo" e
   selecione este repositório. O Railway detecta o Node.js e usa
   `npm start` automaticamente (definido em `package.json`).
4. **Compartilhe a variável do banco com o serviço web**: no serviço
   do site, em "Variables", adicione `DATABASE_URL` referenciando a
   variável do serviço PostgreSQL (o Railway sugere isso
   automaticamente ao conectar os dois serviços).
5. **Configure `ADMIN_TOKEN`**: ainda em "Variables" do serviço web,
   adicione `ADMIN_TOKEN` com um valor aleatório e secreto — ele
   protege a exportação de e-mails.
6. **Não defina `PORT`**: o Railway injeta a variável `PORT`
   automaticamente e o `server.js` já usa `process.env.PORT`.
7. **Deploy**: o Railway publica automaticamente a cada push na
   branch conectada. O healthcheck pode ser configurado para
   `GET /health`.

## Como exportar a lista de e-mails

A lista (apenas quem não se descadastrou) pode ser baixada em CSV:

```bash
curl -H "Authorization: Bearer SEU_ADMIN_TOKEN" \
  https://seu-dominio.up.railway.app/api/leads/export \
  -o leads.csv
```

## Descadastro (LGPD)

Cada lead recebe um `unsubscribe_token` único. A rota
`GET /descadastrar?token=...` marca `descadastrado_em` e mostra uma
página de confirmação no visual do site. Esse link é o que deve ser
incluído nos e-mails de promoção enviados no futuro.

## Bibliotecas usadas e por quê

- **Express**: serve o site estático (`public/`) e a API de leads em
  um único serviço, simples de rodar e de fazer deploy no Railway.
- **pg**: cliente PostgreSQL oficial, leve, sem ORM — as queries são
  sempre parametrizadas (`$1`, `$2`, …) para evitar SQL injection.
- **express-rate-limit**: limita envios do formulário por IP (5 a
  cada 10 minutos), reduzindo spam e abuso.
- **GSAP + ScrollTrigger** (via CDN, versão fixa `3.12.5`): motor de
  animação que move a intro da fruta, os reveals e o parallax com
  `transform`/`opacity`, sincronizado ao progresso do scroll (scrub).
- **Lenis** (via CDN, versão fixa `1.1.13`): smooth scroll que deixa
  a rolagem do site fluida em qualquer dispositivo, sincronizado ao
  ScrollTrigger.

Nenhuma credencial fica no código — tudo vem de variáveis de
ambiente (`DATABASE_URL`, `PORT`, `ADMIN_TOKEN`).

## Acessibilidade e performance

- Respeita `prefers-reduced-motion`: desliga o Lenis e a animação de
  scroll da intro, mostrando a fruta já cortada e o nome da marca
  visível, sem a cinemática de corte.
- Sem JavaScript, o conteúdo continua legível: nada depende da
  animação para aparecer (a classe `js` só é adicionada com JS ativo;
  sem ela, o CSS volta ao estado final estático).
- Imagens da galeria usam `loading="lazy"` (a do hero carrega
  imediatamente).
