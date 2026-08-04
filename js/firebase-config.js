import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";

const firebaseConfig = {
  apiKey: "AIzaSyBC4jKdacTE3AMvku5rIjutFu7Qu2W5_vQ",
  authDomain: "lubricentro--ohiggins.firebaseapp.com",
  projectId: "lubricentro--ohiggins",
  storageBucket: "lubricentro--ohiggins.firebasestorage.app",
  messagingSenderId: "166455629207",
  appId: "1:166455629207:web:9df7002b9e3f2b0682e0d2",
};

const app = initializeApp(firebaseConfig);

const RECAPTCHA_SITE_KEY = "6LcOHyMtAAAAAGodjXFp64RVmDP5Nm1hS8RUUJSW";

if (!window.location.pathname.includes("admin")) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);