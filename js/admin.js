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
  query,
  where,
  getDocs,
  deleteDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ─────────────────────────────────────────────
   ESTADO
───────────────────────────────────────────── */
let userToken = null;
let archivo = null;
let authReady = false;

/* ─────────────────────────────────────────────
   ELEMENTOS — layout
───────────────────────────────────────────── */
const authLoader        = document.getElementById("authLoader");
const loginPanel        = document.getElementById("loginPanel");
const adminPanel        = document.getElementById("adminPanel");
const adminSidebar      = document.getElementById("adminSidebar");

/* ─────────────────────────────────────────────
   ELEMENTOS — login
───────────────────────────────────────────── */
const btnLoginBtn       = document.getElementById("btnLoginBtn");
const btnLoginEmail     = document.getElementById("btnLoginEmail");
const emailInput        = document.getElementById("emailInput");
const passInput         = document.getElementById("passInput");
const togglePassBtn     = document.getElementById("togglePassBtn");
const eyeIcon           = document.getElementById("eyeIcon");

/* ─────────────────────────────────────────────
   ELEMENTOS — sidebar / topbar
───────────────────────────────────────────── */
const userPill          = document.getElementById("userPill");
const userAvatar        = document.getElementById("userAvatar");
const userEmailShort    = document.getElementById("userEmailShort");
const btnLogout         = document.getElementById("btnLogout");
const statusBadge       = document.getElementById("statusBadge");
const topbarTitle       = document.getElementById("topbarTitle");

/* ─────────────────────────────────────────────
   ELEMENTOS — stats
───────────────────────────────────────────── */
const statTotal         = document.getElementById("statTotal");
const statLast          = document.getElementById("statLast");
const statLastDate      = document.getElementById("statLastDate");

/* ─────────────────────────────────────────────
   ELEMENTOS — secciones
───────────────────────────────────────────── */
const sectionImport     = document.getElementById("sectionImport");
const sectionImportSide = document.getElementById("sectionImportSide");
const sectionSearch     = document.getElementById("sectionSearch");
const sectionSecurity   = document.getElementById("sectionSecurity");

/* ─────────────────────────────────────────────
   ELEMENTOS — importar
───────────────────────────────────────────── */
const dropZone          = document.getElementById("dropZone");
const fileInput         = document.getElementById("fileInput");
const fileInfoRow       = document.getElementById("fileInfoRow");
const fileInfoName      = document.getElementById("fileInfoName");
const btnEliminar       = document.getElementById("btnEliminar");
const btnSubir          = document.getElementById("btnSubir");
const log               = document.getElementById("log");

/* ─────────────────────────────────────────────
   ELEMENTOS — buscar
───────────────────────────────────────────── */
const searchPatente     = document.getElementById("searchPatente");
const btnSearchPatente  = document.getElementById("btnSearchPatente");
const searchResults     = document.getElementById("searchResults");

/* ─────────────────────────────────────────────
   ELEMENTOS — seguridad
───────────────────────────────────────────── */
const changePassSection     = document.getElementById("changePassSection");
const changePassUnavailable = document.getElementById("changePassUnavailable");
const btnChangePass         = document.getElementById("btnChangePass");

const FUNCTION_URL = "https://importarservicios-pbgzdzmh5q-uc.a.run.app";

/* ═══════════════════════════════════════════
   HELPERS — show / hide
═══════════════════════════════════════════ */
function show(el) { el?.classList.remove("adm-hidden"); }
function hide(el) { el?.classList.add("adm-hidden"); }

/* ═══════════════════════════════════════════
   HELPERS — limpiar campos de login
═══════════════════════════════════════════ */
function limpiarCamposLogin() {
  if (emailInput) emailInput.value = "";
  if (passInput) {
    passInput.value = "";
    passInput.type = "password";
  }
  if (eyeIcon) eyeIcon.className = "bi bi-eye";
}

