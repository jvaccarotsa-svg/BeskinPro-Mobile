/**
 * test_mobile.js
 * Un script para exponer el servidor local de desarrollo a Internet provisionalmente
 * usando localtunnel, para poder probar en el móvil con HTTPS (necesario para la cámara y el micrófono).
 */

const { execSync } = require('child_process');

console.log("===============================================================");
console.log("📱 PREPARANDO ENTORNO DE PRUEBAS PARA MÓVIL (CON HTTPS)");
console.log("===============================================================");
console.log("Paso 1: Recuerda tener tu servidor Next.js corriendo en otra terminal con:");
console.log("        npm run dev");
console.log("");
console.log("Paso 2: Exponiendo el puerto 3000 usando localtunnel...");
console.log("        (Esto generará una URL segura 'https://...' que podrás abrir en tu móvil)");
console.log("===============================================================");

try {
    // Instalamos localtunnel globalmente si no está o lo ejecutamos con npx
    execSync('npx localtunnel --port 3000', { stdio: 'inherit' });
} catch (e) {
    console.error("Error al ejecutar localtunnel:", e.message);
}
