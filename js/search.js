const input = document.getElementById("buscarPatente");
const btnBuscar = document.getElementById("btnBuscar");
const contenedor = document.getElementById("resultado");

const cache = new Map();
let debounceTimer;

// ============================
// FETCH BACKEND
// ============================
async function buscarPorPatente(patente) {
  const res = await fetch(
    "https://us-central1-lubricentro--ohiggins.cloudfunctions.net/buscarPorPatente",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patente }),
    },
  );

  const data = await res.json();

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error(
        "Demasiadas consultas. Esperá 1 minuto e intentá nuevamente.",
      );
    }
    throw new Error(data.error || "Error en backend");
  }

  return data;
}

// ============================
// SKELETON LOADER
// ============================
function mostrarSkeleton() {
  contenedor.innerHTML = `
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
        </div>
      `,
        )
        .join("")}
    </div>
  `;
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
          <div class="hst-record-stat-label">
            <i class="bi bi-speedometer2"></i>Km actuales
          </div>
          <div class="hst-record-stat-val">${d.km || "—"}</div>
        </div>
        <div class="hst-record-divider"></div>
        <div class="hst-record-stat">
          <div class="hst-record-stat-label">
            <i class="bi bi-arrow-right-circle"></i>Próximo service
          </div>
          <div class="hst-record-stat-val${esMasReciente ? " is-next" : ""}">${d.proximo || "—"}</div>
        </div>
      </div>
    </div>
  `;
}

// ============================
// RENDER PRINCIPAL
// ============================
function render(data, patente) {
  if (!data.length) {
    contenedor.innerHTML = "";
    showAlert(`No hay historial registrado para ${patente}`, "info");
    return;
  }

  // Ordenar por fecha descendente
  const sorted = [...data].sort(
    (a, b) => new Date(b.fecha) - new Date(a.fecha),
  );

  const reciente = sorted[0];
  const anteriores = sorted.slice(1);

  // Agrupar anteriores por año
  const porAnio = {};
  anteriores.forEach((d) => {
    const anio = d.fecha ? d.fecha.split("-")[0] : "Sin fecha";
    if (!porAnio[anio]) porAnio[anio] = [];
    porAnio[anio].push(d);
  });

  const aniosOrdenados = Object.keys(porAnio).sort((a, b) => b - a);

  // Header
  const header = `
    <div class="hst-results-header">
      <i class="bi bi-list-ul"></i>
      ${data.length} registro${data.length !== 1 ? "s" : ""} encontrado${data.length !== 1 ? "s" : ""} · ${patente}
    </div>
  `;

  // Card más reciente
  const cardReciente = renderCard(reciente, patente, true);

  // Acordeones por año (solo si hay anteriores)
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
          <button
            class="hst-accordion-btn"
            data-target="${collapseId}"
            aria-expanded="false"
          >
            <span class="hst-accordion-year-label">
              <i class="bi bi-calendar3"></i>${anio}
            </span>
            <span class="hst-accordion-count">${porAnio[anio].length} service${porAnio[anio].length !== 1 ? "s" : ""}</span>
            <i class="bi bi-chevron-down hst-accordion-chevron"></i>
          </button>
          <div class="hst-accordion-body" id="${collapseId}">
            ${cards}
          </div>
        </div>
      `;
    });

    acordeones += `</div>`;
  }

  const waText = encodeURIComponent(
    `Hola Lubricentro O'Higgins, encontré un error en el historial de service para la patente ${patente}. Quiero reportarlo.`,
  );
  const btnReporte = `
    <div class="hst-report-wrap">
      <a
        href="https://wa.me/5493516517525?text=${waText}"
        class="hst-report-btn"
        target="_blank"
        rel="noopener noreferrer"
      >
        <i class="bi bi-exclamation-circle"></i>
        Reportar un error en mi historial
      </a>
    </div>
  `;

  contenedor.innerHTML = `
    <div class="hst-results-wrap fade-in">
      ${header}
      ${cardReciente}
      ${acordeones}
      ${btnReporte}
    </div>
  `;

  // Lógica de los acordeones
  contenedor.querySelectorAll(".hst-accordion-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      const body = document.getElementById(targetId);
      const isOpen = body.classList.contains("open");

      // Cerrar todos
      contenedor
        .querySelectorAll(".hst-accordion-body")
        .forEach((b) => b.classList.remove("open"));
      contenedor.querySelectorAll(".hst-accordion-btn").forEach((b) => {
        b.classList.remove("expanded");
        b.setAttribute("aria-expanded", "false");
      });

      // Abrir el clickeado si estaba cerrado
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
    customClass: {
      popup: "swal-admin-popup",
      title: "swal-admin-title",
      htmlContainer: "swal-admin-text",
    },
  });
}

// ============================
// BUSQUEDA PRINCIPAL
// ============================
async function ejecutarBusqueda() {
  let patente = input.value.trim().toUpperCase();
  input.value = patente;

  const regex = /^[A-Z]{3}[0-9]{3}$|^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;

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
    render(cache.get(patente), patente);
    return;
  }

  btnBuscar.disabled = true;
  btnBuscar.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
  mostrarSkeleton();

  try {
    const resultados = await buscarPorPatente(patente);
    cache.set(patente, resultados);
    render(resultados, patente);
  } catch (err) {
    console.error(err);
    contenedor.innerHTML = "";
    showAlert(err.message, "error");
  } finally {
    btnBuscar.disabled = false;
    btnBuscar.innerHTML = `<i class="bi bi-search"></i>`;
  }
}

// ============================
// EVENTOS
// ============================
btnBuscar.addEventListener("click", ejecutarBusqueda);

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
