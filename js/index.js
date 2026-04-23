
const navbar = document.querySelector(".navbar");

let isScrolled = false;

window.addEventListener("scroll", () => {
  const scrollY = window.scrollY;

  // Activa cuando baja lo suficiente
  if (!isScrolled && scrollY > 80) {
    navbar.classList.add("navbar-scrolled");
    isScrolled = true;
  }

  // Desactiva cuando sube bastante
  if (isScrolled && scrollY < 40) {
    navbar.classList.remove("navbar-scrolled");
    isScrolled = false;
  }
});