import { db, auth, storage } from "./firebase-config.js";
import {
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
  setDoc,
  collection,
  getCountFromServer,
  query,
  where,
  getDocs,
  deleteDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

/* ─────────────────────────────────────────────
   ESTADO
───────────────────────────────────────────── */
let userToken = null;
let archivo = null;
let authReady = false;
let archivoAnuncioSeleccionado = null;

/* ─────────────────────────────────────────────
   ELEMENTOS — layout
───────────────────────────────────────────── */
const authLoader = document.getElementById("authLoader");
const loginPanel = document.getElementById("loginPanel");
const adminPanel = document.getElementById("adminPanel");
const adminSidebar = document.getElementById("adminSidebar");

/* ─────────────────────────────────────────────
   ELEMENTOS — login
───────────────────────────────────────────── */
const btnLoginEmail = document.getElementById("btnLoginEmail");
const emailInput = document.getElementById("emailInput");
const passInput = document.getElementById("passInput");
const togglePassBtn = document.getElementById("togglePassBtn");
const eyeIcon = document.getElementById("eyeIcon");

/* ─────────────────────────────────────────────
   ELEMENTOS — sidebar / topbar
───────────────────────────────────────────── */
const userPill = document.getElementById("userPill");
const userAvatar = document.getElementById("userAvatar");
const userEmailShort = document.getElementById("userEmailShort");
const btnLogout = document.getElementById("btnLogout");
const statusBadge = document.getElementById("statusBadge");
const topbarTitle = document.getElementById("topbarTitle");

/* ─────────────────────────────────────────────
   ELEMENTOS — stats
───────────────────────────────────────────── */
const statTotal = document.getElementById("statTotal");
const statLast = document.getElementById("statLast");
const statLastDate = document.getElementById("statLastDate");

/* ─────────────────────────────────────────────
   ELEMENTOS — secciones
───────────────────────────────────────────── */
const sectionImport = document.getElementById("sectionImport");
const sectionImportSide = document.getElementById("sectionImportSide");
const sectionSearch = document.getElementById("sectionSearch");
const sectionSecurity = document.getElementById("sectionSecurity");
const sectionAnuncio = document.getElementById("sectionAnuncio");

/* ─────────────────────────────────────────────
   ELEMENTOS — importar
───────────────────────────────────────────── */
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const fileInfoRow = document.getElementById("fileInfoRow");
const fileInfoName = document.getElementById("fileInfoName");
const btnEliminar = document.getElementById("btnEliminar");
const btnSubir = document.getElementById("btnSubir");
const log = document.getElementById("log");

/* ─────────────────────────────────────────────
   ELEMENTOS — buscar
───────────────────────────────────────────── */
const searchPatente = document.getElementById("searchPatente");
const btnSearchPatente = document.getElementById("btnSearchPatente");
const searchResults = document.getElementById("searchResults");

/* ─────────────────────────────────────────────
   ELEMENTOS — seguridad
───────────────────────────────────────────── */
const changePassSection = document.getElementById("changePassSection");
const changePassUnavailable = document.getElementById("changePassUnavailable");
const btnChangePass = document.getElementById("btnChangePass");

/* ─────────────────────────────────────────────
   ELEMENTOS — anuncios
───────────────────────────────────────────── */
const dropZoneAnuncio = document.getElementById("dropZoneAnuncio");
const fileInputAnuncio = document.getElementById("fileInputAnuncio");
const fileInfoRowAnuncio = document.getElementById("fileInfoRowAnuncio");
const fileInfoNameAnuncio = document.getElementById("fileInfoNameAnuncio");
const btnQuitarArchivoAnuncio = document.getElementById(
  "btnQuitarArchivoAnuncio",
);
const btnPublicarAnuncio = document.getElementById("btnPublicarAnuncio");
const btnEliminarAnuncio = document.getElementById("btnEliminarAnuncio");
const imgPreviewAnuncio = document.getElementById("imgPreviewAnuncio");
const sinImagenAnuncio = document.getElementById("sinImagenAnuncio");
const switchMostrarAnuncio = document.getElementById("switchMostrarAnuncio");
const switchAnuncioEstado = document.getElementById("switchAnuncioEstado");

const ANUNCIO_DOC_REF = doc(db, "config", "anuncio");

const FUNCTION_URL = "https://importarservicios-pbgzdzmh5q-uc.a.run.app";

/* ═══════════════════════════════════════════
   HELPERS — show / hide
═══════════════════════════════════════════ */
function show(el) {
  el?.classList.remove("adm-hidden");
}
function hide(el) {
  el?.classList.add("adm-hidden");
}

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
    if (statTotal)
      statTotal.textContent = snap.data().count.toLocaleString("es-AR");
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

/* ═══════════════════════════════════════════
   NAVEGACIÓN SIDEBAR
═══════════════════════════════════════════ */
function ocultarTodasSecciones() {
  hide(sectionImport);
  hide(sectionImportSide);
  hide(sectionSearch);
  hide(sectionSecurity);
  hide(sectionAnuncio);
}

/* ── Función central de navegación ── */
function mostrarSeccion(section) {
  document
    .querySelectorAll(".adm-nav-item")
    .forEach((b) => b.classList.remove("active"));
  const activeBtn = document.querySelector(
    `.adm-nav-item[data-section="${section}"]`,
  );
  if (activeBtn) activeBtn.classList.add("active");

  ocultarTodasSecciones();

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
  } else if (section === "anuncio") {
    show(sectionAnuncio);
    if (topbarTitle) topbarTitle.textContent = "Anuncios";
    cargarEstadoAnuncio();
  }
}

