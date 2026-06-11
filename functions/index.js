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

    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded
      ? forwarded.split(",").pop().trim()
      : req.socket.remoteAddress || "unknown";

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
      const fecha = normalizarFecha(item.FECHA);

      if (!fecha) continue;

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

/* =========================
   ⭐ OBTENER RESEÑAS — Places API
   Agregá esta función al final de functions/index.js
   Reemplazá la función "obtenerResenas" que ya existe
========================= */

const https = require("https");
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

const secretClient = new SecretManagerServiceClient();

// ── Constantes ──────────────────────────────────────────
const PLACE_ID = "ChIJwVKYWN6iMpQR6pckLMcr6O8";
const FIELDS = "reviews,rating,user_ratings_total,name";
const LANGUAGE = "es";

// ── Obtener API Key desde Secret Manager ────────────────
async function getApiKey() {
  const [version] = await secretClient.accessSecretVersion({
    name: "projects/lubricentro--ohiggins/secrets/PLACES_API_KEY/versions/latest",
  });

  return version.payload.data.toString("utf8");
}

// ── Helper: fetch con https nativo ──────────────────────
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error("JSON parse error"));
          }
        });
      })
      .on("error", reject);
  });
}

exports.obtenerResenas = functions.https.onRequest(async (req, res) => {
  try {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "GET") {
      return res.status(405).json({
        error: "Método no permitido",
      });
    }

    // Obtener API Key desde Secret Manager
    const API_KEY = await getApiKey();

    const url =
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${PLACE_ID}` +
      `&fields=${FIELDS}` +
      `&language=${LANGUAGE}` +
      `&key=${API_KEY}`;

    const data = await fetchJSON(url);

    if (data.status !== "OK") {
      console.error("Places API error:", data.status, data.error_message);

      return res.status(502).json({
        error: "Error al consultar Places API",
        status: data.status,
      });
    }

    const result = data.result;

    return res.json({
      nombre: result.name || "",
      rating: result.rating || 0,
      total_resenas: result.user_ratings_total || 0,
      resenas: (result.reviews || []).map((r) => ({
        autor: r.author_name,
        foto: r.profile_photo_url,
        rating: r.rating,
        texto: r.text,
        tiempo: r.relative_time_description,
        url_autor: r.author_url,
      })),
    });
  } catch (error) {
    console.error("ERROR obtenerResenas:", error);

    return res.status(500).json({
      error: "Error interno del servidor",
    });
  }
});
