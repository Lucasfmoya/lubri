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
   🛡️ HEADERS DE SEGURIDAD
========================= */
function setCORSHeaders(
  res,
  allowedOrigins = [
    "https://lucasfmoya.github.io",
    "https://lubricentro--ohiggins.web.app",
    "https://lubricentro--ohiggins.firebaseapp.com",
    "https://www.lubricentroohiggins.com.ar",
    "http://localhost:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5501",
    "http://127.0.0.1:5501",
  ],
) {
  const origin = res.req?.headers?.origin;
  if (allowedOrigins.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
}

/* =========================
   🔒 RATE LIMITING MEJORADO
   Limita por IP + fingerprint de user-agent para dificultar rotación de IPs
========================= */
async function checkRateLimit(req, res, opciones = {}) {
  const { ventana = 60000, limite = 5, coleccion = "rate_limits" } = opciones;

  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : req.socket?.remoteAddress || "unknown";

  // Fingerprint adicional: IP + fragmento de user-agent
  const ua = (req.headers["user-agent"] || "").substring(0, 40);
  const fingerprint = `${ip}::${ua}`;
  const docId = Buffer.from(fingerprint).toString("base64").substring(0, 100);

  const ahora = Date.now();
  const refLimit = db.collection(coleccion).doc(docId);

  try {
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(refLimit);

      if (!doc.exists) {
        tx.set(refLimit, { count: 1, time: ahora, ip });
        return;
      }

      const data = doc.data();

      if (ahora - data.time > ventana) {
        tx.set(refLimit, { count: 1, time: ahora, ip });
        return;
      }

      if (data.count >= limite) {
        throw new Error("RATE_LIMIT");
      }

      tx.update(refLimit, { count: data.count + 1 });
    });

    return true;
  } catch (err) {
    if (err.message === "RATE_LIMIT") {
      res.status(429).json({
        error: "Demasiadas solicitudes. Esperá 1 minuto.",
      });
      return false;
    }
    throw err;
  }
}