/* Eventos de los botones del sidebar */
document.querySelectorAll(".adm-nav-item[data-section]").forEach((btn) => {
  btn.addEventListener("click", () => mostrarSeccion(btn.dataset.section));
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

/* Limpiar campos al cargar para evitar autocompletado */
window.addEventListener("load", () => limpiarCamposLogin());

/* ═══════════════════════════════════════════
   LOGIN — EMAIL / CONTRASEÑA
═══════════════════════════════════════════ */
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
onAuthStateChanged(auth, async (user) => {
  hide(authLoader);

  if (!authReady) {
    authReady = true;
    if (!user) {
      show(loginPanel);
      return;
    }
  }

  /* reset UI completo */
  hide(loginPanel);
  hide(adminPanel);
  hide(adminSidebar);
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

  /* Info del usuario en el sidebar */
  if (userAvatar) userAvatar.textContent = getInitials(user.email);
  if (userEmailShort)
    userEmailShort.textContent =
      user.email.length > 22 ? user.email.substring(0, 20) + "…" : user.email;

  /* Mostrar todo */
  show(adminSidebar);
  show(userPill);
  show(adminPanel);
  show(statusBadge);

  /* Cambio de contraseña: solo para email/pass */
  const isEmailPass = user.providerData[0]?.providerId === "password";
  if (isEmailPass) {
    show(changePassSection);
    hide(changePassUnavailable);
  } else {
    hide(changePassSection);
    show(changePassUnavailable);
  }

  cargarStats();

  /* ── Mostrar "Importar datos" por defecto al entrar ── */
  mostrarSeccion("import");

  logMsg("Sesión iniciada — " + user.email, "success");
  showToast("Bienvenido, " + user.email.split("@")[0], "success");
});

/* ═══════════════════════════════════════════
   CAMBIAR CONTRASEÑA
═══════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════
   DROP ZONE / SELECCIÓN DE ARCHIVO
═══════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════
   SUBIR ARCHIVO
═══════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════
   BUSCAR POR PATENTE
═══════════════════════════════════════════ */

let searchDebounceTimer = null;
const searchCache = new Map();

function mostrarSkeletonAdmin() {
  searchResults.innerHTML = `
    <div class="hst-skeleton-wrap">
      ${[1, 2]
        .map(
          () => `
        <div class="hst-skeleton-card">
          <div class="hst-sk-top">
            <div class="hst-sk-block wide"></div>
            <div class="hst-sk-block narrow"></div>
          </div>
          <div class="hst-sk-body">
            <div class="hst-sk-block mid"></div>
            <div class="hst-sk-block mid"></div>
          </div>
        </div>
      `,
        )
        .join("")}
    </div>`;
}

async function ejecutarBusquedaAdmin() {
  const patente = searchPatente?.value.trim();
  const regex = /^[A-Z]{3}[0-9]{3}$|^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;

  if (!patente || !regex.test(patente)) return;

  /* Cache */
  if (searchCache.has(patente)) {
    renderResultadosAdmin(searchCache.get(patente), patente);
    return;
  }

  mostrarSkeletonAdmin();

  try {
    const q = query(
      collection(db, "servicios"),
      where("patente", "==", patente),
    );
    const snap = await getDocs(q);

    const docs = [];
    snap.forEach((d) => docs.push({ id: d.id, ...d.data() }));
    docs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    searchCache.set(patente, docs);
    renderResultadosAdmin(docs, patente);
  } catch (err) {
    console.error(err);
    showToast("Error al buscar: " + err.message, "error");
    searchResults.innerHTML = `
      <div class="sr-error">
        <i class="bi bi-exclamation-triangle-fill"></i> ${err.message}
      </div>`;
  }
}

function renderResultadosAdmin(docs, patente) {
  if (!docs.length) {
    searchResults.innerHTML = `
      <div class="sr-empty">
        <i class="bi bi-inbox"></i>
        <p>No se encontraron registros para <strong>${patente}</strong></p>
      </div>`;
    return;
  }

  function fmtFecha(f) {
    if (!f) return "—";
    const [y, m, d] = f.split("-");
    return `${d}/${m}/${y}`;
  }

  const header = `
    <div class="sr-header">
      <i class="bi bi-list-ul"></i>
      ${docs.length} registro${docs.length !== 1 ? "s" : ""} encontrado${docs.length !== 1 ? "s" : ""}
    </div>`;

  const cards = docs
    .map(
      (d) => `
    <div id="card-${d.id}" class="sr-card sr-card--old">
      <div class="sr-card-head">
        <div class="sr-card-head-left">
          <span class="sr-plate">${d.patente}</span>
          <span class="sr-fecha-display">${fmtFecha(d.fecha)}</span>
        </div>
        <div class="sr-card-head-right">
          <button onclick="editarRegistro('${d.id}')"
            id="btn-edit-${d.id}" class="sr-btn sr-btn--edit">
            <i class="bi bi-pencil-fill"></i> Editar
          </button>
          <button onclick="eliminarRegistro('${d.id}', '${d.fecha}')"
            class="sr-btn sr-btn--delete">
            <i class="bi bi-trash3-fill"></i> Eliminar
          </button>
        </div>
      </div>
      <div class="sr-fields">
        <div class="sr-field">
          <div class="sr-field-label"><i class="bi bi-calendar3"></i> Fecha</div>
          <input id="fecha-${d.id}" type="date" value="${d.fecha}" class="adm-input sr-input" disabled />
        </div>
        <div class="sr-field">
          <div class="sr-field-label"><i class="bi bi-speedometer2"></i> Km actuales</div>
          <input id="km-${d.id}" type="number" value="${d.km}" class="adm-input sr-input" disabled />
        </div>
        <div class="sr-field">
          <div class="sr-field-label"><i class="bi bi-arrow-right-circle"></i> Próximo service</div>
          <input id="prox-${d.id}" type="number" value="${d.proximo}" class="adm-input sr-input" disabled />
        </div>
      </div>
      <div id="edit-actions-${d.id}" class="sr-edit-actions" style="display:none;">
        <button onclick="guardarRegistro('${d.id}')" class="sr-btn sr-btn--save">
          <i class="bi bi-check-lg"></i> Guardar cambios
        </button>
        <button onclick="cancelarEdicion('${d.id}', ${d.km}, ${d.proximo}, '${d.fecha}')"
          class="sr-btn sr-btn--cancel">
          <i class="bi bi-x-lg"></i> Cancelar
        </button>
      </div>
    </div>
  `,
    )
    .join("");

  searchResults.innerHTML = header + cards;
}

/* Sanitizar input + debounce automático */
searchPatente?.addEventListener("input", () => {
  searchPatente.value = searchPatente.value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  clearTimeout(searchDebounceTimer);

  const val = searchPatente.value;
  const regex = /^[A-Z]{3}[0-9]{3}$|^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;

  if (val.length < 6) {
    searchResults.innerHTML = "";
    return;
  }

  if (regex.test(val)) {
    searchDebounceTimer = setTimeout(() => ejecutarBusquedaAdmin(), 500);
  }
});

/* Enter en el input */
searchPatente?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    clearTimeout(searchDebounceTimer);
    ejecutarBusquedaAdmin();
  }
});

