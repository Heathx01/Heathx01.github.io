const fs = require('fs');
const path = require('path');

// ========================================================================
// 1. COLOCA LOS LINKS DE TUS IMÁGENES AQUÍ
// ========================================================================
// Busca la imagen en internet, haz clic derecho sobre ella, elige 
// "Copiar dirección de la imagen" y pégala entre las comillas simples.
// Puedes usar imágenes .jpg, .png, .avif o .webp.

const misImagenes = {
    // BEBIDAS
    'Capuccino': 'imagenes/capuccino.jpg',
    'Mocaccino': 'imagenes/mocaccino.jpg',
    'Latte Caramel': 'imagenes/latte caramel.webp',
    'Té Verde Matcha': 'imagenes/te-matcha.jpeg',
    'Espresso Doppio': 'imagenes/espresso doppio.jpg',
    'Frappé Oreo': 'imagenes/frappe oreo.jpg',

    // DESAYUNOS
    'Típico': 'imagenes/desayuno tipico.jpg',
    'Pancakes Clásicos': 'imagenes/pancackes.jpg',
    'Tostadas Francesas': 'imagenes/tostadas francesas.avif',
    'Bagel de Salmón': 'imagenes/bagel salmon.jfif',
    'Huevos Benedictinos': 'imagenes/huevos benedictinos.jpg',

    // ALMUERZOS
    'Sandwich de Pavo': 'imagenes/sandwich de pavo.jpg',
    'Ensalada César': 'imagenes/ensalada cesar.jpg',
    'Bowl Saludable': 'imagenes/bowl saludable.webp',
    'Tacos al Pastor': 'imagenes/tacos al pastor.jpg',
    'Wrap de Pollo Crispy': 'imagenes/wrap de pollo.webp',

    // CENAS
    'Pizza Artesanal': 'imagenes/pizza artesanal.jpeg',
    'Burger Gourmet': 'imagenes/burguer gourmet.webp',
    'Risotto de Hongos': 'imagenes/risotto.webp',
    'Pasta Carbonara': 'imagenes/pasta carbonara.jpg',
    'Salmón a la Plancha': 'imagenes/salmon.jpg',

    // POSTRES
    'Brownie': 'imagenes/brownie.jfif',
    'Cheesecake': 'imagenes/cheesecacke.jpg',
    'Tiramisú': 'imagenes/tiramisu.webp',
    'Macarons': 'imagenes/macarons.jpeg',
    'Pie de Manzana': 'imagenes/pie de manzana.avif'
};


// ========================================================================
// 2. LÓGICA AUTOMÁTICA DE REEMPLAZO (No necesitas modificar esto)
// ========================================================================
const indexPath = path.join(__dirname, 'index.html');
const scriptPath = path.join(__dirname, 'script.js');

let indexHTML = fs.readFileSync(indexPath, 'utf8');
let scriptJS = fs.readFileSync(scriptPath, 'utf8');

for (const [name, url] of Object.entries(misImagenes)) {
    if (url === 'URL_AQUI') continue; // Ignorar si no has puesto link

    // --- REEMPLAZOS EN INDEX.HTML ---
    // 1. Imagen del onclick en showProductDetails
    const rx1 = new RegExp(`showProductDetails\\('${name}',\\s*([\\d.]+),\\s*'[^']+'\\)`, 'g');
    indexHTML = indexHTML.replace(rx1, `showProductDetails('${name}', $1, '${url}')`);

    // 2. Etiqueta <img src="...">
    const rx2 = new RegExp(`src="[^"]+"([\\s]*alt="${name}")`, 'g');
    indexHTML = indexHTML.replace(rx2, `src="${url}"$1`);

    // 3. Botón de addToCart
    const rx3 = new RegExp(`addToCart\\('${name}',\\s*([\\d.]+),\\s*'[^']+'\\)`, 'g');
    indexHTML = indexHTML.replace(rx3, `addToCart('${name}', $1, '${url}')`);

    // --- REEMPLAZOS EN SCRIPT.JS ---
    // 4. Objeto productsData en JS
    const blockRegex = new RegExp(`('${name}':\\s*\\{[\\s\\S]*?img:\\s*')[^']+(\')`);
    scriptJS = scriptJS.replace(blockRegex, `$1${url}$2`);
}

fs.writeFileSync(indexPath, indexHTML, 'utf8');
fs.writeFileSync(scriptPath, scriptJS, 'utf8');

console.log("¡Éxito! Todas las imágenes han sido actualizadas en el menú y en el carrito.");
