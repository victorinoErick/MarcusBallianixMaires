/* =========================================================
   Marcus Balliani × M. Aires — script.js
   Intro imersiva, fluidez de scroll, reveals e formulário.
========================================================= */

(function () {
  "use strict";

  var html = document.documentElement;
  var reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  var isTouch = window.matchMedia("(pointer: coarse)").matches;
  var isMobile = window.matchMedia("(max-width: 820px)").matches;

  // Se as bibliotecas de animação não carregarem (CDN bloqueado, sem
  // rede etc.), removemos a classe "js" para que o CSS devolva o site
  // ao estado estático e totalmente legível (progressive enhancement).
  if (!window.gsap || !window.ScrollTrigger) {
    html.classList.remove("js");
    setupForm();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);


  /* =========================
     LENIS (smooth scroll) + sincronização com ScrollTrigger
  ========================= */

  var lenis = null;

  if (!reducedMotion && window.Lenis) {
    lenis = new Lenis({
      smoothWheel: true,
      duration: 1.1,
    });

    lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add(function (time) {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);
  }


  /* =========================
     NAVEGAÇÃO SUAVE PELAS ÂNCORAS
  ========================= */

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      var href = link.getAttribute("href");
      if (!href || href.length < 2) return;

      var target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();

      if (lenis) {
        lenis.scrollTo(target, { offset: -70, duration: 1.2 });
      } else {
        target.scrollIntoView({
          behavior: reducedMotion ? "auto" : "smooth",
          block: "start",
        });
      }
    });
  });


  /* =========================
     INTRO IMERSIVA — fruta cortada no scroll
  ========================= */

  var fruitIntro = document.getElementById("fruitIntro");
  var nav = document.getElementById("siteNav");

  if (fruitIntro && !reducedMotion) {
    initFruitIntro();
  } else if (nav) {
    // Sem animação de intro: navbar já nasce sólida.
    nav.classList.add("nav--solid");
  }

  function initFruitIntro() {
    var svg = document.getElementById("fruitSvg");
    var stage = fruitIntro.querySelector(".fruit-stage");
    var halfLeft = document.getElementById("halfLeft");
    var halfRight = document.getElementById("halfRight");
    var flesh = document.getElementById("fruitFlesh");
    var cutLine = document.getElementById("cutLine");
    var droplets = Array.prototype.slice.call(
      document.querySelectorAll("#fruitDroplets .drop")
    );
    var titleLines = document.querySelectorAll(".fruit-title-line");
    var scrollCue = document.getElementById("scrollCue");

    if (!svg || !halfLeft || !halfRight || !cutLine) return;

    // Prepara o traço da linha de corte para ser "desenhado" via
    // stroke-dashoffset conforme o usuário rola.
    var cutLength = cutLine.getTotalLength();
    gsap.set(cutLine, {
      strokeDasharray: cutLength,
      strokeDashoffset: cutLength,
    });

    // Flutuação sutil e constante da fruta em repouso (independe do scroll).
    gsap.to(stage, {
      y: 8,
      rotation: 0.6,
      duration: 3.2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      transformOrigin: "50% 50%",
    });

    var activeDroplets = isMobile ? droplets.slice(0, 7) : droplets;

    var tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: fruitIntro,
        start: "top top",
        end: function () {
          return "+=" + (isMobile ? 180 : 250) + "%";
        },
        scrub: 0.5,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onLeave: function () {
          if (nav) nav.classList.add("nav--solid");
        },
        onEnterBack: function () {
          if (nav) nav.classList.remove("nav--solid");
        },
      },
    });

    // 0 → 0.02: indicador de scroll some assim que o movimento começa.
    tl.to(scrollCue, { opacity: 0, duration: 0.02 }, 0);

    // 0 → 0.2: leve aproximação + a lâmina desenha o corte na diagonal.
    tl.to(svg, { scale: 1.08, duration: 0.2, transformOrigin: "50% 50%" }, 0);
    tl.to(cutLine, { opacity: 1, duration: 0.01 }, 0.01);
    tl.to(cutLine, { strokeDashoffset: 0, duration: 0.19 }, 0.01);

    // 0.2 → 0.6: a fruta se abre em duas metades, revelando o interior.
    tl.to(cutLine, { opacity: 0, duration: 0.08 }, 0.22);
    tl.to(
      halfLeft,
      { x: -78, y: 46, rotation: -20, duration: 0.4 },
      0.2
    );
    tl.to(
      halfRight,
      { x: 78, y: -46, rotation: 20, duration: 0.4 },
      0.2
    );

    // Gotas de suco: pequeno "estouro" seguido de queda com fade.
    activeDroplets.forEach(function (drop, i) {
      var angle = (i / activeDroplets.length) * Math.PI * 2;
      var spread = 26 + (i % 4) * 10;
      var dx = Math.cos(angle) * spread;
      var dy = Math.sin(angle) * spread * 0.6 - 10;
      var start = 0.22 + (i % 6) * 0.015;

      gsap.set(drop, { opacity: 0, scale: 0.4, transformOrigin: "50% 50%" });

      tl.to(
        drop,
        { opacity: 1, scale: 1, x: dx, y: dy, duration: 0.09 },
        start
      );
      tl.to(
        drop,
        { y: dy + 70, opacity: 0, duration: 0.2, ease: "power1.in" },
        start + 0.09
      );
    });

    // 0.4 → 0.8: o nome da marca é revelado linha por linha.
    titleLines.forEach(function (line, i) {
      tl.to(
        line,
        { clipPath: "inset(0% 0 0 0)", duration: 0.18 },
        0.42 + i * 0.1
      );
    });

    // 0.8 → 1: as metades saem com parallax e o nome sobe, levando ao hero.
    tl.to(halfLeft, { x: -260, y: 140, rotation: -30, duration: 0.2 }, 0.8);
    tl.to(halfRight, { x: 260, y: -140, rotation: 30, duration: 0.2 }, 0.8);
    tl.to(flesh, { opacity: 0, duration: 0.15 }, 0.85);
    tl.to(
      ".fruit-title",
      { y: -70, opacity: 0, duration: 0.2 },
      0.8
    );
  }


  /* =========================
     REVEALS — títulos com máscara
  ========================= */

  document.querySelectorAll(".reveal-mask").forEach(function (el) {
    gsap.to(el, {
      clipPath: "inset(0% 0 0 0)",
      duration: 1,
      ease: "power4.out",
      scrollTrigger: {
        trigger: el,
        start: "top 88%",
        once: true,
      },
    });
  });


  /* =========================
     REVEALS — pilares, galeria e cards de loja (stagger)
  ========================= */

  [".pillar", ".gallery-card", ".location-card"].forEach(function (selector) {
    ScrollTrigger.batch(selector, {
      start: "top 85%",
      once: true,
      onEnter: function (batch) {
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.85,
          stagger: 0.12,
          ease: "power3.out",
        });
      },
    });
  });


  /* =========================
     GALERIA — parallax leve nas imagens
  ========================= */

  document.querySelectorAll(".gallery-card img").forEach(function (img) {
    gsap.to(img, {
      yPercent: -8,
      ease: "none",
      scrollTrigger: {
        trigger: img.closest(".gallery-card"),
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });
  });


  /* =========================
     FRASE — palavras acendem conforme o scroll
  ========================= */

  var quote = document.getElementById("collabQuote");

  if (quote) {
    var words = [];

    quote.childNodes.forEach(function (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        var parts = node.textContent.split(/(\s+)/);
        var frag = document.createDocumentFragment();

        parts.forEach(function (part) {
          if (part.trim() === "") {
            frag.appendChild(document.createTextNode(part));
          } else {
            var span = document.createElement("span");
            span.className = "quote-word";
            span.textContent = part;
            frag.appendChild(span);
            words.push(span);
          }
        });

        quote.replaceChild(frag, node);
      }
    });

    if (words.length) {
      gsap.to(words, {
        color: "#f1eadc",
        stagger: 0.04,
        ease: "none",
        scrollTrigger: {
          trigger: quote,
          start: "top 75%",
          end: "bottom 45%",
          scrub: true,
        },
      });
    }
  }


  /* =========================
     CURSOR CUSTOMIZADO (apenas desktop, não-touch)
  ========================= */

  var cursor = document.getElementById("cursorDot");

  if (cursor && !isTouch && !reducedMotion && window.matchMedia("(pointer: fine)").matches) {
    gsap.set(cursor, { xPercent: -50, yPercent: -50 });
    cursor.classList.add("is-active");

    window.addEventListener("mousemove", function (e) {
      gsap.to(cursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.18,
        ease: "power2.out",
        overwrite: true,
      });
    });

    document.querySelectorAll("a, button").forEach(function (el) {
      el.addEventListener("mouseenter", function () {
        cursor.classList.add("is-hovering");
      });
      el.addEventListener("mouseleave", function () {
        cursor.classList.remove("is-hovering");
      });
    });
  }


  /* =========================
     FORMULÁRIO
  ========================= */

  setupForm();

  function setupForm() {
    var form = document.getElementById("notifyForm");
    if (!form) return;

    var nameInput = document.getElementById("name");
    var emailInput = document.getElementById("email");
    var message = document.getElementById("message");

    // Site estático, sem backend: só confirma na tela, não envia nem
    // guarda os dados em lugar nenhum.
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      message.classList.remove("is-error", "is-loading");

      if (!nameInput.checkValidity()) {
        nameInput.reportValidity();
        return;
      }

      if (!emailInput.checkValidity()) {
        emailInput.reportValidity();
        return;
      }

      message.textContent =
        "Seu interesse foi registrado. Em breve você receberá novidades.";
      form.reset();
    });
  }
})();
