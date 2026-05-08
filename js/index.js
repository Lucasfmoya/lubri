/* =============================================
   LUBRICENTRO O'HIGGINS — index.js v2.0
   ============================================= */

/* ===== NAVBAR: scroll suavizado ===== */
(function () {
  const navbar = document.querySelector(".navbar");
  if (!navbar) return;

  let isScrolled = false;

  window.addEventListener(
    "scroll",
    () => {
      const scrollY = window.scrollY;
      if (!isScrolled && scrollY > 80) {
        navbar.classList.add("navbar-scrolled");
        isScrolled = true;
      } else if (isScrolled && scrollY < 40) {
        navbar.classList.remove("navbar-scrolled");
        isScrolled = false;
      }
    },
    { passive: true }
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

  // Fallback sin soporte
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
    }
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