/* ═══════════════════════════════════════════
   HELPERS — toast SweetAlert2
═══════════════════════════════════════════ */
function showToast(msg, tipo = "info") {
  const titulos = { success: "Listo", error: "Error", warning: "Atención", info: "Información" };
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

/* ═══════════════════════════════════════════
   HELPERS — log de importación
═══════════════════════════════════════════ */
function logMsg(msg, type = "") {
  if (!log) return;
  const div = document.createElement("div");
  if (type) div.classList.add(type);
  div.textContent = `[${new Date().toLocaleTimeString("es-AR")}] ${msg}`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

/* ═══════════════════════════════════════════
   HELPERS — archivo
═══════════════════════════════════════════ */
function limpiarArchivo() {
  archivo = null;
  if (fileInput) fileInput.value = "";
  fileInfoRow?.classList.remove("visible");
  if (fileInfoName) fileInfoName.textContent = "";
  if (btnSubir) btnSubir.disabled = true;
}

function setArchivo(file) {
  archivo = file;
  if (fileInfoName) fileInfoName.textContent = file.name;
  fileInfoRow?.classList.add("visible");
  if (btnSubir) btnSubir.disabled = false;
  logMsg("Archivo seleccionado: " + file.name);
}

/* ═══════════════════════════════════════════
   HELPERS — admin check / initials / stats
═══════════════════════════════════════════ */
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
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("") || "A";
}

async function cargarStats() {
  try {
    const snap = await getCountFromServer(collection(db, "servicios"));
    if (statTotal) statTotal.textContent = snap.data().count.toLocaleString("es-AR");
  } catch {
    if (statTotal) statTotal.textContent = "—";
  }

  const lastImport     = sessionStorage.getItem("lastImportCount");
  const lastImportDate = sessionStorage.getItem("lastImportDate");
  if (lastImport && statLast) {
    statLast.textContent = lastImport;
    if (statLastDate) statLastDate.textContent = lastImportDate || "";
  }
}

/* ═══════════════════════════════════════════
   NAVEGACIÓN SIDEBAR
═══════════════════════════════════════════ */
function ocultarTodasSecciones() {
  hide(sectionImport);
  hide(sectionImportSide);
  hide(sectionSearch);
  hide(sectionSecurity);
}

document.querySelectorAll(".adm-nav-item[data-section]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".adm-nav-item").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    ocultarTodasSecciones();

    const section = btn.dataset.section;

    if (section === "import") {
      show(sectionImport);
      show(sectionImportSide);
      if (topbarTitle) topbarTitle.textContent = "Importar datos";
    } else if (section === "search") {
      show(sectionSearch);
      if (topbarTitle) topbarTitle.textContent = "Buscar patente";
    } else if (section === "security") {
      show(sectionSecurity);
      if (topbarTitle) topbarTitle.textContent = "Seguridad";
    }
  });
});

/* ═══════════════════════════════════════════
   OJO — campos de contraseña login
═══════════════════════════════════════════ */
togglePassBtn?.addEventListener("click", () => {
  const isPass = passInput.type === "password";
  passInput.type = isPass ? "text" : "password";
  if (eyeIcon) eyeIcon.className = isPass ? "bi bi-eye-slash" : "bi bi-eye";
});

/* Ojo genérico para campos con data-target */
document.querySelectorAll(".adm-eye-btn[data-target]").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    const isPass = input.type === "password";
    input.type = isPass ? "text" : "password";
    const icon = btn.querySelector("i");
    if (icon) icon.className = isPass ? "bi bi-eye-slash" : "bi bi-eye";
  });
});

/* Limpiar campos al cargar para evitar autocompletado */
window.addEventListener("load", () => limpiarCamposLogin());

/* ═══════════════════════════════════════════
   LOGIN — GOOGLE
═══════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════
   LOGIN — EMAIL / CONTRASEÑA
═══════════════════════════════════════════ */
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
    showToast("Credenciales incorrectas", "error");
    console.error(err.code);
  }
});

