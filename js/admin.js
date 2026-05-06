import { db, auth } from "./firebase-config.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   🔐 AUTH
========================= */
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

/* =========================
   🧠 STATE
========================= */
let userToken = null;
let archivo = null;

/* =========================
   🎯 ELEMENTOS
========================= */
const btnLogin = document.getElementById("btnLogin");
const btnLoginBtn = document.getElementById("btnLoginBtn");
const adminPanel = document.getElementById("adminPanel");
const btnLogout = document.getElementById("btnLogout");
const btnEliminar = document.getElementById("btnEliminar");
const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const btnSubir = document.getElementById("btnSubir");
const log = document.getElementById("log");
const fileInfo = document.getElementById("fileInfo");

const FUNCTION_URL = "https://importarservicios-pbgzdzmh5q-uc.a.run.app";

/* =========================
   🧾 LOG
========================= */
function logMsg(msg) {
  if (!log) return;
  log.innerHTML += `<div>${msg}</div>`;
  log.scrollTop = log.scrollHeight;
}

/* =========================
   🔔 TOASTIFY
========================= */
function showToast(msg, tipo = "info") {
  const colores = {
    success: "linear-gradient(to right, #00b09b, #96c93d)",
    error: "linear-gradient(to right, #ff5f6d, #ffc371)",
    warning: "linear-gradient(to right, #f7971e, #ffd200)",
    info: "linear-gradient(to right, #2193b0, #6dd5ed)",
  };

  Toastify({
    text: msg,
    duration: 4000,
    gravity: "top",
    position: "right",
    stopOnFocus: true,
    style: { background: colores[tipo] ?? colores.info },
  }).showToast();
}

/* =========================
   🧹 LIMPIAR ARCHIVO
========================= */
function limpiarArchivo() {
  archivo = null;
  fileInput.value = "";
  if (fileInfo) fileInfo.innerHTML = "";
  if (btnSubir) btnSubir.disabled = true;
  if (btnEliminar) btnEliminar.style.display = "none";
}

/* =========================
   🔎 ADMIN CHECK
========================= */
async function esAdmin(email) {
  try {
    const ref = doc(db, "admins", email);
    const snap = await getDoc(ref);
    return snap.exists();
  } catch (err) {
    console.error("Error verificando admin:", err);
    return false;
  }
}

/* =========================
   🔐 LOGIN CON POPUP
========================= */
btnLoginBtn?.addEventListener("click", async () => {
  try {
    sessionStorage.setItem("loginManual", "clicking");
    await setPersistence(auth, browserSessionPersistence);
    await signInWithPopup(auth, provider);
    sessionStorage.setItem("loginManual", "loggedIn");
  } catch (err) {
    sessionStorage.removeItem("loginManual");
    console.error("LOGIN ERROR:", err.code, err.message);
    showToast("❌ Error al iniciar sesión: " + err.message, "error");
  }
});

/* =========================
   🚪 LOGOUT
========================= */
btnLogout?.addEventListener("click", async () => {
  sessionStorage.removeItem("loginManual");
  await signOut(auth);
  showToast("👋 Sesión cerrada", "info");
});

/* =========================
   👁️ AUTH STATE
========================= */
onAuthStateChanged(auth, async (user) => {
  console.log("AUTH STATE:", user?.email ?? "sin usuario");

  if (!btnLogin || !adminPanel) return;

  btnLogin.style.display = "block";
  adminPanel.style.display = "none";
  userToken = null;

  if (!user) return;

  const flag = sessionStorage.getItem("loginManual");

  if (flag !== "clicking" && flag !== "loggedIn") {
    await signOut(auth);
    return;
  }

  const ok = await esAdmin(user.email);

  if (!ok) {
    sessionStorage.removeItem("loginManual");
    await signOut(auth);
    showToast("⛔ No autorizado: " + user.email, "error");
    return;
  }

  userToken = await user.getIdToken();
  sessionStorage.setItem("loginManual", "loggedIn");

  const emailSpan = document.getElementById("userEmailSpan");
  if (emailSpan) emailSpan.textContent = user.email;

  btnLogin.style.display = "none";
  adminPanel.style.display = "block";

  showToast("✅ Bienvenido: " + user.email, "success");
});

/* =========================
   📂 FILE
========================= */
dropZone?.addEventListener("click", () => fileInput.click());

dropZone?.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.style.borderColor = "#e30613";
  dropZone.style.background = "rgba(227,6,19,0.07)";
});

dropZone?.addEventListener("dragleave", () => {
  dropZone.style.borderColor = "";
  dropZone.style.background = "";
});

dropZone?.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.style.borderColor = "";
  dropZone.style.background = "";

  const file = e.dataTransfer.files[0];
  if (!file) return;

  const extensionesValidas = [".xlsx", ".xls"];
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

  if (!extensionesValidas.includes(extension)) {
    showToast("❌ Solo se aceptan archivos Excel (.xlsx, .xls)", "error");
    return;
  }

  archivo = file;
  if (fileInfo) fileInfo.innerHTML = archivo.name;
  if (btnSubir) btnSubir.disabled = false;
  if (btnEliminar) btnEliminar.style.display = "inline-block";
});

fileInput?.addEventListener("change", (e) => {
  archivo = e.target.files[0];
  if (fileInfo) fileInfo.innerHTML = archivo?.name || "";
  if (btnSubir) btnSubir.disabled = !archivo;
  if (btnEliminar)
    btnEliminar.style.display = archivo ? "inline-block" : "none";
});

/* =========================
   🗑️ ELIMINAR ARCHIVO
========================= */
btnEliminar?.addEventListener("click", () => {
  limpiarArchivo();
  showToast("🗑️ Archivo quitado", "info");
});

/* =========================
   🚀 SUBIR EXCEL
========================= */
btnSubir?.addEventListener("click", async () => {
  if (!archivo || !userToken) {
    showToast("❌ Falta archivo o login", "warning");
    return;
  }

  logMsg("📊 Procesando Excel...");
  showToast("📊 Procesando...", "info");

  try {
    const user = auth.currentUser;
    if (user) userToken = await user.getIdToken(true);

    const data = await archivo.arrayBuffer();
    const wb = XLSX.read(data);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, {
      raw: false,
      dateNF: "yyyy-mm-dd",
    });

    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify(json),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error ?? "Error desconocido");

    logMsg("✅ Importados: " + result.total);
    showToast("✅ Importados: " + result.total, "success");
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    logMsg("❌ Error: " + err.message);
    showToast("❌ Error al subir datos: " + err.message, "error");
  } finally {
    limpiarArchivo();
  }
});