btnSearchPatente?.addEventListener("click", () => {
  const patente = searchPatente?.value.trim();
  const regex = /^[A-Z]{3}[0-9]{3}$|^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;
  if (!patente) {
    showToast("Ingresá una patente", "warning");
    return;
  }
  if (!regex.test(patente)) {
    showToast("Formato de patente inválido (ej: ABC123 o AB123CD)", "warning");
    return;
  }
  clearTimeout(searchDebounceTimer);
  ejecutarBusquedaAdmin();
});

/* ═══════════════════════════════════════════
   CRUD — funciones globales
═══════════════════════════════════════════ */

window.editarRegistro = (id) => {
  ["fecha-" + id, "km-" + id, "prox-" + id].forEach((fieldId) => {
    const el = document.getElementById(fieldId);
    if (el) {
      el.disabled = false;
      el.classList.add("sr-input--editing");
    }
  });
  const actions = document.getElementById("edit-actions-" + id);
  if (actions) actions.style.display = "flex";
  const btnEdit = document.getElementById("btn-edit-" + id);
  if (btnEdit) btnEdit.style.display = "none";
};

window.cancelarEdicion = (id, km, proximo, fecha) => {
  const fechaEl = document.getElementById("fecha-" + id);
  const kmEl = document.getElementById("km-" + id);
  const proxEl = document.getElementById("prox-" + id);

  if (fechaEl) {
    fechaEl.value = fecha;
    fechaEl.disabled = true;
    fechaEl.classList.remove("sr-input--editing");
  }
  if (kmEl) {
    kmEl.value = km;
    kmEl.disabled = true;
    kmEl.classList.remove("sr-input--editing");
  }
  if (proxEl) {
    proxEl.value = proximo;
    proxEl.disabled = true;
    proxEl.classList.remove("sr-input--editing");
  }

  const actions = document.getElementById("edit-actions-" + id);
  if (actions) actions.style.display = "none";
  const btnEdit = document.getElementById("btn-edit-" + id);
  if (btnEdit) btnEdit.style.display = "";
};

