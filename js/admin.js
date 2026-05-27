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
import {
  doc,
  getDoc,
  collection,
  getCountFromServer,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ───────────────────────────────────────────
   ESTADO
─────────────────────────────────────────── */
let userToken = null;
let archivo = null;
let authReady = false;

/* ───────────────────────────────────────────
   ELEMENTOS
─────────────────────────────────────────── */
const authLoader = document.getElementById("authLoader");
const loginPanel = document.getElementById("loginPanel");
const adminPanel = document.getElementById("adminPanel");

const btnLoginBtn = document.getElementById("btnLoginBtn");
const btnLoginEmail = document.getElementById("btnLoginEmail");
const emailInput = document.getElementById("emailInput");
const passInput = document.getElementById("passInput");
const togglePassBtn = document.getElementById("togglePassBtn");
const eyeIcon = document.getElementById("eyeIcon");

const userPill = document.getElementById("userPill");
const userAvatar = document.getElementById("userAvatar");
const userEmailShort = document.getElementById("userEmailShort");
const btnLogout = document.getElementById("btnLogout");

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const fileInfoRow = document.getElementById("fileInfoRow");
const fileInfoName = document.getElementById("fileInfoName");
const btnEliminar = document.getElementById("btnEliminar");
const btnSubir = document.getElementById("btnSubir");
const log = document.getElementById("log");

const statTotal = document.getElementById("statTotal");
const statLast = document.getElementById("statLast");
const statLastDate = document.getElementById("statLastDate");
const statusBadge = document.getElementById("statusBadge");

const changePassSection = document.getElementById("changePassSection");
const changePassUnavailable = document.getElementById("changePassUnavailable");
const btnChangePass = document.getElementById("btnChangePass");

const topbarTitle = document.getElementById("topbarTitle");

const sectionImport = document.getElementById("sectionImport");
const sectionImportSide = document.getElementById("sectionImportSide");
const sectionSecurity = document.getElementById("sectionSecurity");

const FUNCTION_URL = "https://importarservicios-pbgzdzmh5q-uc.a.run.app";

/* ───────────────────────────────────────────
   HELPERS — show / hide
─────────────────────────────────────────── */
function show(el) {
  el?.classList.remove("adm-hidden");
}
function hide(el) {
  el?.classList.add("adm-hidden");
}

/* ───────────────────────────────────────────
   HELPERS — limpiar campos de login
─────────────────────────────────────────── */
function limpiarCamposLogin() {
  if (emailInput) emailInput.value = "";
  if (passInput) {
    passInput.value = "";
    passInput.type = "password";
  }
  if (eyeIcon) eyeIcon.className = "bi bi-eye";
}

/* ───────────────────────────────────────────
   HELPERS — toast
─────────────────────────────────────────── */
function showToast(msg, tipo = "info") {
  const titulos = {
    success: "Listo",
    error: "Error",
    warning: "Atención",
    info: "Información",
  };
  Swal.fire({
    title: titulos[tipo] || "Aviso",
    text: msg,
    icon: tipo,
    position: "center",
    timer: 3500,
    timerProgressBar: true,
    showConfirmButton: false,
    showCloseButton: true,
    background: "#0d1a3a",
    color: "#fff",
  });
}

/* ───────────────────────────────────────────
   HELPERS — log
─────────────────────────────────────────── */
function logMsg(msg, type = "") {
  if (!log) return;
  const div = document.createElement("div");
  if (type) div.classList.add(type);
  div.textContent = `[${new Date().toLocaleTimeString("es-AR")}] ${msg}`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

/* ───────────────────────────────────────────
   HELPERS — archivo
─────────────────────────────────────────── */
function limpiarArchivo() {
  archivo = null;
  fileInput.value = "";
  fileInfoRow.classList.remove("visible");
  if (fileInfoName) fileInfoName.textContent = "";
  if (btnSubir) btnSubir.disabled = true;
}

function setArchivo(file) {
  archivo = file;
  if (fileInfoName) fileInfoName.textContent = file.name;
  fileInfoRow.classList.add("visible");
  if (btnSubir) btnSubir.disabled = false;
  logMsg("Archivo seleccionado: " + file.name);
}

/* ───────────────────────────────────────────
   HELPERS — admin check / initials / stats
─────────────────────────────────────────── */
async function esAdmin(email) {
  try {
    const snap = await getDoc(doc(db, "admins", email));
    return snap.exists();
  } catch {
    return false;
  }
}

function getInitials(email) {
  if (!email) return "?";
  const parts = email.split("@")[0].replace(/[._-]/g, " ").split(" ");
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("") || "A"
  );
}

async function cargarStats() {
  try {
    const snap = await getCountFromServer(collection(db, "servicios"));
    const count = snap.data().count;
    if (statTotal) statTotal.textContent = count.toLocaleString("es-AR");
  } catch {
    if (statTotal) statTotal.textContent = "—";
  }

  const lastImport = sessionStorage.getItem("lastImportCount");
  const lastImportDate = sessionStorage.getItem("lastImportDate");
  if (lastImport && statLast) {
    statLast.textContent = lastImport;
    if (statLastDate) statLastDate.textContent = lastImportDate || "";
  }
}

/* ───────────────────────────────────────────
   SIDEBAR NAV
─────────────────────────────────────────── */
document.querySelectorAll(".adm-nav-item[data-section]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".adm-nav-item")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const isImport = btn.dataset.section === "import";

    if (sectionImport) isImport ? show(sectionImport) : hide(sectionImport);
    if (sectionImportSide)
      isImport ? show(sectionImportSide) : hide(sectionImportSide);
    if (sectionSecurity)
      isImport ? hide(sectionSecurity) : show(sectionSecurity);

    if (topbarTitle)
      topbarTitle.textContent = isImport ? "Importar datos" : "Seguridad";
  });
});

