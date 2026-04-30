import { buscarPorPatente } from "./database.js";

const btnBuscar = document.getElementById("btnBuscar");

if (btnBuscar) {
  btnBuscar.addEventListener("click", async () => {
    const input = document.getElementById("buscarPatente");
    const contenedor = document.getElementById("resultado");

    if (!input || !contenedor) return;

    let patente = input.value.trim().toUpperCase();

    // Validación vacío
    if (!patente) {
      contenedor.innerHTML = `<p class="text-danger">Ingresá una patente</p>`;
      return;
    }

    // Validación formato
    const regexPatente = /^[A-Z]{3}[0-9]{3}$|^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;

    if (!regexPatente.test(patente)) {
      contenedor.innerHTML = `<p class="text-danger">Formato inválido</p>`;
      return;
    }

    btnBuscar.disabled = true;
    btnBuscar.innerText = "Buscando...";

    contenedor.innerHTML = `<p class="text-muted">Buscando...</p>`;

    try {
      const resultados = await buscarPorPatente(patente);

      if (resultados.length === 0) {
        contenedor.innerHTML = `
          <div class="alert alert-danger">
            No se encontró historial para <strong>${patente}</strong>
          </div>
        `;
        return;
      }

      // 🔥 tabla simple con datos de Firebase
      let tabla = `
        <div class="table-responsive">
          <table class="table table-bordered table-striped">
            <thead class="table-dark">
              <tr>
                <th>Fecha</th>
                <th>Kilómetros</th>
                <th>Aceite</th>
                <th>Cliente</th>
              </tr>
            </thead>
            <tbody>
      `;

      resultados.forEach((item) => {
        const fecha = item.fecha
          ? new Date(item.fecha).toLocaleDateString("es-AR")
          : "-";

        tabla += `
          <tr>
            <td>${fecha}</td>
            <td>${item.km || "-"}</td>
            <td>${item.aceite || "-"}</td>
            <td>${item.cliente || "-"}</td>
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
