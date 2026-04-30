// URLs corregidas con la ruta completa a Firebase
import { initializeApp } from "https://gstatic.com";
import { getFirestore } from "https://gstatic.com";

const firebaseConfig = {
  apiKey: "AIzaSyBC4jKdacTE3AMvku5rIjutFu7Qu2W5_vQ",
  authDomain: "lubricentro--ohiggins.firebaseapp.com", // Corregido aquí
  projectId: "lubricentro--ohiggins",
  storageBucket: "lubricentro--ohiggins.firebasestorage.app",
  messagingSenderId: "166455629287",
  appId: "1:166455629287:web:9df7082b9e3f2b0682e0d2",
  measurementId: "G-ZREHFV08W6",
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);

// Exportamos la base de datos
export const db = getFirestore(app);
