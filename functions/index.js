const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

/* =========================
   📅 NORMALIZAR FECHA
========================= */
function normalizarFecha(valor) {
  if (!valor) return null;

  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return valor;
  }

  if (typeof valor === "number") {
    const fecha = new Date(Math.round((valor - 25569) * 86400 * 1000));
    const y = fecha.getUTCFullYear();
    const m = String(fecha.getUTCMonth() + 1).padStart(2, "0");
    const d = String(fecha.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  if (typeof valor === "string") {
    const partes = valor.split("/");
    if (partes.length === 3) {
      const [d, m, y] = partes;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }

  return null;
}

/* =========================
   🔎 BUSCAR POR PATENTE
========================= */
exports.buscarPorPatente = functions.https.onRequest(async (req, res) => {
  try {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método no permitido" });
    }

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress ||
      "unknown";

    const ahora = Date.now();
    const ventana = 60000;
    const limite = 5;

    const refLimit = db.collection("rate_limits").doc(ip);

    try {
      await db.runTransaction(async (tx) => {
        const doc = await tx.get(refLimit);

        if (!doc.exists) {
          tx.set(refLimit, { count: 1, time: ahora });
          return;
        }

        const data = doc.data();

        if (ahora - data.time > ventana) {
          tx.set(refLimit, { count: 1, time: ahora });
          return;
        }

        if (data.count >= limite) {
          throw new Error("RATE_LIMIT");
        }

        tx.update(refLimit, { count: data.count + 1 });
      });
    } catch (err) {
      if (err.message === "RATE_LIMIT") {
        return res.status(429).json({
          error: "Demasiadas consultas. Esperá 1 minuto.",
        });
      }
      throw err;
    }

    const { patente } = req.body;

    if (!patente) {
      return res.status(400).json({ error: "Patente requerida" });
    }

    const patenteNormalizada = patente.toUpperCase().trim();
    const regex = /^[A-Z]{3}[0-9]{3}$|^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;

    if (!regex.test(patenteNormalizada)) {
      return res.status(400).json({ error: "Formato inválido" });
    }

    const snapshot = await db
      .collection("servicios")
      .where("patente", "==", patenteNormalizada)
      .get();

    if (snapshot.empty) {
      return res.json([]);
    }

    const resultados = [];
    snapshot.forEach((doc) => resultados.push(doc.data()));
    resultados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    return res.json(resultados);
  } catch (error) {
    console.error("ERROR FUNCTION:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

/* =========================
   📥 IMPORTAR SERVICIOS
========================= */
exports.importarServicios = functions.https.onRequest(async (req, res) => {
  try {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método no permitido" });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const token = authHeader.split("Bearer ")[1];
    let decodedToken;

    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      return res.status(401).json({ error: "Token inválido" });
    }

    const adminRef = db.collection("admins").doc(decodedToken.email);
    const adminDoc = await adminRef.get();

    if (!adminDoc.exists || adminDoc.data().activo !== true) {
      return res.status(403).json({ error: "Acceso denegado" });
    }

    const data = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Formato inválido" });
    }

    let batch = db.batch();
    let count = 0;
    let total = 0;

    for (const item of data) {
      if (!item.PATENTE || !item.FECHA) continue;

      const patente = item.PATENTE.trim().toUpperCase();
      const fecha = normalizarFecha(item.FECHA); // ← CAMBIO CLAVE

      if (!fecha) continue; // si la fecha no se pudo normalizar, saltea la fila

      const km = Number(item["KMS ACTUALES"] || item.km);
      const proximo = Number(item["KMS PROX. CAMBIO"] || item.proximo);

      if (isNaN(km) || isNaN(proximo)) continue;

      const id = `${patente}_${fecha}_${km}`;
      const ref = db.collection("servicios").doc(id);

      batch.set(ref, { patente, fecha, km, proximo });

      count++;
      total++;

      if (count === 400) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    return res.json({ success: true, total });
  } catch (error) {
    console.error("IMPORT ERROR:", error);
    return res.status(500).json({ error: "Error al importar datos" });
  }
});

// ── Selector particular / flota
function setType(type) {
  const btnP = document.getElementById("btn-particular");
  const btnF = document.getElementById("btn-flota");
  const extra = document.getElementById("flota-extra");
  const hidden = document.getElementById("tipo_consulta");

  if (type === "flota") {
    btnF.classList.add("active");
    btnP.classList.remove("active");
    extra.classList.add("show");
    hidden.value = "Flota empresarial";
  } else {
    btnP.classList.add("active");
    btnF.classList.remove("active");
    extra.classList.remove("show");
    hidden.value = "Vehículo particular";
  }
}

// ── Envío con Formspree (fetch async para mostrar éxito sin redirigir)
const form = document.getElementById("contactForm");
const btn = document.getElementById("submitBtn");
const successEl = document.getElementById("formSuccess");

form.addEventListener("submit", async function (e) {
  e.preventDefault();
  btn.disabled = true;
  btn.innerHTML =
    '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';

  try {
    const res = await fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      form.style.display = "none";
      successEl.classList.add("show");
    } else {
      btn.disabled = false;
      btn.innerHTML =
        '<i class="bi bi-send-fill"></i><span>Enviar consulta</span>';
      alert(
        "Hubo un error al enviar. Por favor intentá nuevamente o contactanos por WhatsApp.",
      );
    }
  } catch {
    btn.disabled = false;
    btn.innerHTML =
      '<i class="bi bi-send-fill"></i><span>Enviar consulta</span>';
    alert("Error de conexión. Por favor intentá nuevamente.");
  }
});

/* =============================================
   LUBRICENTRO O'HIGGINS — reviews.js
   Autoplay · Loop · Swipe táctil · Dirección
   ============================================= */
(function () {
  "use strict";

  /* ── Datos ── */
  const reviews = [
    {
      av: "MG",
      bg: "#010a44",
      name: "Martín González",
      date: "hace 2 semanas",
      stars: 5,
      text: "Excelente atención, rápidos y honestos. Me avisaron que el filtro todavía estaba bien y no me lo cambiaron innecesariamente. Eso genera mucha confianza.",
    },
    {
      av: "LP",
      bg: "#1565c0",
      name: "Laura Pérez",
      date: "hace 1 mes",
      stars: 5,
      text: "Siempre voy ahí. El equipo es muy profesional y te explican todo lo que le hacen al auto. Los precios son justos y el servicio es rápido. 100% recomendable.",
    },
    {
      av: "RV",
      bg: "#2e7d32",
      name: "Roberto Villalba",
      date: "hace 3 semanas",
      stars: 5,
      text: "Fui por primera vez y me sorprendió la atención. Muy ordenados, limpios y explicaron cada paso del servicio. Ya tengo mi lubricentro de confianza en el sur.",
    },
    {
      av: "SC",
      bg: "#6a1b9a",
      name: "Sofía Carrizo",
      date: "hace 2 meses",
      stars: 5,
      text: "Me cambiaron el aceite y de paso me revisaron los líquidos sin cobrarme de más. El trato fue muy amable. Se nota que valoran al cliente. Volvería siempre.",
    },
    {
      av: "DM",
      bg: "#c62828",
      name: "Diego Moreno",
      date: "hace 5 semanas",
      stars: 5,
      text: "Rápido, limpio y honesto. No te intentan vender lo que no necesitás. Eso es cada vez más difícil de encontrar. Ya recomendé el lugar a varios amigos.",
    },
  ];

  /* ── Nodos ── */
  const card = document.getElementById("review-card");
  const dotsEl = document.getElementById("rw-dots");
  const btnP = document.getElementById("rw-prev");
  const btnN = document.getElementById("rw-next");

  // Barra de progreso: se inyecta antes de .rw-nav
  const nav = document.querySelector(".rw-nav");
  const progressWrap = document.createElement("div");
  progressWrap.className = "rw-progress";
  const progressBar = document.createElement("div");
  progressBar.className = "rw-progress-bar";
  progressWrap.appendChild(progressBar);
  nav && nav.parentNode.insertBefore(progressWrap, nav);

  /* ── Estado ── */
  let cur = 0;
  let busy = false;
  let timer = null;
  let paused = false;
  const DELAY = 4500; // ms entre reseñas

  /* ── Dots ── */
  reviews.forEach(function (_, i) {
    const d = document.createElement("button");
    d.className = "rw-dot" + (i === 0 ? " active" : "");
    d.setAttribute("aria-label", "Reseña " + (i + 1));
    d.addEventListener("click", function () {
      go(i, "fwd");
    });
    dotsEl.appendChild(d);
  });

  /* ── Render ── */
  function render(r) {
    const av = document.getElementById("ri-av");
    av.textContent = r.av;
    av.style.background = r.bg;
    document.getElementById("ri-name").textContent = r.name;
    document.getElementById("ri-date").textContent = r.date;
    document.getElementById("ri-stars").textContent = "★".repeat(r.stars);
    document.getElementById("ri-text").textContent = r.text;
  }

  /* ── Transición ── */
  function go(idx, dir) {
    // Normaliza índice para loop
    const total = reviews.length;
    idx = ((idx % total) + total) % total;

    if (idx === cur || busy) return;
    busy = true;

    const enterClass = dir === "back" ? "ri-enter-back" : "ri-enter-fwd";

    card.classList.add("ri-exit");

    card.addEventListener(
      "animationend",
      function onExit() {
        card.removeEventListener("animationend", onExit);
        card.classList.remove("ri-exit");

        cur = idx;
        render(reviews[cur]);

        card.classList.add(enterClass);
        card.addEventListener("animationend", function onEnter() {
          card.removeEventListener("animationend", onEnter);
          card.classList.remove(enterClass);
          busy = false;
        });

        // Dots
        document.querySelectorAll(".rw-dot").forEach(function (d, i) {
          d.classList.toggle("active", i === cur);
        });

        // Botones: siempre habilitados (loop)
        btnP.disabled = false;
        btnN.disabled = false;
      },
      { once: true },
    );

    resetAutoplay();
  }

  /* ── Autoplay ── */
  function startProgress() {
    if (!progressBar) return;
    progressBar.style.transition = "none";
    progressBar.style.width = "0%";
    // Forzar reflow para reiniciar la transición
    void progressBar.offsetWidth;
    progressBar.style.transition = "width " + DELAY + "ms linear";
    progressBar.style.width = "100%";
  }

  function startAutoplay() {
    clearTimeout(timer);
    if (!paused) {
      startProgress();
      timer = setTimeout(function () {
        go(cur + 1, "fwd");
      }, DELAY);
    }
  }

  function resetAutoplay() {
    clearTimeout(timer);
    startAutoplay();
  }

  function pauseAutoplay() {
    paused = true;
    clearTimeout(timer);
    if (progressBar) {
      const computed = getComputedStyle(progressBar).width;
      const parent = progressBar.parentElement.offsetWidth;
      const pct = (parseFloat(computed) / parent) * 100;
      progressBar.style.transition = "none";
      progressBar.style.width = pct + "%";
    }
  }

  function resumeAutoplay() {
    paused = false;
    startAutoplay();
  }

  /* ── Pausa al hover / focus ── */
  const widget = document.querySelector(".reviews-widget");
  if (widget) {
    widget.addEventListener("mouseenter", pauseAutoplay);
    widget.addEventListener("mouseleave", resumeAutoplay);
    widget.addEventListener("focusin", pauseAutoplay);
    widget.addEventListener("focusout", resumeAutoplay);
  }

  /* ── Botones ── */
  btnP &&
    btnP.addEventListener("click", function () {
      go(cur - 1, "back");
    });
  btnN &&
    btnN.addEventListener("click", function () {
      go(cur + 1, "fwd");
    });

  /* ── Swipe táctil ── */
  let touchStartX = 0;
  let touchStartY = 0;

  card &&
    card.addEventListener(
      "touchstart",
      function (e) {
        touchStartX = e.changedTouches[0].clientX;
        touchStartY = e.changedTouches[0].clientY;
      },
      { passive: true },
    );

  card &&
    card.addEventListener(
      "touchend",
      function (e) {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        // Solo swipe horizontal (ignora scroll vertical)
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          dx < 0 ? go(cur + 1, "fwd") : go(cur - 1, "back");
        }
      },
      { passive: true },
    );

  /* ── Teclado (accesibilidad) ── */
  card && card.setAttribute("tabindex", "0");
  card &&
    card.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") go(cur + 1, "fwd");
      if (e.key === "ArrowLeft") go(cur - 1, "back");
    });

  /* ── Init ── */
  render(reviews[0]);
  startAutoplay();
})();
