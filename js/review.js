/* =============================================
   LUBRICENTRO O'HIGGINS — review.js v2
   ============================================= */

const URL_RESENAS = "https://obtenerresenas-pbgzdzmh5q-uc.a.run.app";

function renderEstrellas(rating) {
  const llenas = Math.floor(rating);
  const media = rating % 1 >= 0.5 ? 1 : 0;
  const vacias = 5 - llenas - media;
  let html = "";
  for (let i = 0; i < llenas; i++)
    html += `<i class="bi bi-star-fill rev-star-llena"></i>`;
  if (media) html += `<i class="bi bi-star-half rev-star-llena"></i>`;
  for (let i = 0; i < vacias; i++)
    html += `<i class="bi bi-star rev-star-vacia"></i>`;
  return html;
}

function iniciales(nombre) {
  if (!nombre) return "?";
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

function crearTarjeta(r) {
  const avatarHTML = r.foto
    ? `<img src="${r.foto}" alt="${r.autor}" class="rev-google-avatar-img" referrerpolicy="no-referrer" />`
    : `<div class="rev-google-avatar-txt">${iniciales(r.autor)}</div>`;

  const card = document.createElement("div");
  card.className = "rev-google-card";
  card.innerHTML = `
    <div class="rev-google-head">
      <div class="rev-google-avatar">${avatarHTML}</div>
      <div class="rev-google-meta">
        <a href="${r.url_autor || "#"}" target="_blank" rel="noopener noreferrer" class="rev-google-nombre">
          ${r.autor || "Usuario de Google"}
        </a>
        <span class="rev-google-tiempo">${r.tiempo || ""}</span>
      </div>
      <img
        src="https://www.gstatic.com/images/branding/product/2x/maps_48dp.png"
        class="rev-google-logo"
        alt="Google"
      />
    </div>
    <div class="rev-google-estrellas">${renderEstrellas(r.rating)}</div>
    <p class="rev-google-texto">${r.texto || "<em>Sin comentario escrito.</em>"}</p>
  `;
  return card;
}

async function cargarResenas() {
  const contenedor = document.getElementById("google-reviews-cards");
  const totalEl = document.getElementById("google-reviews-total");
  const starsEl = document.getElementById("google-reviews-stars");
  const btnPrev = document.getElementById("rev-prev");
  const btnNext = document.getElementById("rev-next");
  const dotsEl = document.getElementById("rev-dots");

  if (!contenedor) return;

  try {
    const resp = await fetch(URL_RESENAS);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    if (starsEl) starsEl.innerHTML = renderEstrellas(data.rating || 0);
    if (totalEl)
      totalEl.textContent = `${data.total_resenas || 0} reseñas en Google`;

    const resenas = (data.resenas || []).filter((r) => r.rating === 5);

    if (!resenas.length) {
      contenedor.innerHTML = `<p class="rev-google-empty">No hay reseñas disponibles.</p>`;
      return;
    }

    let cur = 0;

    function isMobile() {
      return window.innerWidth <= 768;
    }

    function visibles() {
      return isMobile() ? 1 : 3;
    }

    function maxOffset() {
      return resenas.length - visibles();
    }

    function renderDots() {
      dotsEl.innerHTML = "";
      const max = maxOffset();
      for (let i = 0; i <= max; i++) {
        const dot = document.createElement("button");
        dot.className = "rev-dot" + (i === cur ? " active" : "");
        dot.setAttribute("aria-label", `Página ${i + 1}`);
        dot.addEventListener("click", () => ir(i));
        dotsEl.appendChild(dot);
      }
    }

    function renderCards() {
      contenedor.innerHTML = "";
      const v = visibles();

      // Ajustar grid según dispositivo
      contenedor.style.gridTemplateColumns =
        v === 1 ? "1fr" : "repeat(3, minmax(0, 1fr))";

      for (let i = cur; i < cur + v && i < resenas.length; i++) {
        contenedor.appendChild(crearTarjeta(resenas[i]));
      }
    }

    function actualizarControles() {
      dotsEl.querySelectorAll(".rev-dot").forEach((d, i) => {
        d.classList.toggle("active", i === cur);
      });
      btnPrev.disabled = cur === 0;
      btnNext.disabled = cur >= maxOffset();
    }

    function ir(idx) {
      cur = Math.max(0, Math.min(idx, maxOffset()));
      renderCards();
      actualizarControles();
    }

    btnPrev?.addEventListener("click", () => ir(cur - 1));
    btnNext?.addEventListener("click", () => ir(cur + 1));

    // Recalcular al cambiar tamaño de pantalla
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        cur = Math.min(cur, maxOffset());
        renderDots();
        renderCards();
        actualizarControles();
      }, 150);
    });

    // Init
    renderDots();
    renderCards();
    actualizarControles();
  } catch (err) {
    console.error("Error al cargar reseñas:", err);
    if (contenedor)
      contenedor.innerHTML = `<p class="rev-google-empty">No se pudieron cargar las reseñas.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", cargarResenas);
