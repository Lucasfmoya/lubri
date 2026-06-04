// 1. URL pública que te entregó la consola de Firebase al desplegar
const URL_FIREBASE_REVIEWS = "COLOCA_AQUI_LA_URL_DE_TU_FUNCTION_URL";

async function inicializarResenasGoogle() {
    const contenedor = document.getElementById("google-reviews");
    if (!contenedor) return; // Seguridad por si no estás en la página con esta sección

    try {
        const respuesta = await fetch(URL_FIREBASE_REVIEWS);
        
        if (!respuesta.ok) {
            throw new Error(`Error en el servidor: ${respuesta.status}`);
        }

        const listaResenas = await respuesta.json();

        // Si la API responde pero el negocio aún no tiene ninguna reseña redactada
        if (listaResenas.length === 0) {
            contenedor.innerHTML = "<p class='sin-resenas'>Aún no hay opiniones disponibles.</p>";
            return;
        }

        // Limpiamos el mensaje de "Cargando..." antes de inyectar las tarjetas
        contenedor.innerHTML = "";

        // Recorremos el JSON enviado por Firebase para armar las tarjetas HTML
        listaResenas.forEach(item => {
            const tarjeta = document.createElement("div");
            tarjeta.className = "tarjeta-resena";

            // Pasamos la calificación de texto ("FIVE", "FOUR", etc.) a número entero
            const estrellasNumero = convertirEstrellasANumero(item.starRating);
            const estrellasVisuales = "★".repeat(estrellasNumero) + "☆".repeat(5 - estrellasNumero);

            // Controlamos si el cliente tiene foto de perfil cargada en Google
            const fotoPerfil = item.reviewer && item.reviewer.profilePhotoUrl 
                ? item.reviewer.profilePhotoUrl 
                : "https://wikimedia.org";

            // Nombre del cliente
            const nombreCliente = item.reviewer && item.reviewer.displayName 
                ? item.reviewer.displayName 
                : "Usuario de Google";

            // Texto de la reseña (manejamos opción por si solo dejaron estrellas sin texto)
            const comentario = item.comment ? item.comment.trim() : "Calificó este negocio sin dejar un comentario escrito.";

            tarjeta.innerHTML = `
                <div class="cabecera-tarjeta">
                    <img src="${fotoPerfil}" alt="${nombreCliente}" class="avatar-cliente" referrerpolicy="no-referrer">
                    <div class="datos-cliente">
                        <h3>${nombreCliente}</h3>
                        <span class="marca-google">Reseña verificada</span>
                    </div>
                </div>
                <div class="estrellas-resena" data-rating="${estrellasNumero}">${estrellasVisuales}</div>
                <p class="comentario-resena">"${comentario}"</p>
            `;
            
            contenedor.appendChild(tarjeta);
        });

    } catch (error) {
        console.error("Error al cargar opiniones desde Firebase:", error);
        contenedor.innerHTML = "<p class='error-resenas'>No se pudieron cargar las opiniones en este momento.</p>";
    }
}

// Función auxiliar: Traduce el formato string de Google a números enteros
function convertirEstrellasANumero(ratingTexto) {
    const mapeo = { "ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5 };
    return mapeo[ratingTexto] || 5; 
}

// Disparar la carga de datos de forma automática en cuanto la estructura web esté lista
document.addEventListener("DOMContentLoaded", inicializarResenasGoogle);