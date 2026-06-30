/* =============================================
   LUBRICENTRO O'HIGGINS — main.js v2.0
   ============================================= */

/* ===== NAVBAR: scroll suavizado ===== */
(function () {
  const navbar = document.querySelector("nav.navbar");
  if (!navbar) return;

  const logo = navbar.querySelector(".logo-custom");

  function applyScrolled() {
    navbar.setAttribute(
      "style",
      "padding: 4px 0 !important;" +
        "min-height: 52px !important;" +
        "background-color: rgba(255,255,255,0.97) !important;" +
        "backdrop-filter: blur(16px) !important;" +
        "-webkit-backdrop-filter: blur(16px) !important;" +
        "box-shadow: 0 4px 24px rgba(0,0,0,0.1) !important;",
    );
    if (logo) logo.style.width = "80px";
  }

  function removeScrolled() {
    navbar.removeAttribute("style");
    if (logo) logo.style.width = "";
  }

  let isScrolled = false;

  window.addEventListener(
    "scroll",
    () => {
      const scrollY = window.scrollY;
      if (!isScrolled && scrollY > 80) {
        applyScrolled();
        isScrolled = true;
      } else if (isScrolled && scrollY < 40) {
        removeScrolled();
        isScrolled = false;
      }
    },
    { passive: true },
  );
})();

/* ===== NAVBAR: toggler accesible ===== */
(function () {
  const toggler = document.querySelector(".navbar-toggler");
  if (!toggler) return;
  toggler.addEventListener("click", () => {
    toggler.classList.toggle("open");
  });
})();

/* ===== INTERSECTION OBSERVER: animaciones al hacer scroll ===== */
(function () {
  const elements = document.querySelectorAll("[data-animate]");
  if (!elements.length) return;

  if (!("IntersectionObserver" in window)) {
    elements.forEach((el) => {
      const anim = el.dataset.animate;
      el.classList.add(anim, "show");
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const animation = entry.target.dataset.animate;
        const delay = parseInt(entry.target.dataset.delay || "0", 10);

        entry.target.style.transitionDelay = `${delay}ms`;
        entry.target.classList.add(animation, "show");

        obs.unobserve(entry.target);
      });
    },
    {
      threshold: 0.15,
      rootMargin: "0px 0px -60px 0px",
    },
  );

  elements.forEach((el) => observer.observe(el));
})();

/* ===== BOTÓN VOLVER ARRIBA ===== */
(function () {
  const btn = document.createElement("button");
  btn.className = "back-to-top";
  btn.setAttribute("aria-label", "Volver arriba");
  btn.innerHTML = '<i class="bi bi-chevron-up"></i>';
  document.body.appendChild(btn);

  window.addEventListener(
    "scroll",
    () => {
      const scrollY = window.scrollY;
      const nearBottom =
        scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 200;

      if (scrollY > 300 && !nearBottom) {
        btn.classList.add("visible");
      } else {
        btn.classList.remove("visible");
      }
    },
    { passive: true },
  );

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();

/* ===== SLIDER: pausar al hacer hover ===== */
(function () {
  const track = document.querySelector(".slider-track");
  if (!track) return;

  track.addEventListener("mouseenter", () => {
    track.style.animationPlayState = "paused";
  });

  track.addEventListener("mouseleave", () => {
    track.style.animationPlayState = "running";
  });
})();

/* ===== ACTIVE NAV LINK según página actual ===== */
(function () {
  const links = document.querySelectorAll(".navbar-nav .nav-link");
  const current = window.location.pathname.split("/").pop() || "index.html";

  links.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;
    const linkPage = href.split("/").pop();
    if (linkPage === current) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
})();

/*=======================================
        FORMULARIO CONTACTO
=========================================*/

const contactForm = document.getElementById("contactForm");
const submitBtn = document.getElementById("submitBtn");
const formSuccess = document.getElementById("formSuccess");
const contactFormCard = document.querySelector(".contact-form-card");
const anioInput = document.getElementById("anio");

/* Año máximo dinámico */
if (anioInput) {
  anioInput.max = new Date().getFullYear() + 1;
}

if (contactForm) {
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    submitBtn.disabled = true;

    submitBtn.innerHTML = `
      <span class="spinner-border spinner-border-sm"></span>
      Enviando...
    `;

    try {
      const formData = new FormData(contactForm);

      let response, result;

      try {
        response = await fetch("https://formspree.io/f/xvzldeov", {
          method: "POST",
          body: formData,
          headers: { Accept: "application/json" },
        });
        result = await response.json();
      } catch (fetchError) {
        console.log("FETCH FALLÓ:", fetchError.name, fetchError.message);
        throw fetchError;
      }

      if (!response.ok) {
        const msg =
          result?.errors?.map((e) => e.message).join(", ") ||
          `HTTP ${response.status}`;
        throw new Error(msg);
      }
      // Trackear formulario enviado exitosamente
      gtag("event", "formulario_enviado", {
        event_category: "conversion",
        event_label:
          document.getElementById("servicio")?.value || "sin servicio",
      });
      contactForm.reset();
      contactForm.style.display = "none";
      formSuccess.classList.add("show");
      contactFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      alert("Error: " + error.name + " — " + error.message);
    } finally {
      submitBtn.disabled = false;

      submitBtn.innerHTML = `
        <i class="bi bi-send-fill"></i>
        <span class="btn-submit-text">Enviar consulta</span>
      `;
    }
  });
}

