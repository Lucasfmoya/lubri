/*Suavizar el efecto del navbar al hacer scroll*/
/*if agregado ver funcion */
const navbar = document.querySelector(".navbar");

if (navbar) {
  let isScrolled = false;

  window.addEventListener(
    "scroll",
    () => {
      const scrollY = window.scrollY;

      if (!isScrolled && scrollY > 80) {
        navbar.classList.add("navbar-scrolled");
        isScrolled = true;
      }

      if (isScrolled && scrollY < 40) {
        navbar.classList.remove("navbar-scrolled");
        isScrolled = false;
      }
    },
    { passive: true },
  );
}

const toggler = document.querySelector(".navbar-toggler");

if (toggler) {
  toggler.addEventListener("click", () => {
    toggler.classList.toggle("open");
  });
}

/* función para agregar animaciones */

const elements = document.querySelectorAll("[data-animate]");

const observer = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const animation = entry.target.dataset.animate;
      const delay = entry.target.dataset.delay || 0;

      // 🔥 delay opcional (si lo usás en el HTML)
      entry.target.style.transitionDelay = `${delay}ms`;

      entry.target.classList.add(animation);
      entry.target.classList.add("show");

      // 🔒 se ejecuta una sola vez
      observer.unobserve(entry.target);
    });
  },
  {
    threshold: 0.2,
    rootMargin: "0px 0px -80px 0px",
  },
);

elements.forEach((el) => observer.observe(el));

if (!("IntersectionObserver" in window)) {
  elements.forEach((el) => el.classList.add("show"));
}
