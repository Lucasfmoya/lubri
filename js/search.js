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
// SKELETON LOADER (RESPONSIVE)
// ============================
function mostrarSkeleton() {
  contenedor.innerHTML = `
    <div class="skeleton-table">
      ${Array.from({ length: 5 })
        .map(
          () => `
        <div class="skeleton-row">
          <div class="skeleton skeleton-cell"></div>
          <div class="skeleton skeleton-cell"></div>
          <div class="skeleton skeleton-cell"></div>
          <div class="skeleton skeleton-cell"></div>
        </div>
      `,
        )
        .join("")}
    </div>
    <div class="skeleton-card">
      ${Array.from({ length: 3 })
        .map(
          () => `
        <div class="skeleton-card-item">
          <div class="skeleton skeleton-line long"></div>
          <div class="skeleton skeleton-line medium"></div>
          <div class="skeleton skeleton-line short"></div>
          <div class="skeleton skeleton-line medium"></div>
        </div>
      `,
        )
        .join("")}
    </div>
  `;
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
// RENDER
// ============================
function render(data, patente) {
  if (!data.length) {
    contenedor.innerHTML = "";
    showAlert(`No hay historial para ${patente}`, "info");
    return;
  }

  let html = `
    <div class="table-container mt-3 fade-in">
      <table class="table table-striped align-middle custom-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Patente</th>
            <th>Km actuales</th>
            <th>Próximo service</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.forEach((d) => {
    const fecha = d.fecha ? d.fecha.split("-").reverse().join("/") : "-";
    html += `
      <tr>
        <td data-label="Fecha">${fecha}</td>
        <td data-label="Patente">${d.patente || "-"}</td>
        <td data-label="Km actuales">${d.km || "-"}</td>
        <td data-label="Próximo service">${d.proximo || "-"}</td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  contenedor.innerHTML = html;
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
    timer: 3000,
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
