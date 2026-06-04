/* =============================================
   LUBRICENTRO O'HIGGINS — review.js
   Carga reseñas desde la Cloud Function
   (que a su vez consulta Google Places API)
   ============================================= */

// URL de tu Cloud Function (la obtenés tras deployar)
// Formato: https://us-central1-lubricentro--ohiggins.cloudfunctions.net/obtenerResenas
const URL_RESENAS = "https://obtenerresenas-pbgzdzmh5q-uc.a.run.app";

/* ── Generar estrellas SVG ───────────────────── */
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

/* ── Iniciales del autor (fallback foto) ────── */
function iniciales(nombre) {
  if (!nombre) return "?";
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

/* ── Render de una tarjeta ───────────────────── */
function crearTarjeta(r) {
  const card = document.createElement("div");
  card.className = "rev-google-card";

  // Avatar: usa foto de Google si existe, sino iniciales
  const avatarHTML = r.foto
    ? `<img src="${r.foto}" alt="${r.autor}" class="rev-google-avatar-img" referrerpolicy="no-referrer" />`
    : `<div class="rev-google-avatar-txt">${iniciales(r.autor)}</div>`;

  card.innerHTML = `
    <div class="rev-google-head">
      <div class="rev-google-avatar">${avatarHTML}</div>
      <div class="rev-google-meta">
        <a href="${r.url_autor || "#"}" target="_blank" rel="noopener noreferrer" class="rev-google-nombre">
          ${r.autor || "Usuario de Google"}
        </a>
        <span class="rev-google-tiempo">${r.tiempo || ""}</span>
      </div>
      <img src="https://www.gstatic.com/images/branding/product/2x/maps_48dp.png"
           class="rev-google-logo" alt="Google" />
    </div>
    <div class="rev-google-estrellas">${renderEstrellas(r.rating)}</div>
    <p class="rev-google-texto">${r.texto || "<em>Sin comentario escrito.</em>"}</p>
  `;

  return card;
}

/* ── Función principal ───────────────────────── */
async function cargarResenas() {
  const contenedor = document.getElementById("google-reviews-cards");
  const scoreEl = document.getElementById("google-reviews-score");
  const totalEl = document.getElementById("google-reviews-total");
  const starsEl = document.getElementById("google-reviews-stars");

  if (!contenedor) return;

  try {
    const resp = await fetch(URL_RESENAS);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    // Score global
    if (scoreEl) scoreEl.textContent = data.rating?.toFixed(1) || "—";
    if (totalEl)
      totalEl.textContent = `${data.total_resenas || 0} reseñas en Google`;
    if (starsEl) starsEl.innerHTML = renderEstrellas(data.rating || 0);

    // Tarjetas
    contenedor.innerHTML = "";

    if (!data.resenas || data.resenas.length === 0) {
      contenedor.innerHTML = `<p class="rev-google-empty">No hay reseñas disponibles.</p>`;
      return;
    }

    // Google devuelve hasta 5 reseñas ordenadas por relevancia
    data.resenas.forEach((r) => {
      contenedor.appendChild(crearTarjeta(r));
    });
  } catch (err) {
    console.error("Error al cargar reseñas:", err);
    if (contenedor)
      contenedor.innerHTML = `<p class="rev-google-empty">No se pudieron cargar las reseñas.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", cargarResenas);
