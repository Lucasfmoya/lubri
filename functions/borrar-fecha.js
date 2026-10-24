// functions/borrar-fecha.js
// Uso (simulación):  node borrar-fecha.js 2026-04-01 2026-04-30
// Uso (borra de verdad): node borrar-fecha.js 2026-04-01 2026-04-30 --borrar
const admin = require("firebase-admin");
const fs = require("fs");

const [desde, hasta] = process.argv.slice(2);
const BORRAR = process.argv.includes("--borrar");
const formato = /^\d{4}-\d{2}-\d{2}$/;

if (!formato.test(desde || "") || !formato.test(hasta || "")) {
  console.error("Uso: node borrar-fecha.js AAAA-MM-DD AAAA-MM-DD [--borrar]");
  process.exit(1);
}

admin.initializeApp({ projectId: "lubricentro--ohiggins" });
const db = admin.firestore();

(async () => {
  const snap = await db
    .collection("servicios")
    .where("fecha", ">=", desde)
    .where("fecha", "<=", hasta)
    .get();

  console.log(`Registros entre ${desde} y ${hasta}: ${snap.size}`);

  if (!BORRAR) {
    console.log("Simulación: no se borró nada. Agregá --borrar para borrar.");
    return;
  }

  // Backup antes de borrar
  fs.mkdirSync("backups", { recursive: true });
  const archivo = `backups/backup_${desde}_${hasta}.json`;
  fs.writeFileSync(
    archivo,
    JSON.stringify(
      snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      null,
      2,
    ),
  );
  console.log("Backup guardado en", archivo);

  let batch = db.batch();
  let n = 0;
  for (const d of snap.docs) {
    batch.delete(d.ref);
    if (++n % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log("Borrados:", n);
})();
