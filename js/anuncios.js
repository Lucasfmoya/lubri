/* =============================================
   SWEETALERT2 — ANUNCIOS
============================================= */

import { db } from "./firebase-config.js";

import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Anuncios.js cargado");

  if (sessionStorage.getItem("anuncioMostrado")) {
    console.log("Ya fue mostrado en esta sesión");
    return;
  }

  try {
    console.log("DB:", db);

    const anuncioRef = doc(db, "config", "anuncioPrincipal");
    console.log("Referencia creada");

    const anuncioSnap = await getDoc(anuncioRef);

    console.log("Documento existe:", anuncioSnap.exists());

    if (!anuncioSnap.exists()) return;

    const anuncio = anuncioSnap.data();

    console.log(anuncio);

    if (!anuncio.visible) {
      console.log("Visible = false");
      return;
    }

    if (!anuncio.imagen) {
      console.log("No hay imagen");
      return;
    }

    console.log("Mostrando anuncio...");

    Swal.fire({
      imageUrl: anuncio.imagen,
      imageWidth: "100%",
      imageAlt: "Aviso",
      showConfirmButton: false,
      showCloseButton: true,
      customClass: {
        popup: "swal-anuncio",
      },
      backdrop: "rgba(0,0,0,.7)",
    });
  } catch (error) {
    console.error(error);
  }
});
