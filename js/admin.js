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
   🧠 STATE
========================= */
let userToken = null;
let archivo = null;
let authReady = false;

/* =========================
   🎯 ELEMENTOS
========================= */
const btnLogin = document.getElementById("btnLogin");
const btnLoginBtn = document.getElementById("btnLoginBtn");
const adminPanel = document.getElementById("adminPanel");
const authLoader = document.getElementById("authLoader"); // 👈 declarado
const btnLogout = document.getElementById("btnLogout");
const btnEliminar = document.getElementById("btnEliminar");
const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const btnSubir = document.getElementById("btnSubir");
const log = document.getElementById("log");
const fileInfo = document.getElementById("fileInfo");

const FUNCTION_URL = "https://importarservicios-pbgzdzmh5q-uc.a.run.app";

// Ocultar login y panel hasta que Firebase resuelva
btnLogin.style.display = "none";
adminPanel.style.display = "none";

/* =========================
   🔐 AUTH
========================= */
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

/* =========================
   🔔 SWEETALERT
========================= */
function showToast(msg, tipo = "info") {
  const titulos = {
    success: "Listo",
    error: "Ocurrió un error",
    warning: "Atención",
    info: "Información",
  };

  Swal.fire({
    title: titulos[tipo] || "Aviso",
    text: msg,
    icon: tipo,
    position: "center",
    timer: 3000,
    timerProgressBar: true,
    showConfirmButton: false,
    showCloseButton: true,
    background: "#ffffff",
    color: "#1e293b",
    iconColor:
      tipo === "error"
        ? "#e30613"
        : tipo === "success"
          ? "#22c55e"
          : tipo === "warning"
            ? "#f59e0b"
            : "#38bdf8",
    customClass: {
      popup: "swal-admin-popup",
      title: "swal-admin-title",
      htmlContainer: "swal-admin-text",
    },
  });
}

/* =========================
   🧾 LOG
========================= */
function logMsg(msg) {
  if (!log) return;
  log.innerHTML += `<div>${msg}</div>`;
  log.scrollTop = log.scrollHeight;
}

/* =========================
   🧹 LIMPIAR
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
    console.error(err);
    return false;
  }
}

/* =========================
   🔐 LOGIN
========================= */
btnLoginBtn?.addEventListener("click", async () => {
  try {
    sessionStorage.setItem("loginManual", "clicking");

    await signOut(auth);
    await setPersistence(auth, browserSessionPersistence);
    await signInWithPopup(auth, provider);

    sessionStorage.setItem("loginManual", "loggedIn");
  } catch (err) {
    sessionStorage.removeItem("loginManual");
    showToast("Error login: " + err.message, "error");
  }
});

/* =========================
   🚪 LOGOUT
========================= */
btnLogout?.addEventListener("click", async () => {
  sessionStorage.removeItem("loginManual");
  await signOut(auth);
  showToast("Sesión cerrada", "info");
});

/* =========================
   👁️ AUTH STATE
========================= */
onAuthStateChanged(auth, async (user) => {
  if (authLoader) authLoader.style.display = "none";

  if (!authReady) {
    authReady = true;
    // Si hay sesión activa, dejar que continúe el flujo normalmente
    // Si no hay sesión, mostrar login y cortar
    if (!user) {
      btnLogin.style.display = "block";
      return;
    }
  }

  btnLogin.style.display = "block";
  adminPanel.style.display = "none";
  userToken = null;

  if (!user) {
    btnLogin.style.display = "block";
    return;
  }

  const flag = sessionStorage.getItem("loginManual");

  if (flag !== "clicking" && flag !== "loggedIn") {
    await signOut(auth);
    btnLogin.style.display = "block";
    return;
  }

  const ok = await esAdmin(user.email);

  if (!ok) {
    sessionStorage.removeItem("loginManual");
    await signOut(auth);
    btnLogin.style.display = "block";
    showToast("No autorizado", "error");
    return;
  }

  userToken = await user.getIdToken();
  document.getElementById("userEmailSpan").textContent = user.email;
  btnLogin.style.display = "none";
  adminPanel.style.display = "block";

  showToast("Bienvenido " + user.email, "success");
});

/* =========================
   📂 FILE
========================= */
dropZone?.addEventListener("click", () => fileInput.click());

dropZone?.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.stopPropagation();
});

dropZone?.addEventListener("drop", (e) => {
  e.preventDefault();
  e.stopPropagation();

  const file = e.dataTransfer.files[0];
  if (!file) return;

  const validos = [".xlsx", ".xls"];
  const esValido = validos.some((ext) => file.name.endsWith(ext));

  if (!esValido) {
    showToast("Solo se aceptan archivos Excel (.xlsx, .xls)", "warning");
    return;
  }

  archivo = file;
  fileInfo.innerHTML = file.name;
  btnSubir.disabled = false;
  btnEliminar.style.display = "inline-block";
});

fileInput?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  archivo = file;
  fileInfo.innerHTML = file.name;
  btnSubir.disabled = false;
  btnEliminar.style.display = "inline-block";
});

/* =========================
   🗑️ ELIMINAR
========================= */
btnEliminar?.addEventListener("click", async () => {
  const result = await Swal.fire({
    title: "¿Quitar archivo?",
    text: "Tendrás que volver a seleccionarlo.",
    icon: "warning",
    background: "#ffffff",
    color: "#1e293b",
    showCancelButton: true,
    confirmButtonText: "Sí, quitar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#e30613",
    cancelButtonColor: "#334155",
    showCloseButton: true,
    customClass: {
      popup: "swal-admin-popup",
      title: "swal-admin-title",
      htmlContainer: "swal-admin-text",
    },
  });

  if (result.isConfirmed) {
    limpiarArchivo();
    showToast("Archivo eliminado", "info");
  }
});

/* =========================
   🚀 SUBIR
========================= */
btnSubir?.addEventListener("click", async () => {
  if (!archivo || !userToken) {
    showToast("Falta archivo o login", "warning");
    return;
  }

  try {
    const user = auth.currentUser;
    if (user) userToken = await user.getIdToken(true);

    const data = await archivo.arrayBuffer();
    const wb = XLSX.read(data);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify(json),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error);

    logMsg("Importados: " + result.total);
    showToast("Importados: " + result.total, "success");
  } catch (err) {
    console.error(err);
    logMsg("Error: " + err.message);
    showToast(err.message, "error");
  } finally {
    limpiarArchivo();
  }
});
