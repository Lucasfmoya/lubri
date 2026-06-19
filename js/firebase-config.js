import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  CustomProvider,
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

// ─── App Check ───────────────────────────────────────
const hostname = window.location.hostname;

const IS_DEV = hostname === "localhost" || hostname === "127.0.0.1";

const DEBUG_TOKEN = "70EB639C-D351-4234-9EF2-A4536EB32C04"; // token de depuracion
const RECAPTCHA_SITE_KEY = "6LcOHyMtAAAAAGodjXFp64RVmDP5Nm1hS8RUUJSW"; //  Site Key de recaptcha v3

initializeAppCheck(app, {
  provider: IS_DEV
    ? new CustomProvider({
        getToken: () =>
          Promise.resolve({
            token: DEBUG_TOKEN,
            expireTimeMillis: Date.now() + 3600000,
          }),
      })
    : new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
  isTokenAutoRefreshEnabled: true,
});
// ─────────────────────────────────────────────────────

export const db = getFirestore(app);
export const auth = getAuth(app);
