import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Buscar por patente (solo lectura)
export const buscarPorPatente = async (patente) => {
  const q = query(
    collection(db, "servicios"),
    where("patente", "==", (patente || "").toUpperCase()),
    orderBy("fecha", "desc") // 🔥 clave: más nuevo primero
  );

  const snapshot = await getDocs(q);

  const resultados = [];
  snapshot.forEach((doc) => {
    resultados.push({ id: doc.id, ...doc.data() });
  });

  return resultados;
};
