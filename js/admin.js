const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const btnSubir = document.getElementById("btnSubir");
const log = document.getElementById("log");
const progressBar = document.getElementById("progressBar");
const fileInfo = document.getElementById("fileInfo");

let archivo = null;

// 🔐 CONFIG
const FUNCTION_URL = "https://importarservicios-pbgzdzmh5q-uc.a.run.app";
const API_KEY = "123456SUPERSECRETA";

function logMsg(msg) {
  log.innerHTML += `<div>${msg}</div>`;
  log.scrollTop = log.scrollHeight;
}

// CLICK
dropZone.addEventListener("click", () => fileInput.click());

// DRAG
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.style.borderColor = "#dc3545";
});

dropZone.addEventListener("dragleave", () => {
  dropZone.style.borderColor = "#6c757d";
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  archivo = e.dataTransfer.files[0];
  procesarArchivo();
});

// INPUT
fileInput.addEventListener("change", (e) => {
  archivo = e.target.files[0];
  procesarArchivo();
});

function procesarArchivo() {
  if (!archivo) return;

  fileInfo.innerHTML = `Archivo: <strong>${archivo.name}</strong>`;
  btnSubir.disabled = false;
  logMsg("📂 Archivo cargado");
}

// SUBIR
btnSubir.addEventListener("click", async () => {
  if (!archivo) return;

  logMsg("📊 Leyendo Excel...");

  const data = await archivo.arrayBuffer();
  const workbook = XLSX.read(data);

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { raw: true });

  const json = raw.map((row) => {
    let fecha = row.FECHA;

    // 🔥 convertir fecha de Excel a YYYY-MM-DD
    if (typeof fecha === "number") {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const fechaConvertida = new Date(excelEpoch.getTime() + fecha * 86400000);

      fecha = fechaConvertida.toISOString().split("T")[0];
    }

    return {
      ...row,
      FECHA: fecha,
    };
  });

  logMsg(`📦 Registros: ${json.length}`);

  progressBar.style.width = "30%";
  progressBar.innerText = "30%";

  try {
    logMsg("☁️ Enviando datos...");

    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify(json),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Error");
    }

    progressBar.style.width = "100%";
    progressBar.innerText = "100%";

    logMsg(`✅ Importados: ${result.total}`);
  } catch (error) {
    console.error(error);
    logMsg("❌ Error al subir datos");
  }
});
