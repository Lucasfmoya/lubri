import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function importarDatos() {
  try {
    const response = await fetch("../history.json");
    const data = await response.json();

    console.log("Datos cargados:", data.length);

    for (const item of data) {
      try {
        await addDoc(collection(db, "servicios"), {
          patente: item.PATENTE,
          km: item["KMS ACTUALES"],
          proximo: item["KMS PROX. CAMBIO"],
          fecha: item.FECHA,
        });

        console.log("✅ Cargado:", item.PATENTE);
      } catch (error) {
        console.error("❌ Error con:", item.PATENTE, error);
      }
    }

    console.log("🔥 IMPORTACIÓN COMPLETA");
  } catch (error) {
    console.error("💥 Error general:", error);
  }
}

importarDatos();
