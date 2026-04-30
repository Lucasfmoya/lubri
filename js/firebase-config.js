import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "52866048",
  authDomain: "lubricentro--ohiggins.firebaseapp.com",
  projectId: "lubricentro--ohiggins",
  storageBucket: "lubricentro--ohiggins.appspot.com",
  messagingSenderId: "166455629287",
  appId: "1:166455629287:web:9df7082b9e3f2b0682e0d2",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
