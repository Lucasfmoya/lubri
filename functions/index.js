const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// 🔥 rate limit en memoria (simple pero efectivo)
const rateLimit = new Map();

exports.buscarPorPatente = functions.https.onRequest(async (req, res) => {
  try {
    // 🔒 CORS básico
    res.set("Access-Control-Allow-Origin", "*");

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

    const ahora = Date.now();
    const ventana = 60000; // 1 minuto
    const limite = 10; // 🔥 10 requests por minuto por IP

    if (!rateLimit.has(ip)) {
      rateLimit.set(ip, { count: 1, time: ahora });
    } else {
      const data = rateLimit.get(ip);

      if (ahora - data.time > ventana) {
        rateLimit.set(ip, { count: 1, time: ahora });
      } else {
        data.count++;

        if (data.count > limite) {
          return res.status(429).json({
            error: "Demasiadas consultas. Intentá en 1 minuto.",
          });
        }
      }
    }

    const patente = req.query.patente?.toUpperCase().trim();

    if (!patente) {
      return res.status(400).json({ error: "Patente requerida" });
    }

    const snapshot = await db
      .collection("servicios")
      .where("patente", "==", patente)
      .get();

    if (snapshot.empty) {
      return res.json([]);
    }

    let resultados = [];

    snapshot.forEach((doc) => {
      resultados.push(doc.data());
    });

    // 🔥 eliminar duplicados (seguridad extra)
    const unicos = resultados.filter(
      (item, index, self) =>
        index ===
        self.findIndex(
          (t) =>
            t.fecha === item.fecha &&
            t.km === item.km &&
            t.patente === item.patente,
        ),
    );

    // 🔥 ordenar
    unicos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    res.json(unicos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno" });
  }
});
