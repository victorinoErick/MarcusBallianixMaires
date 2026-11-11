# Marcus Balliani × M. Aires

Site institucional estático (HTML, CSS e JavaScript puro) com uma
intro imersiva — uma fruta é cortada no scroll revelando a marca —,
scroll fluido em todo o site e a nova loja Squeeze House (Complexo
Matarazzo).

Não depende de servidor nem de banco de dados: o formulário de
"Quero saber" apenas confirma na tela, sem enviar ou guardar os
dados em lugar nenhum.

## Estrutura

```
/public
  index.html   → marcação do site (intro, seções, formulário)
  style.css    → identidade visual e animações em CSS
  script.js    → GSAP + ScrollTrigger + Lenis, reveals e o formulário
  images/      → hero.jpg, performance.jpg, energia.jpg, m-aires.jpg,
                 comunidade.jpg (adicione os arquivos reais aqui)
```

## Como rodar localmente

É um site 100% estático — basta abrir `public/index.html` no
navegador, ou servir a pasta com qualquer servidor simples:

```bash
npx serve public
```

## Deploy no Vercel (ou qualquer host estático)

Como não há backend, o deploy é o mais simples possível:

1. Importe o repositório no Vercel.
2. Em **Project Settings → Build & Development Settings**, defina o
   "Output Directory" como `public` (e deixe o comando de build em
   branco, já que não há nada para compilar).
3. Deploy. Pronto — não é preciso configurar nenhuma variável de
   ambiente.

O mesmo vale para Netlify, GitHub Pages ou qualquer outro host de
arquivos estáticos: é só apontar para a pasta `public/`.

## Bibliotecas usadas e por quê

- **GSAP + ScrollTrigger** (via CDN, versão fixa `3.12.5`): motor de
  animação que move a intro da fruta, os reveals e o parallax com
  `transform`/`opacity`, sincronizado ao progresso do scroll (scrub).
- **Lenis** (via CDN, versão fixa `1.1.13`): smooth scroll que deixa
  a rolagem do site fluida em qualquer dispositivo, sincronizado ao
  ScrollTrigger.

## Acessibilidade e performance

- Respeita `prefers-reduced-motion`: desliga o Lenis e a animação de
  scroll da intro, mostrando a fruta já cortada e o nome da marca
  visível, sem a cinemática de corte.
- Sem JavaScript, o conteúdo continua legível: nada depende da
  animação para aparecer (a classe `js` só é adicionada com JS ativo;
  sem ela, o CSS volta ao estado final estático).
- Imagens da galeria usam `loading="lazy"` (a do hero carrega
  imediatamente).
