import { db } from "./firebase-config.js";
import {
  collection,
  writeBatch,
  doc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function importarDatos() {
  const response = await fetch("./history_.json"); // 🔁 cambiar archivo
  const data = await response.json();

  let batch = writeBatch(db);
  let operaciones = 0;
  let total = 0;

  for (const item of data) {
    if (!item.PATENTE || !item.FECHA) continue;

    const patente = item.PATENTE.trim().toUpperCase();
    const fecha = item.FECHA;
    const km = Number(item["KMS ACTUALES"]);

    // 🔥 ID ÚNICO (clave anti-duplicado)
    const id = `${patente}_${fecha}_${km}`;

    const ref = doc(db, "servicios", id);

    batch.set(ref, {
      patente,
      fecha,
      km,
      proximo: Number(item["KMS PROX. CAMBIO"]),
    });

    operaciones++;
    total++;

    // 🚦 batch más chico + pausa
    if (operaciones === 200) {
      await batch.commit();
      console.log("✔ Subidos:", total);

      batch = writeBatch(db);
      operaciones = 0;

      // 🔥 pausa para no quemar cuota
      await delay(800);
    }
  }

  if (operaciones > 0) {
    await batch.commit();
  }

  console.log("🚀 IMPORTACIÓN COMPLETA:", total);
}

importarDatos();
