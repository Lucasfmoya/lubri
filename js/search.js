/* =============================================
   LUBRICENTRO O'HIGGINS — search.js v3
   Dos modos:
   - Sin ?patente= → buscador normal (historial.html)
   - Con ?patente= → resultados directo en el hero
   ============================================= */

const regex = /^[A-Z]{3}[0-9]{3}$|^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;
const cache = new Map();

// Elementos modo buscador normal
const input = document.getElementById("buscarPatente");
const btnBuscar = document.getElementById("btnBuscar");
const contenedor = document.getElementById("resultado");

// Elementos modo resultados en hero
const modosBuscador = document.getElementById("modosBuscador");
const modosResultados = document.getElementById("modosResultados");
const seccionBajo = document.getElementById("seccionResultadosBajo");
const heroPlateTitle = document.getElementById("heroPlateTitle");
const heroCountLabel = document.getElementById("heroCountLabel");
const heroResultados = document.getElementById("heroResultadosCards");

// ============================
// FETCH BACKEND
// ============================
async function fetchPatente(patente) {
  const res = await fetch(
    "https://us-central1-lubricentro--ohiggins.cloudfunctions.net/buscarPorPatente",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patente }),
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error en backend`);
  return data;
}

// ============================
// SKELETON
// ============================
function skeletonHTML() {
  return `
    <div class="hst-skeleton-wrap">
      ${[1, 2]
        .map(
          () => `
        <div class="hst-skeleton-card">
          <div class="hst-sk-top">
            <div class="hst-sk-block wide"></div>
            <div class="hst-sk-block narrow"></div>
          </div>
          <div class="hst-sk-body">
            <div class="hst-sk-block mid"></div>
            <div class="hst-sk-block mid"></div>
          </div>
        </div>`,
        )
        .join("")}
    </div>`;
}

// ============================
// RENDER CARD
// ============================
function renderCard(d, patente, esMasReciente) {
  const meses = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  const partes = d.fecha ? d.fecha.split("-") : [];
  const dia = partes[2] ? parseInt(partes[2], 10) : "—";
  const mes = partes[1] ? meses[parseInt(partes[1], 10) - 1] : "";
  const anio = partes[0] || "";

  return `
    <div class="hst-record-card${esMasReciente ? " is-recent" : " is-old"}">
      <div class="hst-record-top">
        <div class="hst-record-date-wrap">
          <span class="hst-record-day">${dia}</span>
          <div class="hst-record-month-year">
            <span class="hst-record-month">${mes}</span>
            <span class="hst-record-year">${anio}</span>
          </div>
        </div>
        <div class="hst-record-top-right">
          ${esMasReciente ? `<span class="hst-tag-reciente"><i class="bi bi-star-fill"></i>Más reciente</span>` : ""}
          <span class="hst-plate-tag">${d.patente || patente}</span>
        </div>
      </div>
      <div class="hst-record-body">
        <div class="hst-record-stat">
          <div class="hst-record-stat-label"><i class="bi bi-speedometer2"></i>Km actuales</div>
          <div class="hst-record-stat-val">${d.km || "—"}</div>
        </div>
        <div class="hst-record-divider"></div>
        <div class="hst-record-stat">
          <div class="hst-record-stat-label"><i class="bi bi-arrow-right-circle"></i>Próximo service</div>
          <div class="hst-record-stat-val${esMasReciente ? " is-next" : ""}">${d.proximo || "—"}</div>
        </div>
      </div>
    </div>`;
}

// ============================
// RENDER RESULTADOS (genérico)
// ============================
function buildResultsHTML(data, patente) {
  const sorted = [...data].sort(
    (a, b) => new Date(b.fecha) - new Date(a.fecha),
  );
  const reciente = sorted[0];
  const anteriores = sorted.slice(1);

  const porAnio = {};
  anteriores.forEach((d) => {
    const anio = d.fecha ? d.fecha.split("-")[0] : "Sin fecha";
    if (!porAnio[anio]) porAnio[anio] = [];
    porAnio[anio].push(d);
  });
  const aniosOrdenados = Object.keys(porAnio).sort((a, b) => b - a);

  let acordeones = "";
  if (aniosOrdenados.length > 0) {
    acordeones = `<div class="hst-accordion-wrap" id="hstAccordion">`;
    aniosOrdenados.forEach((anio) => {
      const collapseId = `hst-collapse-${anio}`;
      const cards = porAnio[anio]
        .map((d) => renderCard(d, patente, false))
        .join("");
      acordeones += `
        <div class="hst-accordion-item">
          <button class="hst-accordion-btn" data-target="${collapseId}" aria-expanded="false">
            <span class="hst-accordion-year-label"><i class="bi bi-calendar3"></i>${anio}</span>
            <span class="hst-accordion-count">${porAnio[anio].length} service${porAnio[anio].length !== 1 ? "s" : ""}</span>
            <i class="bi bi-chevron-down hst-accordion-chevron"></i>
          </button>
          <div class="hst-accordion-body" id="${collapseId}">${cards}</div>
        </div>`;
    });
    acordeones += `</div>`;
  }

  const waText = encodeURIComponent(
    `Hola Lubricentro O'Higgins, encontré un error en el historial de service para la patente ${patente}. Quiero reportarlo.`,
  );
  const btnReporte = `
    <div class="hst-report-wrap">
      <a href="https://wa.me/5493516517525?text=${waText}" class="hst-report-btn" target="_blank" rel="noopener noreferrer">
        <i class="bi bi-exclamation-circle"></i> Reportar un error en mi historial
      </a>
    </div>`;

  return renderCard(reciente, patente, true) + acordeones + btnReporte;
}

