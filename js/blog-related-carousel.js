/* =============================================
   LUBRICENTRO O'HIGGINS — blog-related-carousel.js
   Carrusel de artículos relacionados
   - Desktop: 3 tarjetas visibles
   - Mobile: 1 tarjeta visible
   - 1 indicador por artículo
   ============================================= */

document.addEventListener("DOMContentLoaded", () => {
  const wrap = document.getElementById("blogRelatedCards");
  const btnPrev = document.getElementById("blogRelPrev");
  const btnNext = document.getElementById("blogRelNext");
  const dotsEl = document.getElementById("blogRelDots");

  if (!wrap || !btnPrev || !btnNext || !dotsEl) return;

  const cards = [...wrap.children];
  if (!cards.length) return;

  let current = 0;

  function visibles() {
    return window.innerWidth <= 768 ? 1 : 3;
  }

  function renderDots() {
    dotsEl.innerHTML = "";

    if (cards.length <= 1) {
      dotsEl.style.display = "none";
      return;
    }

    dotsEl.style.display = "flex";

    cards.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.className = "blog-related-dot";
      dot.setAttribute("aria-label", `Artículo ${i + 1}`);

      dot.addEventListener("click", () => {
        current = i;
        render();
      });

      dotsEl.appendChild(dot);
    });
  }

  function render() {
    const v = visibles();

    let inicio;

    if (v === 1) {
      inicio = current;
    } else {
      inicio = current - 1;

      if (inicio < 0) inicio = 0;
      if (inicio > cards.length - v) inicio = cards.length - v;
      if (inicio < 0) inicio = 0;
    }

    wrap.style.gridTemplateColumns =
      v === 1 ? "1fr" : `repeat(${v}, minmax(0,1fr))`;

    cards.forEach((card, i) => {
      card.style.display = i >= inicio && i < inicio + v ? "" : "none";
    });

    dotsEl.querySelectorAll(".blog-related-dot").forEach((dot, i) => {
      dot.classList.toggle("active", i === current);
    });

    btnPrev.disabled = current === 0;
    btnNext.disabled = current === cards.length - 1;
  }

  btnPrev.addEventListener("click", () => {
    if (current > 0) {
      current--;
      render();
    }
  });

  btnNext.addEventListener("click", () => {
    if (current < cards.length - 1) {
      current++;
      render();
    }
  });

  let resizeTimer;

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(render, 150);
  });

  renderDots();
  render();
});