/* ===== RESEÑAS — carrusel minimalista ===== */

(function () {
  const reviews = [
    {
      av: "MG",
      bg: "#010a44",
      name: "Martín González",
      date: "hace 2 semanas",
      stars: 5,
      text: "Excelente atención, rápidos y honestos. Me avisaron que el filtro todavía estaba bien y no me lo cambiaron innecesariamente. Eso genera mucha confianza.",
    },
    {
      av: "LP",
      bg: "#1565c0",
      name: "Laura Pérez",
      date: "hace 1 mes",
      stars: 5,
      text: "Siempre voy ahí. El equipo es muy profesional y te explican todo lo que le hacen al auto. Los precios son justos y el servicio es rápido. 100% recomendable.",
    },
    {
      av: "RV",
      bg: "#2e7d32",
      name: "Roberto Villalba",
      date: "hace 3 semanas",
      stars: 5,
      text: "Fui por primera vez y me sorprendió la atención. Muy ordenados, limpios y explicaron cada paso del servicio. Ya tengo mi lubricentro de confianza en el sur.",
    },
    {
      av: "SC",
      bg: "#6a1b9a",
      name: "Sofía Carrizo",
      date: "hace 2 meses",
      stars: 5,
      text: "Me cambiaron el aceite y de paso me revisaron los líquidos sin cobrarme de más. El trato fue muy amable. Se nota que valoran al cliente. Volvería siempre.",
    },
    {
      av: "DM",
      bg: "#c62828",
      name: "Diego Moreno",
      date: "hace 5 semanas",
      stars: 5,
      text: "Rápido, limpio y honesto. No te intentan vender lo que no necesitás. Eso es cada vez más difícil de encontrar. Ya recomendé el lugar a varios amigos.",
    },
  ];

  const card = document.getElementById("rev-card");
  const dotsEl = document.getElementById("rev-dots");
  const btnP = document.getElementById("rev-prev");
  const btnN = document.getElementById("rev-next");

  if (!card || !dotsEl || !btnP || !btnN) return;

  let cur = 0;
  let busy = false;
  let timer = null;
  const DELAY = 5000;

  reviews.forEach(function (_, i) {
    const d = document.createElement("button");
    d.className = "rev-dot" + (i === 0 ? " active" : "");
    d.setAttribute("aria-label", "Reseña " + (i + 1));
    d.addEventListener("click", function () {
      go(i);
    });
    dotsEl.appendChild(d);
  });

  function render(r) {
    const av = document.getElementById("rev-av");
    av.textContent = r.av;
    av.style.background = r.bg;
    document.getElementById("rev-name").textContent = r.name;
    document.getElementById("rev-date").textContent = r.date;
    document.getElementById("rev-stars").textContent = "★".repeat(r.stars);
    document.getElementById("rev-text").textContent = r.text;
  }

  function go(idx) {
    const total = reviews.length;
    idx = ((idx % total) + total) % total;
    if (idx === cur || busy) return;
    busy = true;

    card.classList.add("rev-exit");
    setTimeout(function () {
      card.classList.remove("rev-exit");
      cur = idx;
      render(reviews[cur]);
      card.classList.add("rev-enter");
      setTimeout(function () {
        card.classList.remove("rev-enter");
        busy = false;
      }, 300);
      dotsEl.querySelectorAll(".rev-dot").forEach(function (d, i) {
        d.classList.toggle("active", i === cur);
      });
      btnP.disabled = cur === 0;
      btnN.disabled = cur === reviews.length - 1;
    }, 200);

    clearTimeout(timer);
    timer = setTimeout(function () {
      go(cur + 1);
    }, DELAY);
  }

  btnP &&
    btnP.addEventListener("click", function () {
      go(cur - 1);
    });
  btnN &&
    btnN.addEventListener("click", function () {
      go(cur + 1);
    });

  render(reviews[0]);
  timer = setTimeout(function () {
    go(1);
  }, DELAY);
})();

