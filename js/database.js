import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, query, where } from "https://gstatic.com";

// 1. Función para guardar un servicio nuevo (Cambio de aceite, filtros, etc.)
export const guardarServicio = async (datos) => {
  try {
    const docRef = await addDoc(collection(db, "servicios"), {
      ...datos,
      fechaCreacion: new Date().toLocaleString(), // Agrega fecha automática
    });
    return docRef.id;
  } catch (error) {
    console.error("Error al guardar en base de datos:", error);
    throw error;
  }
};

// 2. Función para buscar un vehículo por patente
export const buscarPorPatente = async (patente) => {
  try {
    const q = query(
      collection(db, "servicios"),
      where("patente", "==", patente),
    );
    const querySnapshot = await getDocs(q);
    const resultados = [];
    querySnapshot.forEach((doc) => {
      resultados.push({ id: doc.id, ...doc.data() });
    });
    return resultados;
  } catch (error) {
    console.error("Error al buscar patente:", error);
    throw error;
  }
};