/* ───────────────────────────────────────────
   OJO — LOGIN
─────────────────────────────────────────── */
togglePassBtn?.addEventListener("click", () => {
  const isPass = passInput.type === "password";
  passInput.type = isPass ? "text" : "password";
  if (eyeIcon) eyeIcon.className = isPass ? "bi bi-eye-slash" : "bi bi-eye";
});

/* Ojo genérico para campos con data-target */
document.querySelectorAll(".adm-eye-btn[data-target]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    const isPass = input.type === "password";
    input.type = isPass ? "text" : "password";
    const icon = btn.querySelector("i");
    if (icon) icon.className = isPass ? "bi bi-eye-slash" : "bi bi-eye";
  });
});

/* Limpiar campos al cargar la página para evitar autocompletado inesperado */
window.addEventListener("load", () => limpiarCamposLogin());

/* ───────────────────────────────────────────
   LOGIN — GOOGLE
─────────────────────────────────────────── */
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

btnLoginBtn?.addEventListener("click", async () => {
  try {
    sessionStorage.setItem("loginManual", "clicking");
    await signOut(auth);
    await setPersistence(auth, browserSessionPersistence);
    await signInWithPopup(auth, provider);
    sessionStorage.setItem("loginManual", "loggedIn");
  } catch (err) {
    sessionStorage.removeItem("loginManual");
    showToast("Error al iniciar sesión con Google: " + err.message, "error");
  }
});

/* ───────────────────────────────────────────
   LOGIN — EMAIL / CONTRASEÑA
─────────────────────────────────────────── */
btnLoginEmail?.addEventListener("click", async () => {
  const email = emailInput?.value.trim();
  const pass = passInput?.value;
  if (!email || !pass) {
    showToast("Completá email y contraseña", "warning");
    return;
  }

  try {
    sessionStorage.setItem("loginManual", "loggedIn");
    await setPersistence(auth, browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) {
    sessionStorage.removeItem("loginManual");
    showToast("Credenciales incorrectas", "error");
    console.error(err.code);
  }
});

/* Enter en el campo contraseña dispara el login */
passInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnLoginEmail?.click();
});

/* ───────────────────────────────────────────
   LOGOUT
─────────────────────────────────────────── */
btnLogout?.addEventListener("click", async () => {
  sessionStorage.removeItem("loginManual");
  await signOut(auth);
  limpiarCamposLogin(); // limpia email, pass y resetea el ojo
  showToast("Sesión cerrada", "info");
});

/* ───────────────────────────────────────────
   AUTH STATE
─────────────────────────────────────────── */
onAuthStateChanged(auth, async (user) => {
  hide(authLoader);

  if (!authReady) {
    authReady = true;
    if (!user) {
      show(loginPanel);
      return;
    }
  }

  /* reset UI */
  hide(loginPanel);
  hide(adminPanel);
  hide(userPill);
  hide(statusBadge);
  userToken = null;

  if (!user) {
    show(loginPanel);
    return;
  }

  const flag = sessionStorage.getItem("loginManual");
  if (flag !== "clicking" && flag !== "loggedIn") {
    await signOut(auth);
    show(loginPanel);
    return;
  }

  const ok = await esAdmin(user.email);
  if (!ok) {
    sessionStorage.removeItem("loginManual");
    await signOut(auth);
    show(loginPanel);
    showToast("Acceso denegado", "error");
    return;
  }

  userToken = await user.getIdToken();

  /* Mostrar info del usuario en el sidebar */
  if (userAvatar) userAvatar.textContent = getInitials(user.email);
  if (userEmailShort)
    userEmailShort.textContent =
      user.email.length > 22 ? user.email.substring(0, 20) + "…" : user.email;

  show(userPill);
  show(adminPanel);
  show(statusBadge);

  /* Cambio de contraseña: solo disponible para email/pass */
  const isEmailPass = user.providerData[0]?.providerId === "password";
  if (isEmailPass) {
    show(changePassSection);
    hide(changePassUnavailable);
  } else {
    hide(changePassSection);
    show(changePassUnavailable);
  }

  cargarStats();
  logMsg("Sesión iniciada — " + user.email, "success");
  showToast("Bienvenido, " + user.email.split("@")[0], "success");
});