/* Enter en el campo contraseña dispara el login */
passInput?.addEventListener("keydown", e => {
  if (e.key === "Enter") btnLoginEmail?.click();
});

/* ═══════════════════════════════════════════
   LOGOUT
═══════════════════════════════════════════ */
btnLogout?.addEventListener("click", async () => {
  sessionStorage.removeItem("loginManual");
  await signOut(auth);
  limpiarCamposLogin();
  showToast("Sesión cerrada", "info");
});

/* ═══════════════════════════════════════════
   AUTH STATE
═══════════════════════════════════════════ */
onAuthStateChanged(auth, async user => {
  hide(authLoader);

  if (!authReady) {
    authReady = true;
    if (!user) { show(loginPanel); return; }
  }

  /* reset UI completo */
  hide(loginPanel);
  hide(adminPanel);
  hide(adminSidebar);
  hide(userPill);
  hide(statusBadge);
  userToken = null;

  if (!user) { show(loginPanel); return; }

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

  /* Info del usuario en el sidebar */
  if (userAvatar)     userAvatar.textContent    = getInitials(user.email);
  if (userEmailShort) userEmailShort.textContent =
    user.email.length > 22 ? user.email.substring(0, 20) + "…" : user.email;

  /* Mostrar todo */
  show(adminSidebar);
  show(userPill);
  show(adminPanel);
  show(statusBadge);

  /* Cambio de contraseña: solo para email/pass */
  const isEmailPass = user.providerData[0]?.providerId === "password";
  if (isEmailPass) { show(changePassSection); hide(changePassUnavailable); }
  else             { hide(changePassSection); show(changePassUnavailable); }

  cargarStats();
  logMsg("Sesión iniciada — " + user.email, "success");
  showToast("Bienvenido, " + user.email.split("@")[0], "success");
});

/* ═══════════════════════════════════════════
   CAMBIAR CONTRASEÑA
═══════════════════════════════════════════ */
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
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPass);

    showToast("Contraseña actualizada", "success");

    ["currentPass", "newPass", "confirmPass"].forEach(id => {
      const input = document.getElementById(id);
      if (input) { input.value = ""; input.type = "password"; }
    });
    document.querySelectorAll(".adm-eye-btn[data-target]").forEach(btn => {
      const icon = btn.querySelector("i");
      if (icon) icon.className = "bi bi-eye";
    });
  } catch (err) {
    if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
      showToast("Contraseña actual incorrecta", "error");
    } else {
      showToast("Error: " + err.message, "error");
    }
  }
});

/* ═══════════════════════════════════════════
   DROP ZONE / SELECCIÓN DE ARCHIVO
═══════════════════════════════════════════ */
dropZone?.addEventListener("click", () => fileInput.click());

dropZone?.addEventListener("dragover", e => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.add("dragover");
});

dropZone?.addEventListener("dragleave", e => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
});

dropZone?.addEventListener("drop", e => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (!file) return;
  if (![".xlsx", ".xls"].some(ext => file.name.toLowerCase().endsWith(ext))) {
    showToast("Solo se aceptan archivos Excel (.xlsx, .xls)", "warning"); return;
  }
  setArchivo(file);
});

fileInput?.addEventListener("change", e => {
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
  if (result.isConfirmed) { limpiarArchivo(); logMsg("Archivo removido"); }
});

