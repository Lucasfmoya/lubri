const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.buscarPorPatente = functions.https.onRequest(async (req, res) => {
  try {
    // =========================
    // 🔥 CORS
    // =========================
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método no permitido" });
    }

    // =========================
    // 🚫 RATE LIMIT (ATÓMICO)
    // =========================
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress ||
      "unknown";

    const ahora = Date.now();
    const ventana = 60000; // 1 minuto
    const limite = 5; // 👈 para pruebas

    const ref = db.collection("rate_limits").doc(ip);

    try {
      await db.runTransaction(async (tx) => {
        const doc = await tx.get(ref);

        if (!doc.exists) {
          tx.set(ref, {
            count: 1,
            time: ahora,
          });
          return;
        }

        const data = doc.data();

        // reset ventana
        if (ahora - data.time > ventana) {
          tx.set(ref, {
            count: 1,
            time: ahora,
          });
          return;
        }

        // 🚫 BLOQUEO REAL
        if (data.count >= limite) {
          throw new Error("RATE_LIMIT");
        }

        tx.update(ref, {
          count: data.count + 1,
        });
      });
    } catch (err) {
      if (err.message === "RATE_LIMIT") {
        return res.status(429).json({
          error: "Demasiadas consultas. Esperá 1 minuto.",
        });
      }

      throw err;
    }

    // =========================
    // 📥 BODY + VALIDACIÓN
    // =========================
    const { patente } = req.body;

    if (!patente) {
      return res.status(400).json({ error: "Patente requerida" });
    }

    const patenteNormalizada = patente.toUpperCase().trim();

    const regex = /^[A-Z]{3}[0-9]{3}$|^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;

    if (!regex.test(patenteNormalizada)) {
      return res.status(400).json({ error: "Formato inválido" });
    }

    // =========================
    // 🔎 FIRESTORE QUERY
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

    // ordenar por fecha descendente
    resultados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    // =========================
    // ✅ RESPUESTA
    // =========================
    return res.json(resultados);
  } catch (error) {
    console.error("ERROR FUNCTION:", error);

    return res.status(500).json({
      error: "Error interno del servidor",
    });
  }
});
