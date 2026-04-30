import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBC4jKdacTE3AMvku5rIjutFu7Qu2W5_vQ",
  authDomain: "lubricentro--ohiggins.firebaseapp.com",
  projectId: "lubricentro--ohiggins",
  storageBucket: "lubricentro--ohiggins.firebasestorage.app",
  messagingSenderId: "166455629207",
  appId: "1:166455629207:web:9df7002b9e3f2b0682e0d2",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