/* ═══════════════════════════════════════════
   SUBIR ARCHIVO
═══════════════════════════════════════════ */
btnSubir?.addEventListener("click", async () => {
  if (!archivo || !userToken) { showToast("Falta archivo o sesión", "warning"); return; }

  btnSubir.disabled = true;
  btnSubir.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Procesando...`;
  logMsg("Iniciando importación…");

  try {
    const user = auth.currentUser;
    if (user) userToken = await user.getIdToken(true);

    const data = await archivo.arrayBuffer();
    const wb   = XLSX.read(data);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json  = XLSX.utils.sheet_to_json(sheet);

    logMsg(`Filas leídas del Excel: ${json.length}`);

    const res    = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
      body: JSON.stringify(json),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);

    const count   = result.total;
    const dateStr = new Date().toLocaleDateString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });

    sessionStorage.setItem("lastImportCount", count);
    sessionStorage.setItem("lastImportDate",  dateStr);

    if (statLast)     statLast.textContent     = count.toLocaleString("es-AR");
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

/* ═══════════════════════════════════════════
   BUSCAR POR PATENTE
═══════════════════════════════════════════ */

/* Sanitizar input en tiempo real */
searchPatente?.addEventListener("input", () => {
  searchPatente.value = searchPatente.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
});

/* Enter en el input dispara búsqueda */
searchPatente?.addEventListener("keydown", e => {
  if (e.key === "Enter") btnSearchPatente?.click();
});

btnSearchPatente?.addEventListener("click", async () => {
  const patente = searchPatente?.value.trim();
  const regex   = /^[A-Z]{3}[0-9]{3}$|^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;

  if (!patente) {
    showToast("Ingresá una patente", "warning"); return;
  }
  if (!regex.test(patente)) {
    showToast("Formato de patente inválido (ej: ABC123 o AB123CD)", "warning"); return;
  }

  /* Estado de carga */
  searchResults.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px;
      color:rgba(255,255,255,0.4); font-size:14px; padding:16px 0;">
      <span class="spinner-border spinner-border-sm"></span>
      Buscando registros para <strong style="color:rgba(255,255,255,0.7);">${patente}</strong>…
    </div>`;

  try {
    const q    = query(collection(db, "servicios"), where("patente", "==", patente));
    const snap = await getDocs(q);

    if (snap.empty) {
      searchResults.innerHTML = `
        <div style="text-align:center; padding:32px 0; color:rgba(255,255,255,0.35);">
          <i class="bi bi-inbox" style="font-size:2rem; display:block; margin-bottom:10px;"></i>
          No se encontraron registros para <strong style="color:rgba(255,255,255,0.6);">${patente}</strong>
        </div>`;
      return;
    }

    /* Ordenar por fecha descendente */
    const docs = [];
    snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
    docs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    /* Cabecera de resultados */
    const header = `
      <div style="font-size:11px; font-weight:700; letter-spacing:1.5px;
        text-transform:uppercase; color:rgba(255,255,255,0.3);
        margin-bottom:14px; display:flex; align-items:center; gap:8px;">
        <i class="bi bi-list-ul"></i>
        ${docs.length} registro${docs.length !== 1 ? "s" : ""} encontrado${docs.length !== 1 ? "s" : ""}
        <span style="flex:1; height:1px; background:rgba(255,255,255,0.08); display:block;"></span>
      </div>`;

    const cards = docs.map((d, idx) => `
      <div id="card-${d.id}" style="
        background:rgba(255,255,255,0.04);
        border:0.5px solid rgba(255,255,255,${idx === 0 ? "0.15" : "0.07"});
        border-top:2px solid ${idx === 0 ? "#e30613" : "rgba(255,255,255,0.1)"};
        border-radius:14px;
        padding:18px;
        margin-bottom:12px;
        transition: border-color 0.2s;">

        <!-- Cabecera de la card -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:10px;">
            ${idx === 0 ? `<span style="
              background:rgba(227,6,19,0.15); border:0.5px solid rgba(227,6,19,0.3);
              border-radius:50px; padding:3px 10px; font-size:11px; font-weight:700;
              color:#e30613; display:inline-flex; align-items:center; gap:5px;">
              <i class="bi bi-star-fill"></i> Más reciente
            </span>` : ""}
            <span style="
              background:rgba(255,255,255,0.08); border-radius:6px;
              padding:4px 12px; font-size:13px; font-weight:700;
              letter-spacing:2.5px; color:rgba(255,255,255,0.8);">${d.patente}</span>
          </div>
          <div style="display:flex; gap:8px;">
            <button onclick="editarRegistro('${d.id}')"
              id="btn-edit-${d.id}"
              style="background:rgba(255,255,255,0.06); border:0.5px solid rgba(255,255,255,0.15);
                border-radius:8px; padding:6px 14px; cursor:pointer; font-size:12px;
                font-weight:600; color:rgba(255,255,255,0.7); font-family:inherit;
                display:inline-flex; align-items:center; gap:6px; transition:background 0.2s;">
              <i class="bi bi-pencil-fill"></i> Editar
            </button>
            <button onclick="eliminarRegistro('${d.id}', '${d.fecha}')"
              style="background:rgba(227,6,19,0.08); border:0.5px solid rgba(227,6,19,0.25);
                border-radius:8px; padding:6px 14px; cursor:pointer; font-size:12px;
                font-weight:600; color:#e30613; font-family:inherit;
                display:inline-flex; align-items:center; gap:6px; transition:background 0.2s;">
              <i class="bi bi-trash3-fill"></i> Eliminar
            </button>
          </div>
        </div>

        <!-- Campos editables -->
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
          <div>
            <div style="font-size:11px; font-weight:700; letter-spacing:1px;
              text-transform:uppercase; color:rgba(255,255,255,0.3); margin-bottom:6px;">
              <i class="bi bi-calendar3"></i> Fecha
            </div>
            <input id="fecha-${d.id}" type="date" value="${d.fecha}"
              class="adm-input" style="width:100%;" disabled />
          </div>
          <div>
            <div style="font-size:11px; font-weight:700; letter-spacing:1px;
              text-transform:uppercase; color:rgba(255,255,255,0.3); margin-bottom:6px;">
              <i class="bi bi-speedometer2"></i> Km actuales
            </div>
            <input id="km-${d.id}" type="number" value="${d.km}"
              class="adm-input" style="width:100%;" disabled />
          </div>
          <div>
            <div style="font-size:11px; font-weight:700; letter-spacing:1px;
              text-transform:uppercase; color:rgba(255,255,255,0.3); margin-bottom:6px;">
              <i class="bi bi-arrow-right-circle"></i> Próximo service
            </div>
            <input id="prox-${d.id}" type="number" value="${d.proximo}"
              class="adm-input" style="width:100%;" disabled />
          </div>
        </div>

        <!-- Botones guardar/cancelar (ocultos hasta editar) -->
        <div id="edit-actions-${d.id}"
          style="display:none; margin-top:14px; gap:8px; flex-wrap:wrap;">
          <button onclick="guardarRegistro('${d.id}')"
            style="background:rgba(5,150,105,0.12); border:0.5px solid rgba(5,150,105,0.3);
              border-radius:8px; padding:8px 18px; cursor:pointer; font-size:13px;
              font-weight:600; color:#34d399; font-family:inherit;
              display:inline-flex; align-items:center; gap:6px;">
            <i class="bi bi-check-lg"></i> Guardar cambios
          </button>
          <button onclick="cancelarEdicion('${d.id}', ${d.km}, ${d.proximo}, '${d.fecha}')"
            style="background:none; border:0.5px solid rgba(255,255,255,0.12);
              border-radius:8px; padding:8px 18px; cursor:pointer; font-size:13px;
              color:rgba(255,255,255,0.4); font-family:inherit;
              display:inline-flex; align-items:center; gap:6px;">
            Cancelar
          </button>
        </div>

      </div>
    `).join("");

    searchResults.innerHTML = header + cards;

  } catch (err) {
    console.error(err);
    showToast("Error al buscar: " + err.message, "error");
    searchResults.innerHTML = `
      <div style="color:rgba(255,100,100,0.7); font-size:14px; padding:12px 0;">
        <i class="bi bi-exclamation-triangle-fill"></i> ${err.message}
      </div>`;
  }
});

