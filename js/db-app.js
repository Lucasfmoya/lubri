import { guardarServicio, buscarPorPatente } from "./database.js";

// ===== GUARDAR =====
const btnGuardar = document.getElementById("btnGuardar");

if (btnGuardar) {
  btnGuardar.addEventListener("click", async (e) => {
    e.preventDefault();

    const datos = {
      patente: document
        .getElementById("inputPatente")
        ?.value.trim()
        .toUpperCase(),
      aceite: document.getElementById("inputAceite")?.value,
      km: document.getElementById("inputKm")?.value,
      cliente: document.getElementById("inputNombre")?.value,
    };

    try {
      await guardarServicio(datos);
      alert("Servicio guardado ✅");
    } catch (error) {
      console.error(error);
      alert("Error ❌");
    }
  });
}

// ===== BUSCAR =====
const btnBuscar = document.getElementById("btnBuscar");

if (btnBuscar) {
  btnBuscar.addEventListener("click", async () => {
    const patente = document.getElementById("buscarPatente")?.value;

    const resultados = await buscarPorPatente(patente);
    const contenedor = document.getElementById("resultado");

    if (!contenedor) return;

    contenedor.innerHTML = "";

    if (resultados.length === 0) {
      contenedor.innerHTML = `<p class="text-danger">No encontrado</p>`;
      return;
    }

    resultados.forEach((item) => {
      contenedor.innerHTML += `
        <div class="card p-2 mb-2">
          ${item.patente} - ${item.km} km
        </div>
      `;
    });
  });
}
