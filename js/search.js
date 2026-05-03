import { buscarPorPatente } from "./database.js";

const input = document.getElementById("buscarPatente");
const btnBuscar = document.getElementById("btnBuscar");
const contenedor = document.getElementById("resultado");

if (!input || !btnBuscar || !contenedor) {
  console.warn("Elementos no encontrados en el DOM");
}

// 🔒 cache simple
const cache = new Map();

// ⏱️ debounce
let debounceTimer;

// 🚀 función principal
async function ejecutarBusqueda() {
  let patente = input.value.trim().toUpperCase();
  input.value = patente;

  const regexPatente = /^[A-Z]{3}[0-9]{3}$|^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;

  if (!patente) {
    contenedor.innerHTML = `<p class="text-danger">Ingresá una patente</p>`;
    return;
  }

  if (!regexPatente.test(patente)) {
    contenedor.innerHTML = `<p class="text-danger">Formato inválido</p>`;
    return;
  }

  if (cache.has(patente)) {
    renderizarResultados(cache.get(patente), patente);
    return;
  }

  btnBuscar.disabled = true;
  btnBuscar.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
  contenedor.innerHTML = `<p class="text-muted">Buscando...</p>`;

  try {
    const resultados = await buscarPorPatente(patente);
    cache.set(patente, resultados);
    renderizarResultados(resultados, patente);
  } catch (error) {
    console.error(error);
    contenedor.innerHTML = `
      <div class="alert alert-danger">
        Error al consultar la base de datos
      </div>
    `;
  } finally {
    btnBuscar.disabled = false;
    btnBuscar.innerHTML = `<i class="bi bi-search"></i>`;
  }
}

// 🎯 render
function renderizarResultados(resultados, patente) {
  if (resultados.length === 0) {
    contenedor.innerHTML = `
      <div class="alert alert-danger">
        No se encontró historial para <strong>${patente}</strong>
      </div>
    `;
    return;
  }

  const unicos = [];
  const vistos = new Set();

  resultados.forEach((item) => {
    const clave = `${item.patente}_${item.fecha}_${item.km}`;
    if (!vistos.has(clave)) {
      vistos.add(clave);
      unicos.push(item);
    }
  });

  unicos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  let tabla = `
    <div class="table-responsive">
      <table class="table table-bordered table-striped">
        <thead class="table-dark">
          <tr>
            <th>Fecha</th>
            <th>Patente</th>
            <th>Kms actuales</th>
            <th>Próximo cambio</th>
          </tr>
        </thead>
        <tbody>
  `;

  unicos.forEach((item) => {
    const fecha = item.fecha ? item.fecha.split("-").reverse().join("/") : "-";

    tabla += `
      <tr>
        <td>${fecha}</td>
        <td>${item.patente || "-"}</td>
        <td>${item.km || "-"}</td>
        <td>${item.proximo || "-"}</td>
      </tr>
    `;
  });

  tabla += `</tbody></table></div>`;
  contenedor.innerHTML = tabla;
}

//
// ===============================
// 🎮 EVENTOS
// ===============================
//

// 👉 click
btnBuscar.addEventListener("click", ejecutarBusqueda);

// 👉 ENTER (mejor que keypress)
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    ejecutarBusqueda();
  }
});

// 👉 limpieza + auto búsqueda
input.addEventListener("input", () => {
  input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "");

  clearTimeout(debounceTimer);

  if (input.value.length >= 6) {
    debounceTimer = setTimeout(ejecutarBusqueda, 500);
  }
});

// 👉 FIX MOBILE (scroll al foco)
input.addEventListener("focus", () => {
  setTimeout(() => {
    document.querySelector(".search-box")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 300);
});
