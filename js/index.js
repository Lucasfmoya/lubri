/* =============================================
   LUBRICENTRO O'HIGGINS — index.js v2.0
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
        console.log("STATUS:", response.status);
        console.log("RESULT:", JSON.stringify(result));
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

      contactForm.reset();
      contactForm.style.display = "none";
      formSuccess.classList.add("show");
      contactFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      console.error("Error detallado:", error.name, error.message);
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
