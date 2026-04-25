const navbar = document.querySelector(".navbar");

let isScrolled = false;

window.addEventListener("scroll", () => {
  const scrollY = window.scrollY;

  if (!isScrolled && scrollY > 80) {
    navbar.classList.add("navbar-scrolled");
    isScrolled = true;
  }

  if (isScrolled && scrollY < 40) {
    navbar.classList.remove("navbar-scrolled");
    isScrolled = false;
  }
});

const toggler = document.querySelector(".navbar-toggler");

if (toggler) {
  toggler.addEventListener("click", () => {
    toggler.classList.toggle("open");
  });
}