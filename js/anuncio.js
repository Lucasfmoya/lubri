import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

(async function () {
  if (sessionStorage.getItem("anuncioMostrado")) return;

  try {
    const snap = await getDoc(doc(db, "config", "anuncio"));
    if (!snap.exists()) return;

    const data = snap.data();
    if (!data.activo || !data.imageUrl) return;

    sessionStorage.setItem("anuncioMostrado", "true");

    Swal.fire({
      imageUrl: data.imageUrl,
      imageWidth: "100%",
      imageAlt: "Aviso - Lubricentro O'Higgins",
      showConfirmButton: false,
      showCloseButton: true,
      customClass: { popup: "swal-anuncio-imagen" },
      backdrop: "rgba(0, 0, 0, 0.75)",
    });
  } catch (err) {
    console.error("Error al cargar el anuncio:", err);
  }
})();