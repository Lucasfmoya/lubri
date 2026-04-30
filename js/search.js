import { buscarPorPatente } from "./database.js";

const btnBuscar = document.getElementById("btnBuscar");

if (btnBuscar) {
  btnBuscar.addEventListener("click", async () => {
    const input = document.getElementById("buscarPatente");
    const contenedor = document.getElementById("resultado");

    if (!input || !contenedor) return;

    let patente = input.value.trim().toUpperCase();

    // 🔹 Validación vacío
    if (!patente) {
      contenedor.innerHTML = `<p class="text-danger">Ingresá una patente</p>`;
      return;
    }

    // 🔹 Validación formato
    const regexPatente = /^[A-Z]{3}[0-9]{3}$|^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;

    if (!regexPatente.test(patente)) {
      contenedor.innerHTML = `<p class="text-danger">Formato inválido</p>`;
      return;
    }

    // 🔹 UI loading
    btnBuscar.disabled = true;
    btnBuscar.innerText = "Buscando...";
    contenedor.innerHTML = `<p class="text-muted">Buscando...</p>`;

    try {
      const resultados = await buscarPorPatente(patente);

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

      // 🔹 ordenar por fecha (más nuevo primero)
      unicos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      // 🔥 armar tabla
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
        const fecha = item.fecha
          ? item.fecha.split("-").reverse().join("/")
          : "-";

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
  });
}
