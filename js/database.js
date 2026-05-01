import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function buscarPorPatente(patente) {
  const q = query(collection(db, "servicios"), where("patente", "==", patente));

  const snapshot = await getDocs(q);

  if (snapshot.empty) return [];

  const resultados = [];

  snapshot.forEach((doc) => {
    resultados.push(doc.data());
  });

  // 🔥 eliminar duplicados
  const unicos = resultados.filter(
    (item, index, self) =>
      index ===
      self.findIndex(
        (t) =>
          t.fecha === item.fecha &&
          t.km === item.km &&
          t.patente === item.patente,
      ),
  );

  // 🔥 ORDEN REAL POR FECHA (IMPORTANTE)
  unicos.sort((a, b) => {
    const fechaA = new Date(a.fecha);
    const fechaB = new Date(b.fecha);
    return fechaB - fechaA; // más nuevo primero
  });

  return unicos;
}