/* ───────────────────────────────────────────
   CAMBIAR CONTRASEÑA
─────────────────────────────────────────── */
btnChangePass?.addEventListener("click", async () => {
  const currentPass = document.getElementById("currentPass")?.value;
  const newPass = document.getElementById("newPass")?.value;
  const confirmPass = document.getElementById("confirmPass")?.value;

  if (!currentPass || !newPass || !confirmPass) {
    showToast("Completá todos los campos", "warning");
    return;
  }
  if (newPass.length < 8) {
    showToast(
      "La nueva contraseña debe tener al menos 8 caracteres",
      "warning",
    );
    return;
  }
  if (newPass !== confirmPass) {
    showToast("Las contraseñas no coinciden", "warning");
    return;
  }

  try {
    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, currentPass);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPass);

    showToast("Contraseña actualizada", "success");

    /* Limpiar campos y resetear ojos */
    ["currentPass", "newPass", "confirmPass"].forEach((id) => {
      const input = document.getElementById(id);
      if (input) {
        input.value = "";
        input.type = "password";
      }
    });
    document.querySelectorAll(".adm-eye-btn[data-target]").forEach((btn) => {
      const icon = btn.querySelector("i");
      if (icon) icon.className = "bi bi-eye";
    });
  } catch (err) {
    if (
      err.code === "auth/wrong-password" ||
      err.code === "auth/invalid-credential"
    ) {
      showToast("Contraseña actual incorrecta", "error");
    } else {
      showToast("Error: " + err.message, "error");
    }
  }
});

/* ───────────────────────────────────────────
   DROP ZONE / SELECCIÓN DE ARCHIVO
─────────────────────────────────────────── */
dropZone?.addEventListener("click", () => fileInput.click());

dropZone?.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.add("dragover");
});

dropZone?.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
});

dropZone?.addEventListener("drop", (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (!file) return;
  if (![".xlsx", ".xls"].some((ext) => file.name.toLowerCase().endsWith(ext))) {
    showToast("Solo se aceptan archivos Excel (.xlsx, .xls)", "warning");
    return;
  }
  setArchivo(file);
});

fileInput?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) setArchivo(file);
});

btnEliminar?.addEventListener("click", async () => {
  const result = await Swal.fire({
    title: "¿Quitar archivo?",
    text: "Tendrás que volver a seleccionarlo.",
    icon: "warning",
    background: "#0d1a3a",
    color: "#fff",
    showCancelButton: true,
    confirmButtonText: "Sí, quitar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#e30613",
    cancelButtonColor: "#334155",
  });
  if (result.isConfirmed) {
    limpiarArchivo();
    logMsg("Archivo removido");
  }
});

/* ───────────────────────────────────────────
   SUBIR ARCHIVO
─────────────────────────────────────────── */
btnSubir?.addEventListener("click", async () => {
  if (!archivo || !userToken) {
    showToast("Falta archivo o sesión", "warning");
    return;
  }

  btnSubir.disabled = true;
  btnSubir.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Procesando...`;
  logMsg("Iniciando importación…");

  try {
    const user = auth.currentUser;
    if (user) userToken = await user.getIdToken(true);

    const data = await archivo.arrayBuffer();
    const wb = XLSX.read(data);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    logMsg(`Filas leídas del Excel: ${json.length}`);

    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify(json),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);

    const count = result.total;
    const dateStr = new Date().toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    sessionStorage.setItem("lastImportCount", count);
    sessionStorage.setItem("lastImportDate", dateStr);

    if (statLast) statLast.textContent = count.toLocaleString("es-AR");
    if (statLastDate) statLastDate.textContent = dateStr;

    logMsg(`Importados correctamente: ${count} registros`, "success");
    showToast(`${count} registros importados`, "success");
    cargarStats();
  } catch (err) {
    console.error(err);
    logMsg("Error: " + err.message, "error");
    showToast(err.message, "error");
  } finally {
    limpiarArchivo();
    if (btnSubir) {
      btnSubir.disabled = true;
      btnSubir.innerHTML = `<i class="bi bi-cloud-upload-fill"></i> Subir y procesar`;
    }
  }
});