/* ===== MISIÓN / VISIÓN — swap de estilos al hover ===== */
(function () {
  const cardMision = document.querySelector(".mv-card-mision");
  const cardVision = document.querySelector(".mv-card-vision");
  const mvGrid = document.querySelector(".mv-grid");
  if (!cardMision || !cardVision || !mvGrid) return;

  let leaveTimer = null;

  mvGrid.addEventListener(
    "mouseenter",
    function (e) {
      if (!e.target.closest(".mv-card")) return;
      clearTimeout(leaveTimer);
      cardMision.classList.add("mv-inverted");
      cardVision.classList.add("mv-inverted");
    },
    true,
  );

  mvGrid.addEventListener(
    "mouseleave",
    function (e) {
      if (!e.target.closest(".mv-card")) return;
      leaveTimer = setTimeout(function () {
        cardMision.classList.remove("mv-inverted");
        cardVision.classList.remove("mv-inverted");
      }, 80);
    },
    true,
  );
})();

/* ===== GOOGLE ANALYTICS — eventos personalizados ===== */
(function () {
  // Todos los links de WhatsApp
  document.querySelectorAll('a[href*="wa.me"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      gtag("event", "click_whatsapp", {
        event_category: "contacto",
        event_label: btn.textContent.trim() || "WhatsApp",
        page_location: window.location.pathname,
      });
    });
  });

  // Botón flotante de WhatsApp específicamente
  const waFloat = document.querySelector(".whatsapp-float");
  if (waFloat) {
    waFloat.addEventListener("click", () => {
      gtag("event", "click_whatsapp_flotante", {
        event_category: "contacto",
        event_label: "Botón flotante",
      });
    });
  }

  // Clicks en teléfono
  document.querySelectorAll('a[href*="tel:"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      gtag("event", "click_telefono", {
        event_category: "contacto",
        event_label: "Llamada directa",
      });
    });
  });
  // Botones "Consultar precio" (servicios.html)
  document.querySelectorAll('a[href*="wa.me"]').forEach((btn) => {
    const texto = btn.textContent.trim().toLowerCase();

    if (texto.includes("consultar precio")) {
      btn.addEventListener("click", () => {
        gtag("event", "click_consultar_precio", {
          event_category: "conversion",
          event_label: btn.closest("section")?.id || "servicios",
        });
      });
    }

    if (texto.includes("empresa") || texto.includes("flota")) {
      btn.addEventListener("click", () => {
        gtag("event", "click_consulta_empresa", {
          event_category: "conversion",
          event_label: "Flotas y empresas",
        });
      });
    }

    if (texto.includes("turno")) {
      btn.addEventListener("click", () => {
        gtag("event", "click_solicitar_turno", {
          event_category: "conversion",
          event_label: btn.closest("section")?.id || window.location.pathname,
        });
      });
    }
  });
})();

/* ===== BUSCADOR DE PATENTE — HERO (index.html) ===== */
(function () {
  const heroInput = document.getElementById("heroBuscarPatente");
  const heroBtn = document.getElementById("heroBtnBuscar");
  if (!heroInput || !heroBtn) return;

  const regex = /^[A-Z]{3}[0-9]{3}$|^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;

  heroInput.addEventListener("input", function () {
    this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  });

  function irAHistorial() {
    const patente = heroInput.value.trim().toUpperCase();

    if (!patente) {
      heroInput.focus();
      heroInput.placeholder = "Ingresá una patente…";
      setTimeout(() => {
        heroInput.placeholder = "Ingresá tu patente (Ej: AB123CD)";
      }, 2000);
      return;
    }

    if (!regex.test(patente)) {
      heroInput.style.boxShadow = "0 0 0 2px rgba(227,6,19,0.6)";
      heroInput.focus();
      setTimeout(() => {
        heroInput.style.boxShadow = "";
      }, 1800);
      return;
    }

    window.location.href =
      "./pages/historial.html?patente=" + encodeURIComponent(patente);
  }

  heroBtn.addEventListener("click", irAHistorial);

  heroInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      irAHistorial();
    }
  });
})();