window.guardarRegistro = async (id) => {
  const km = parseInt(document.getElementById("km-" + id)?.value);
  const proximo = parseInt(document.getElementById("prox-" + id)?.value);
  const fecha = document.getElementById("fecha-" + id)?.value;

  if (isNaN(km) || isNaN(proximo) || !fecha) {
    showToast("Completá todos los campos antes de guardar", "warning");
    return;
  }

  try {
    await updateDoc(doc(db, "servicios", id), { km, proximo, fecha });
    showToast("Registro actualizado correctamente", "success");

    ["fecha-" + id, "km-" + id, "prox-" + id].forEach((fieldId) => {
      const el = document.getElementById(fieldId);
      if (el) {
        el.disabled = true;
        el.classList.remove("sr-input--editing");
      }
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
    const card = document.getElementById("card-" + id);
    if (card) {
      card.style.transition = "opacity 0.3s, transform 0.3s";
      card.style.opacity = "0";
      card.style.transform = "translateX(-10px)";
      setTimeout(() => card.remove(), 300);
    }
    showToast("Registro eliminado", "success");
    cargarStats();
  } catch (err) {
    console.error(err);
    showToast("Error al eliminar: " + err.message, "error");
  }
};

/* ═══════════════════════════════════════════
   ANUNCIOS — subir / publicar / eliminar / switch
═══════════════════════════════════════════ */

function limpiarArchivoAnuncio() {
  archivoAnuncioSeleccionado = null;
  if (fileInputAnuncio) fileInputAnuncio.value = "";
  fileInfoRowAnuncio?.classList.remove("visible");
  if (fileInfoNameAnuncio) fileInfoNameAnuncio.textContent = "";
  if (btnPublicarAnuncio) btnPublicarAnuncio.disabled = true;
}

function setArchivoAnuncio(file) {
  archivoAnuncioSeleccionado = file;
  if (fileInfoNameAnuncio) fileInfoNameAnuncio.textContent = file.name;
  fileInfoRowAnuncio?.classList.add("visible");
  if (btnPublicarAnuncio) btnPublicarAnuncio.disabled = false;
}

dropZoneAnuncio?.addEventListener("click", () => fileInputAnuncio.click());
dropZoneAnuncio?.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZoneAnuncio.classList.add("dragover");
});
dropZoneAnuncio?.addEventListener("dragleave", () => {
  dropZoneAnuncio.classList.remove("dragover");
});
dropZoneAnuncio?.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZoneAnuncio.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (!file) return;
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    showToast("Solo se aceptan imágenes PNG, JPG o WEBP", "warning");
    return;
  }
  setArchivoAnuncio(file);
});
fileInputAnuncio?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) setArchivoAnuncio(file);
});
btnQuitarArchivoAnuncio?.addEventListener("click", () =>
  limpiarArchivoAnuncio(),
);

