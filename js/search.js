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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ patente }),
    },
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Error en backend");
  }

  return data;
}

// ============================
// BUSQUEDA PRINCIPAL
// ============================
async function ejecutarBusqueda() {
  let patente = input.value.trim().toUpperCase();
  input.value = patente;

  const regex = /^[A-Z]{3}[0-9]{3}$|^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;

  if (!patente) {
    contenedor.innerHTML = `
      <div class="alert alert-danger mt-3">
        Ingresá una patente
      </div>
    `;
    return;
  }

  if (!regex.test(patente)) {
    contenedor.innerHTML = `
      <div class="alert alert-danger mt-3">
        Formato inválido
      </div>
    `;
    return;
  }

  // cache
  if (cache.has(patente)) {
    render(cache.get(patente), patente);
    return;
  }

  btnBuscar.disabled = true;
  btnBuscar.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
  contenedor.innerHTML = `<p class="text-muted mt-3">Buscando...</p>`;

  try {
    const resultados = await buscarPorPatente(patente);

    cache.set(patente, resultados);
    render(resultados, patente);
  } catch (err) {
    console.error(err);

    contenedor.innerHTML = `
      <div class="alert alert-danger mt-3">
        Error al consultar la base de datos
      </div>
    `;
  } finally {
    btnBuscar.disabled = false;
    btnBuscar.innerHTML = `<i class="bi bi-search"></i>`;
  }
}

// ============================
// RENDER (RESPETA TU CSS)
// ============================
function render(data, patente) {
  if (!data.length) {
    contenedor.innerHTML = `
      <div class="alert alert-warning mt-3">
        No hay historial para <strong>${patente}</strong>
      </div>
    `;
    return;
  }

  let html = `
    <div class="table-container mt-3">
      <table class="table table-striped table-bordered align-middle custom-table">
        <thead class="table-dark">
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

  html += `
        </tbody>
      </table>
    </div>
  `;

  contenedor.innerHTML = html;
}

// ============================
// EVENTOS
// ============================

// click botón
btnBuscar.addEventListener("click", ejecutarBusqueda);

// enter
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    ejecutarBusqueda();
  }
});

// auto búsqueda (cuando termina de escribir)
input.addEventListener("input", () => {
  input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "");

  clearTimeout(debounceTimer);

  if (input.value.length >= 6) {
    debounceTimer = setTimeout(() => {
      ejecutarBusqueda();
    }, 600); // un poco más humano y estable
  }
});
