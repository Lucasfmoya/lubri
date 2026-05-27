import { db, auth } from "./firebase-config.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserSessionPersistence,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let userToken = null;
let archivo = null;
let authReady = false;

// --- elementos existentes ---
const btnLogin        = document.getElementById("btnLogin");
const btnLoginBtn     = document.getElementById("btnLoginBtn");
const adminPanel      = document.getElementById("adminPanel");
const authLoader      = document.getElementById("authLoader");
const btnLogout       = document.getElementById("btnLogout");
const btnEliminar     = document.getElementById("btnEliminar");
const fileInput       = document.getElementById("fileInput");
const dropZone        = document.getElementById("dropZone");
const btnSubir        = document.getElementById("btnSubir");
const log             = document.getElementById("log");
const fileInfo        = document.getElementById("fileInfo");

// --- nuevos elementos ---
const emailInput      = document.getElementById("emailInput");
const passInput       = document.getElementById("passInput");
const btnLoginEmail   = document.getElementById("btnLoginEmail");
const changePassForm  = document.getElementById("changePassForm");
const btnChangePass   = document.getElementById("btnChangePass");

const FUNCTION_URL = "https://importarservicios-pbgzdzmh5q-uc.a.run.app";

btnLogin.style.display   = "none";
adminPanel.style.display = "none";

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// ── helpers ──────────────────────────────────────────────────────────────
function showToast(msg, tipo = "info") {
  const titulos = { success:"Listo", error:"Ocurrió un error", warning:"Atención", info:"Información" };
  Swal.fire({
    title: titulos[tipo] || "Aviso", text: msg, icon: tipo,
    position: "center", timer: 3000, timerProgressBar: true,
    showConfirmButton: false, showCloseButton: true,
    background: "#ffffff", color: "#1e293b",
  });
}

function logMsg(msg) {
  if (!log) return;
  log.innerHTML += `<div>${msg}</div>`;
  log.scrollTop = log.scrollHeight;
}

function limpiarArchivo() {
  archivo = null;
  fileInput.value = "";
  if (fileInfo)  fileInfo.innerHTML = "";
  if (btnSubir)  btnSubir.disabled = true;
  if (btnEliminar) btnEliminar.style.display = "none";
}

async function esAdmin(email) {
  try {
    const snap = await getDoc(doc(db, "admins", email));
    return snap.exists();
  } catch { return false; }
}

// ── login Google ──────────────────────────────────────────────────────────
btnLoginBtn?.addEventListener("click", async () => {
  try {
    sessionStorage.setItem("loginManual", "clicking");
    await signOut(auth);
    await setPersistence(auth, browserSessionPersistence);
    await signInWithPopup(auth, provider);
    sessionStorage.setItem("loginManual", "loggedIn");
  } catch (err) {
    sessionStorage.removeItem("loginManual");
    showToast("Error login Google: " + err.message, "error");
  }
});

// ── login email/contraseña ────────────────────────────────────────────────
btnLoginEmail?.addEventListener("click", async () => {
  const email = emailInput?.value.trim();
  const pass  = passInput?.value;
  if (!email || !pass) { showToast("Completá email y contraseña", "warning"); return; }

  try {
    sessionStorage.setItem("loginManual", "loggedIn");
    await setPersistence(auth, browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) {
    sessionStorage.removeItem("loginManual");
    // Mensaje genérico — no revelar si el email existe
    showToast("Credenciales incorrectas", "error");
    console.error(err.code);
  }
});

// ── logout ────────────────────────────────────────────────────────────────
btnLogout?.addEventListener("click", async () => {
  sessionStorage.removeItem("loginManual");
  await signOut(auth);
  showToast("Sesión cerrada", "info");
});

// ── auth state ────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (authLoader) authLoader.style.display = "none";

  if (!authReady) {
    authReady = true;
    if (!user) { btnLogin.style.display = "block"; return; }
  }

  btnLogin.style.display   = "block";
  adminPanel.style.display = "none";
  userToken = null;

  if (!user) { btnLogin.style.display = "block"; return; }

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
  btnLogin.style.display   = "none";
  adminPanel.style.display = "block";

  // Mostrar u ocultar cambio de contraseña según método de login
  if (changePassForm) {
    changePassForm.style.display =
      user.providerData[0]?.providerId === "password" ? "block" : "none";
  }

  showToast("Bienvenido " + user.email, "success");
});

// ── cambiar contraseña ────────────────────────────────────────────────────
btnChangePass?.addEventListener("click", async () => {
  const currentPass = document.getElementById("currentPass")?.value;
  const newPass     = document.getElementById("newPass")?.value;
  const confirmPass = document.getElementById("confirmPass")?.value;

  if (!currentPass || !newPass || !confirmPass) {
    showToast("Completá todos los campos", "warning"); return;
  }
  if (newPass.length < 8) {
    showToast("La nueva contraseña debe tener al menos 8 caracteres", "warning"); return;
  }
  if (newPass !== confirmPass) {
    showToast("Las contraseñas no coinciden", "warning"); return;
  }

  try {
    const user       = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, currentPass);

    // Reautenticar antes de cambiar contraseña — requisito de Firebase
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPass);

    showToast("Contraseña actualizada correctamente", "success");
    document.getElementById("currentPass").value = "";
    document.getElementById("newPass").value     = "";
    document.getElementById("confirmPass").value = "";
  } catch (err) {
    if (err.code === "auth/wrong-password") {
      showToast("Contraseña actual incorrecta", "error");
    } else {
      showToast("Error al cambiar contraseña: " + err.message, "error");
    }
  }
});

// ── file / drag-drop / subir (sin cambios) ───────────────────────────────
dropZone?.addEventListener("click",    () => fileInput.click());
dropZone?.addEventListener("dragover", (e) => { e.preventDefault(); e.stopPropagation(); });
dropZone?.addEventListener("drop", (e) => {
  e.preventDefault(); e.stopPropagation();
  const file = e.dataTransfer.files[0];
  if (!file) return;
  if (![".xlsx",".xls"].some(ext => file.name.endsWith(ext))) {
    showToast("Solo se aceptan archivos Excel (.xlsx, .xls)", "warning"); return;
  }
  archivo = file;
  fileInfo.innerHTML = file.name;
  btnSubir.disabled  = false;
  btnEliminar.style.display = "inline-block";
});

fileInput?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  archivo = file;
  fileInfo.innerHTML = file.name;
  btnSubir.disabled  = false;
  btnEliminar.style.display = "inline-block";
});

btnEliminar?.addEventListener("click", async () => {
  const result = await Swal.fire({
    title: "¿Quitar archivo?", text: "Tendrás que volver a seleccionarlo.",
    icon: "warning", background: "#ffffff", color: "#1e293b",
    showCancelButton: true, confirmButtonText: "Sí, quitar",
    cancelButtonText: "Cancelar", confirmButtonColor: "#e30613",
    cancelButtonColor: "#334155", showCloseButton: true,
  });
  if (result.isConfirmed) { limpiarArchivo(); showToast("Archivo eliminado", "info"); }
});

btnSubir?.addEventListener("click", async () => {
  if (!archivo || !userToken) { showToast("Falta archivo o login", "warning"); return; }
  try {
    const user = auth.currentUser;
    if (user) userToken = await user.getIdToken(true);

    const data  = await archivo.arrayBuffer();
    const wb    = XLSX.read(data);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json  = XLSX.utils.sheet_to_json(sheet);

    const res    = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
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