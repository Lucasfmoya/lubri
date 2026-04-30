import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Guardar servicio
export const guardarServicio = async (datos) => {
  const docRef = await addDoc(collection(db, "servicios"), {
    ...datos,
    fecha: new Date().toISOString(),
  });
  return docRef.id;
};

// Buscar por patente
export const buscarPorPatente = async (patente) => {
  const q = query(
    collection(db, "servicios"),
    where("patente", "==", patente.toUpperCase()),
  );

  const snapshot = await getDocs(q);

  const resultados = [];
  snapshot.forEach((doc) => {
    resultados.push({ id: doc.id, ...doc.data() });
  });

  return resultados;
};