/* ═══════════════════════════════════════════
   CRUD — funciones globales (llamadas desde onclick en el HTML generado)
═══════════════════════════════════════════ */

window.editarRegistro = (id) => {
  /* Habilitar los tres inputs */
  ["fecha-" + id, "km-" + id, "prox-" + id].forEach(fieldId => {
    const el = document.getElementById(fieldId);
    if (el) {
      el.disabled = false;
      el.style.borderColor = "rgba(255,255,255,0.3)";
    }
  });
  /* Mostrar botones guardar/cancelar */
  const actions = document.getElementById("edit-actions-" + id);
  if (actions) actions.style.display = "flex";
  /* Ocultar botón editar para evitar doble click */
  const btnEdit = document.getElementById("btn-edit-" + id);
  if (btnEdit) btnEdit.style.display = "none";
};

window.cancelarEdicion = (id, km, proximo, fecha) => {
  /* Restaurar valores originales */
  const fechaEl = document.getElementById("fecha-" + id);
  const kmEl    = document.getElementById("km-"    + id);
  const proxEl  = document.getElementById("prox-"  + id);

  if (fechaEl) { fechaEl.value = fecha;    fechaEl.disabled = true; fechaEl.style.borderColor = ""; }
  if (kmEl)    { kmEl.value    = km;       kmEl.disabled    = true; kmEl.style.borderColor    = ""; }
  if (proxEl)  { proxEl.value  = proximo;  proxEl.disabled  = true; proxEl.style.borderColor  = ""; }

  const actions = document.getElementById("edit-actions-" + id);
  if (actions) actions.style.display = "none";

  const btnEdit = document.getElementById("btn-edit-" + id);
  if (btnEdit) btnEdit.style.display = "";
};