// ============================
// BIND ACORDEON
// ============================
function bindAcordeon(scope) {
  scope.querySelectorAll(".hst-accordion-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const body = document.getElementById(btn.dataset.target);
      const isOpen = body.classList.contains("open");
      scope
        .querySelectorAll(".hst-accordion-body")
        .forEach((b) => b.classList.remove("open"));
      scope.querySelectorAll(".hst-accordion-btn").forEach((b) => {
        b.classList.remove("expanded");
        b.setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        body.classList.add("open");
        btn.classList.add("expanded");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });
}

// ============================
// SWEET ALERT
// ============================
function showAlert(msg, tipo = "info") {
  const titulos = {
    success: "Listo",
    error: "Ocurrió un error",
    warning: "Atención",
    info: "Información",
  };
  Swal.fire({
    title: titulos[tipo] || "Aviso",
    text: msg,
    icon: tipo,
    position: "center",
    timer: 3000,
    timerProgressBar: true,
    showConfirmButton: false,
    showCloseButton: true,
    background: "#ffffff",
    color: "#1e293b",
  });
}

/* ============================================================
   MODO A — Resultados directo en el hero (?patente= presente)
   ============================================================ */
async function modoResultadosHero(patente) {
  // Ocultar buscador, mostrar modo resultados
  modosBuscador.style.display = "none";
  modosResultados.style.display = "block";
  if (seccionBajo) seccionBajo.style.display = "none";

  heroPlateTitle.textContent = patente;
  heroCountLabel.textContent = "Buscando…";
  heroResultados.innerHTML = skeletonHTML();

  // Limpiar URL
  const url = new URL(window.location.href);
  url.searchParams.delete("patente");
  window.history.replaceState({}, "", url.toString());

  try {
    let data = cache.get(patente);
    if (!data) {
      data = await fetchPatente(patente);
      cache.set(patente, data);
    }

    gtag("event", "busqueda_patente", {
      event_category: "historial",
      event_label: data.length > 0 ? "encontrado" : "no_encontrado",
    });

    if (!data.length) {
      heroCountLabel.textContent = "Sin registros";
      heroResultados.innerHTML = `
        <div class="hst-hero-empty">
          <i class="bi bi-inbox"></i>
          <p>No hay historial registrado para <strong>${patente}</strong>.</p>
          <a href="./historial.html" class="btn btn-outline-light btn-sm">
            <i class="bi bi-arrow-left me-1"></i>Buscar otra patente
          </a>
        </div>`;
      return;
    }

    heroCountLabel.textContent = `${data.length} registro${data.length !== 1 ? "s" : ""}`;
    heroResultados.innerHTML = buildResultsHTML(data, patente);
    bindAcordeon(heroResultados);
  } catch (err) {
    console.error(err);
    heroCountLabel.textContent = "Error";
    heroResultados.innerHTML = `
      <div class="hst-hero-empty">
        <i class="bi bi-wifi-off"></i>
        <p>No se pudo cargar el historial. Intentá de nuevo.</p>
        <a href="./historial.html" class="btn btn-outline-light btn-sm mt-2">
          <i class="bi bi-arrow-left me-1"></i>Volver
        </a>
      </div>`;
  }
}

/* ============================================================
   MODO B — Buscador normal (sin ?patente=)
   ============================================================ */
let debounceTimer;

function mostrarSkeleton() {
  contenedor.innerHTML = skeletonHTML();
}

function render(data, patente) {
  if (!data.length) {
    contenedor.innerHTML = "";
    showAlert(`No hay historial registrado para ${patente}`, "info");
    return;
  }
  const header = `
    <div class="hst-results-header">
      <i class="bi bi-list-ul"></i>
      ${data.length} registro${data.length !== 1 ? "s" : ""} encontrado${data.length !== 1 ? "s" : ""} · ${patente}
    </div>`;

  contenedor.innerHTML = `<div class="hst-results-wrap fade-in">${header}${buildResultsHTML(data, patente)}</div>`;
  bindAcordeon(contenedor);
}

async function ejecutarBusqueda() {
  if (!input) return;
  let patente = input.value.trim().toUpperCase();
  input.value = patente;

  if (!patente) {
    contenedor.innerHTML = "";
    showAlert("Ingresá una patente", "warning");
    return;
  }
  if (!regex.test(patente)) {
    contenedor.innerHTML = "";
    showAlert("Formato de patente inválido", "warning");
    return;
  }

  if (cache.has(patente)) {
    seccionBajo.style.display = "block";
    render(cache.get(patente), patente);
    return;
  }

  btnBuscar.disabled = true;
  btnBuscar.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
  mostrarSkeleton();
  seccionBajo.style.display = "block";

  try {
    const resultados = await fetchPatente(patente);
    cache.set(patente, resultados);
    render(resultados, patente);
    gtag("event", "busqueda_patente", {
      event_category: "historial",
      event_label: resultados.length > 0 ? "encontrado" : "no_encontrado",
    });
  } catch (err) {
    console.error(err);
    contenedor.innerHTML = "";
    showAlert(err.message, "error");
  } finally {
    btnBuscar.disabled = false;
    btnBuscar.innerHTML = `<i class="bi bi-search"></i>`;
  }
}

// Eventos modo buscador normal
if (btnBuscar) {
  btnBuscar.addEventListener("click", ejecutarBusqueda);
}
if (input) {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      ejecutarBusqueda();
    }
  });
  input.addEventListener("input", () => {
    input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    clearTimeout(debounceTimer);
    if (input.value.length >= 6) {
      debounceTimer = setTimeout(() => ejecutarBusqueda(), 600);
    }
  });
}

/* ============================================================
   INIT — detectar modo al cargar
   ============================================================ */
(function init() {
  const params = new URLSearchParams(window.location.search);
  const param = params.get("patente");

  if (param) {
    const patente = param
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 7);
    if (regex.test(patente)) {
      modoResultadosHero(patente);
      return;
    }
  }

  // Sin param → mostrar buscador normal, ocultar sección de resultados bajo hero
  modosBuscador.style.display = "block";
  if (seccionBajo) seccionBajo.style.display = "none";
})();
