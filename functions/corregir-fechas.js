// Simulación:  node corregir-fechas.js
// Aplicar:     node corregir-fechas.js --aplicar
const admin = require("firebase-admin");
const fs = require("fs");

admin.initializeApp({ projectId: "lubricentro--ohiggins" });
const db = admin.firestore();
const APLICAR = process.argv.includes("--aplicar");

(async () => {
  const snap = await db.collection("servicios").get();
  const arreglar = [];
  const sinResolver = [];

  snap.forEach((d) => {
    const data = d.data();
    const f = data.fecha;
    if (typeof f === "string" && /^\d{4}-\d{2}-\d{2}$/.test(f)) return; // OK

    const m = /^(\d{2})-(\d{2})-(\d{2})$/.exec(f || "");
    if (!m) return sinResolver.push({ id: d.id, fecha: f });

    const [, aa, dd, mm] = m; // guardado como AA-DD-MM
    const nueva = `20${aa}-${mm}-${dd}`;
    const valida = new Date(nueva + "T00:00:00Z").toISOString().slice(0, 10) === nueva;
    if (!valida) return sinResolver.push({ id: d.id, fecha: f });

    arreglar.push({ doc: d, data, nueva });
  });

  console.log("Total en servicios:", snap.size);
  console.log("A corregir:", arreglar.length);
  console.log("Sin resolver:", sinResolver.length, sinResolver.slice(0, 10));

  const porMes = {};
  arreglar.forEach((x) => {
    const mes = x.nueva.slice(0, 7);
    porMes[mes] = (porMes[mes] || 0) + 1;
  });
  console.table(porMes);
  arreglar.slice(0, 5).forEach((x) =>
    console.log(`${x.data.patente}: ${x.data.fecha}  ->  ${x.nueva}`),
  );

  if (!APLICAR) return console.log("Simulación: no se cambió nada. Usá --aplicar.");

  fs.mkdirSync("backups", { recursive: true });
  fs.writeFileSync(
    "backups/backup_antes_de_corregir_fechas.json",
    JSON.stringify(arreglar.map((x) => ({ id: x.doc.id, ...x.data })), null, 2),
  );
  console.log("Backup guardado.");

  let batch = db.batch();
  let n = 0;
  for (const x of arreglar) {
    const nuevoId = `${x.data.patente}_${x.nueva}_${x.data.km}`;
    batch.set(db.collection("servicios").doc(nuevoId), { ...x.data, fecha: x.nueva });
    batch.delete(x.doc.ref);
    if (++n % 200 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log("Corregidos:", n);
})();