window.guardarRegistro = async (id) => {
  const km      = parseInt(document.getElementById("km-"    + id)?.value);
  const proximo = parseInt(document.getElementById("prox-"  + id)?.value);
  const fecha   =          document.getElementById("fecha-" + id)?.value;

  if (isNaN(km) || isNaN(proximo) || !fecha) {
    showToast("Completá todos los campos antes de guardar", "warning"); return;
  }

  try {
    await updateDoc(doc(db, "servicios", id), { km, proximo, fecha });

    showToast("Registro actualizado correctamente", "success");

    /* Deshabilitar inputs y ocultar acciones */
    ["fecha-" + id, "km-" + id, "prox-" + id].forEach(fieldId => {
      const el = document.getElementById(fieldId);
      if (el) { el.disabled = true; el.style.borderColor = ""; }
    });

    const actions = document.getElementById("edit-actions-" + id);
    if (actions) actions.style.display = "none";

    const btnEdit = document.getElementById("btn-edit-" + id);
    if (btnEdit) btnEdit.style.display = "";

  } catch (err) {
    console.error(err);
    showToast("Error al guardar: " + err.message, "error");
  }
};

window.eliminarRegistro = async (id, fecha) => {
  const result = await Swal.fire({
    title: "¿Eliminar este registro?",
    text: `Registro del ${fecha}. Esta acción no se puede deshacer.`,
    icon: "warning",
    background: "#0d1a3a",
    color: "#fff",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#e30613",
    cancelButtonColor: "#334155",
  });

  if (!result.isConfirmed) return;

  try {
    await deleteDoc(doc(db, "servicios", id));

    /* Animación de salida */
    const card = document.getElementById("card-" + id);
    if (card) {
      card.style.transition = "opacity 0.3s, transform 0.3s";
      card.style.opacity    = "0";
      card.style.transform  = "translateX(-10px)";
      setTimeout(() => card.remove(), 300);
    }

    showToast("Registro eliminado", "success");
    cargarStats();

  } catch (err) {
    console.error(err);
    showToast("Error al eliminar: " + err.message, "error");
  }
};