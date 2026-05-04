const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const rateLimit = new Map();

exports.buscarPorPatente = functions.https.onRequest(async (req, res) => {
  try {
    // =========================
    // 🔥 CORS PERFECTO
    // =========================
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");

    // 👇 IMPORTANTE: responder preflight
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    // =========================
    // RATE LIMIT
    // =========================
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

    const ahora = Date.now();
    const ventana = 60000;
    const limite = 20;

    if (!rateLimit.has(ip)) {
      rateLimit.set(ip, { count: 1, time: ahora });
    } else {
      const data = rateLimit.get(ip);

      if (ahora - data.time > ventana) {
        rateLimit.set(ip, { count: 1, time: ahora });
      } else {
        data.count++;
        if (data.count > limite) {
          return res.status(429).json({ error: "Demasiadas consultas" });
        }
      }
    }

    // =========================
    // BODY
    // =========================
    const { patente } = req.body;

    if (!patente) {
      return res.status(400).json({ error: "Patente requerida" });
    }

    const patenteNormalizada = patente.toUpperCase().trim();

    // =========================
    // FIRESTORE
    // =========================
    const snapshot = await db
      .collection("servicios")
      .where("patente", "==", patenteNormalizada)
      .get();

    if (snapshot.empty) {
      return res.json([]);
    }

    const resultados = [];

    snapshot.forEach((doc) => {
      resultados.push(doc.data());
    });

    resultados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    return res.json(resultados);
  } catch (error) {
    console.error("ERROR FUNCTION:", error);

    return res.status(500).json({
      error: "Error interno",
    });
  }
});