async function cargarEstadoAnuncio() {
  try {
    const snap = await getDoc(ANUNCIO_DOC_REF);
    const data = snap.exists() ? snap.data() : {};
    renderEstadoAnuncio(data);
  } catch (err) {
    console.error(err);
    showToast("No se pudo cargar el estado del anuncio", "error");
  }
}

function renderEstadoAnuncio(data) {
  const tieneImagen = !!data.imageUrl;

  if (tieneImagen) {
    imgPreviewAnuncio.src = data.imageUrl;
    imgPreviewAnuncio.classList.add("visible");
    hide(sinImagenAnuncio);
    btnEliminarAnuncio.disabled = false;
  } else {
    imgPreviewAnuncio.classList.remove("visible");
    show(sinImagenAnuncio);
    btnEliminarAnuncio.disabled = true;
  }

  switchMostrarAnuncio.disabled = !tieneImagen;
  switchMostrarAnuncio.classList.toggle("is-on", !!data.activo);
  switchAnuncioEstado.textContent = data.activo
    ? "Activo — se muestra en el sitio"
    : "Apagado";
}

btnPublicarAnuncio?.addEventListener("click", async () => {
  if (!archivoAnuncioSeleccionado) {
    showToast("Seleccioná una imagen primero", "warning");
    return;
  }

  btnPublicarAnuncio.disabled = true;
  btnPublicarAnuncio.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Publicando...`;

  try {
    const snapActual = await getDoc(ANUNCIO_DOC_REF);
    const dataActual = snapActual.exists() ? snapActual.data() : {};

    if (dataActual.storagePath) {
      try {
        await deleteObject(ref(storage, dataActual.storagePath));
      } catch (e) {
        console.warn("No se pudo borrar la imagen anterior:", e.message);
      }
    }

    const ext = archivoAnuncioSeleccionado.name.split(".").pop().toLowerCase();
    const path = `anuncios/imagen_anuncio.${ext}`;
    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, archivoAnuncioSeleccionado);
    const url = await getDownloadURL(storageRef);

    await setDoc(
      ANUNCIO_DOC_REF,
      { imageUrl: url, storagePath: path },
      { merge: true },
    );

    showToast("Anuncio publicado correctamente", "success");
    limpiarArchivoAnuncio();
    cargarEstadoAnuncio();
  } catch (err) {
    console.error(err);
    showToast("Error al publicar: " + err.message, "error");
  } finally {
    btnPublicarAnuncio.innerHTML = `<i class="bi bi-cloud-upload-fill"></i> Publicar`;
    btnPublicarAnuncio.disabled = !archivoAnuncioSeleccionado;
  }
});

btnEliminarAnuncio?.addEventListener("click", async () => {
  const result = await Swal.fire({
    title: "¿Eliminar el anuncio?",
    text: "Se apagará el aviso en el sitio y se borrará el archivo.",
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
    const snapActual = await getDoc(ANUNCIO_DOC_REF);
    const dataActual = snapActual.exists() ? snapActual.data() : {};

    if (dataActual.storagePath) {
      try {
        await deleteObject(ref(storage, dataActual.storagePath));
      } catch (e) {
        console.warn("El archivo ya no existía en Storage:", e.message);
      }
    }

    await setDoc(
      ANUNCIO_DOC_REF,
      { imageUrl: null, storagePath: null, activo: false },
      { merge: true },
    );

    showToast("Anuncio eliminado", "success");
    cargarEstadoAnuncio();
  } catch (err) {
    console.error(err);
    showToast("Error al eliminar: " + err.message, "error");
  }
});

switchMostrarAnuncio?.addEventListener("click", async () => {
  try {
    const snapActual = await getDoc(ANUNCIO_DOC_REF);
    const dataActual = snapActual.exists() ? snapActual.data() : {};

    if (!dataActual.imageUrl) {
      showToast("Primero publicá un anuncio", "warning");
      return;
    }

    await updateDoc(ANUNCIO_DOC_REF, { activo: !dataActual.activo });
    cargarEstadoAnuncio();
  } catch (err) {
    console.error(err);
    showToast("Error al actualizar: " + err.message, "error");
  }
});

/* ═══════════════════════════════════════════
   DARK / LIGHT MODE
═══════════════════════════════════════════ */
(function () {
  const body = document.querySelector(".adm-body");
  if (!body) return;
  const saved = localStorage.getItem("adm-theme");
  if (saved === "dark") body.classList.add("dark-mode");
  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    const isDark = body.classList.toggle("dark-mode");
    localStorage.setItem("adm-theme", isDark ? "dark" : "light");
  });
})();

/* ═══════════════════════════════════════════
   TOGGLE SIDEBAR
═══════════════════════════════════════════ */
(function () {
  const btn = document.getElementById("btnToggleSidebar");
  const shell = document.querySelector(".adm-shell");
  const sidebar = document.querySelector(".adm-sidebar");
  if (!shell || !sidebar) return;

  const overlay = document.createElement("div");
  overlay.className = "adm-sidebar-overlay";
  document.body.appendChild(overlay);

  function closeMobile() {
    document.body.style.overflow = "";
    sidebar.classList.remove("mobile-open");
    overlay.classList.remove("visible");
  }

  if (window.innerWidth > 900) {
    if (localStorage.getItem("adm-sidebar") === "collapsed") {
      shell.classList.add("sidebar-collapsed");
    }
  }

  if (btn) {
    btn.addEventListener("click", () => {
      if (window.innerWidth > 900) {
        const collapsed = shell.classList.toggle("sidebar-collapsed");
        localStorage.setItem("adm-sidebar", collapsed ? "collapsed" : "open");
      }
    });
  }

  const mobileBtn = document.createElement("button");
  mobileBtn.className = "adm-mobile-toggle";
  mobileBtn.setAttribute("aria-label", "Expandir menú");
  mobileBtn.innerHTML = '<i class="bi bi-chevron-down"></i>';
  mobileBtn.style.display = window.innerWidth <= 900 ? "flex" : "none";
  sidebar.appendChild(mobileBtn);

  window.addEventListener("resize", () => {
    mobileBtn.style.display = window.innerWidth <= 900 ? "flex" : "none";
    if (window.innerWidth > 900) closeMobile();
  });

  mobileBtn.addEventListener("click", () => {
    const isOpen = sidebar.classList.toggle("mobile-open");
    document.body.style.overflow = isOpen ? "hidden" : "";
    overlay.classList.toggle("visible", isOpen);
  });

  overlay.addEventListener("click", closeMobile);

  sidebar.querySelectorAll(".adm-nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      if (window.innerWidth <= 900) closeMobile();
    });
  });
})();