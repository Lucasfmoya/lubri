import { buscarPorPatente } from "./database.js";

const input = document.getElementById("buscarPatente");
const btnBuscar = document.getElementById("btnBuscar");
const contenedor = document.getElementById("resultado");

if (!input || !btnBuscar || !contenedor) {
  console.warn("Elementos no encontrados en el DOM");
}

// 🔒 cache simple (mejora rendimiento)
const cache = new Map();

// ⏱️ debounce (evita múltiples llamadas seguidas)
let debounceTimer;

// 🚀 función principal (UNA sola fuente de verdad)
async function ejecutarBusqueda() {
  let patente = input.value.trim().toUpperCase();

  // limpiar input visualmente
  input.value = patente;

  // 🔹 validación vacío
  if (!patente) {
    contenedor.innerHTML = `<p class="text-danger">Ingresá una patente</p>`;
    return;
  }

  // 🔹 validación formato
  const regexPatente = /^[A-Z]{3}[0-9]{3}$|^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;

  if (!regexPatente.test(patente)) {
    contenedor.innerHTML = `<p class="text-danger">Formato inválido</p>`;
    return;
  }

  // 🔥 cache
  if (cache.has(patente)) {
    renderizarResultados(cache.get(patente), patente);
    return;
  }

  // 🔹 UI loading
  btnBuscar.disabled = true;
  btnBuscar.innerText = "Buscando...";
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
    btnBuscar.innerText = "Buscar";
  }
}

// 🎯 render separado (más limpio)
function renderizarResultados(resultados, patente) {
  // 🔹 sin resultados
  if (resultados.length === 0) {
    contenedor.innerHTML = `
      <div class="alert alert-danger">
        No se encontró historial para <strong>${patente}</strong>
      </div>
    `;
    return;
  }

  // 🔥 eliminar duplicados
  const unicos = [];
  const vistos = new Set();

  resultados.forEach((item) => {
    const clave = `${item.patente}_${item.fecha}_${item.km}`;

    if (!vistos.has(clave)) {
      vistos.add(clave);
      unicos.push(item);
    }
  });

  // 🔹 ordenar por fecha
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

  tabla += `
        </tbody>
      </table>
    </div>
  `;

  contenedor.innerHTML = tabla;
}

//
// ===============================
// 🎮 EVENTOS (UX PRO)
// ===============================
//

// 👉 click botón
btnBuscar.addEventListener("click", ejecutarBusqueda);

// 👉 ENTER (PC + teclado mobile)
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    ejecutarBusqueda();
  }
});

// 👉 input limpio (solo letras y números + mayúsculas)
input.addEventListener("input", () => {
  input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // 🚀 AUTO BUSQUEDA con debounce (cuando llega a largo válido)
  clearTimeout(debounceTimer);

  if (input.value.length >= 6) {
    debounceTimer = setTimeout(() => {
      ejecutarBusqueda();
    }, 500);
  }
});