/* =========================
   🔎 BUSCAR POR PATENTE
========================= */
exports.buscarPorPatente = functions.https.onRequest(async (req, res) => {
  try {
    setCORSHeaders(res);

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método no permitido" });
    }

    const permitido = await checkRateLimit(req, res, {
      ventana: 60000,
      limite: 5,
      coleccion: "rate_limits",
    });
    if (!permitido) return;

    const { patente } = req.body || {};

    if (!patente || typeof patente !== "string") {
      return res.status(400).json({ error: "Patente requerida" });
    }

    const patenteNormalizada = patente.trim().toUpperCase().substring(0, 10);
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
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Solo devolver los campos necesarios (no exponer el ID interno)
      resultados.push({
        patente: data.patente,
        fecha: data.fecha,
        km: data.km,
        proximo: data.proximo,
      });
    });
    resultados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    return res.json(resultados);
  } catch (error) {
    console.error("ERROR buscarPorPatente:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

/* =========================
   📥 IMPORTAR SERVICIOS
   La verificación de admin ocurre EN EL SERVIDOR — no puede bypassearse desde el cliente
========================= */
exports.importarServicios = functions.https.onRequest(async (req, res) => {
  try {
    setCORSHeaders(res);

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método no permitido" });
    }

    // 1. Verificar token JWT (emitido por Firebase Auth, firmado con clave privada de Google)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const token = authHeader.split("Bearer ")[1];
    let decodedToken;

    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      return res.status(401).json({ error: "Token inválido o expirado" });
    }

    // 2. Verificar que el email está en la colección admins CON activo === true
    //    Esta verificación ocurre en el servidor — el cliente no puede manipularla
    const adminRef = db.collection("admins").doc(decodedToken.email);
    const adminDoc = await adminRef.get();

    if (!adminDoc.exists || adminDoc.data().activo !== true) {
      // Log intento no autorizado
      console.warn(
        `Acceso denegado: ${decodedToken.email} intentó importar sin ser admin activo`,
      );
      return res.status(403).json({ error: "Acceso denegado" });
    }

    // 3. Validar payload
    const data = req.body;
    if (!Array.isArray(data)) {
      return res
        .status(400)
        .json({ error: "Formato inválido: se esperaba un array" });
    }

    // Límite de tamaño para evitar DoS
    if (data.length > 10000) {
      return res.status(400).json({
        error: "Demasiados registros en una sola importación (máx. 10.000)",
      });
    }

    let batch = db.batch();
    let count = 0;
    let total = 0;
    let omitidos = 0;

    for (const item of data) {
      if (!item.PATENTE || !item.FECHA) {
        omitidos++;
        continue;
      }

      const patente = String(item.PATENTE).trim().toUpperCase();

      // Validar formato de patente antes de guardar
      const regex = /^[A-Z]{3}[0-9]{3}$|^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;
      if (!regex.test(patente)) {
        omitidos++;
        continue;
      }

      const fecha = normalizarFecha(item.FECHA);
      if (!fecha) {
        omitidos++;
        continue;
      }

      const km = Number(item["KMS ACTUALES"] || item.km);
      const proximo = Number(item["KMS PROX. CAMBIO"] || item.proximo);

      if (isNaN(km) || isNaN(proximo) || km < 0 || proximo < 0) {
        omitidos++;
        continue;
      }

      const id = `${patente}_${fecha}_${km}`;
      const ref = db.collection("servicios").doc(id);

      batch.set(ref, {
        patente,
        fecha,
        km,
        proximo,
        // Registrar quién importó y cuándo
        _importadoPor: decodedToken.email,
        _importadoEn: admin.firestore.FieldValue.serverTimestamp(),
      });

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

    console.info(
      `Importación completada por ${decodedToken.email}: ${total} registros, ${omitidos} omitidos`,
    );

    return res.json({ success: true, total, omitidos });
  } catch (error) {
    console.error("IMPORT ERROR:", error);
    return res.status(500).json({ error: "Error al importar datos" });
  }
});

/* =========================
   ⭐ OBTENER RESEÑAS
========================= */
const https = require("https");
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

const secretClient = new SecretManagerServiceClient();

const PLACE_ID = "ChIJwVKYWN6iMpQR6pckLMcr6O8";
const FIELDS = "reviews,rating,user_ratings_total,name";
const LANGUAGE = "es";

async function getApiKey() {
  const [version] = await secretClient.accessSecretVersion({
    name: "projects/lubricentro--ohiggins/secrets/PLACES_API_KEY/versions/latest",
  });
  return version.payload.data.toString("utf8");
}

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
    setCORSHeaders(res);

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Método no permitido" });
    }

    const permitido = await checkRateLimit(req, res, {
      ventana: 60000,
      limite: 20,
      coleccion: "rate_limits_reviews",
    });
    if (!permitido) return;

    // Intentar leer desde caché (TTL: 24 horas)
    const cacheRef = db.collection("cache_resenas").doc("google_places");
    const cacheDoc = await cacheRef.get();

    if (cacheDoc.exists) {
      const cached = cacheDoc.data();
      const ahora = Date.now();
      const TTL = 24 * 60 * 60 * 1000; // 24 horas

      if (ahora - cached.timestamp < TTL) {
        res.set("X-Cache", "HIT");
        return res.json(cached.data);
      }
    }

    // Caché expirado o inexistente — llamar a Places API
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

      // Si falla Places pero hay caché viejo, devolver el caché igual
      if (cacheDoc.exists) {
        res.set("X-Cache", "STALE");
        return res.json(cacheDoc.data().data);
      }

      return res.status(502).json({
        error: "Error al consultar Places API",
        status: data.status,
      });
    }

    const result = data.result;

    const respuesta = {
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
    };

    // Guardar en caché
    await cacheRef.set({
      data: respuesta,
      timestamp: Date.now(),
    });

    res.set("X-Cache", "MISS");
    return res.json(respuesta);
  } catch (error) {
    console.error("ERROR obtenerResenas:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});
