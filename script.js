/**
 * Theme Management
 */
const q = (s) => document.querySelector(s);
const qa = (s) => document.querySelectorAll(s);

const toggleSwitch = q('.theme-switch input[type="checkbox"]');
const setTheme = (t) => {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
};

if (localStorage.getItem('theme')) {
    const t = localStorage.getItem('theme');
    setTheme(t);
    if (t === 'dark' && toggleSwitch) toggleSwitch.checked = true;
}

toggleSwitch?.addEventListener('change', (e) => setTheme(e.target.checked ? 'dark' : 'light'));

/**
 * Auth & Modal Management
 */
let currentUser = null;
const toggleModal = (id) => {
    const m = document.getElementById(id);
    if (m) m.style.display = window.getComputedStyle(m).display === 'flex' ? 'none' : 'flex';
};
const toggleLoginModal = () => toggleModal('loginModal');
// Función para asegurar que el modal de login exista en el DOM
const ensureLoginModal = () => {
    if (!document.getElementById('loginModal')) {
        const modal = document.createElement('div');
        modal.id = 'loginModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = '<div class="modal-content"></div>';
        document.body.appendChild(modal);
    }
};

if (typeof firebase !== 'undefined') {
    // Procesar el resultado de la redirección de Google al cargar la página
    firebase.auth().getRedirectResult().then((result) => {
        if (result && result.user) {
            console.log("Sesión iniciada correctamente con Google:", result.user.email);
            if (typeof showToast === 'function') {
                showToast("Sesión iniciada con Google");
            }
        }
    }).catch((error) => {
        console.error("Error en Google Redirect Auth:", error);
        if (error.code === 'auth/unauthorized-domain') {
            alert("Error: Este dominio ('" + window.location.hostname + "') no está autorizado en la consola de Firebase. Por favor, añádelo en Authentication -> Settings -> Authorized domains.");
        } else {
            alert("Error al iniciar sesión con Google: " + error.message);
        }
    });

    firebase.auth().onAuthStateChanged((user) => {
        currentUser = user;
        ensureLoginModal();
        const btn = document.getElementById('btn-user-login');
        const content = q('#loginModal .modal-content');

        if (btn) {
            btn.style.color = user ? "var(--secondary-color)" : "";
            const btnSpan = btn.querySelector('span');
            if (btnSpan) btnSpan.innerText = user ? "Mi Perfil" : "Ingresar";
        }

        if (content) {
            content.innerHTML = user ? `
                <button class="modal-close" onclick="toggleLoginModal()">&times;</button>
                <div class="modal-header"><i class="fas fa-user-check"></i><h2>Mi Perfil</h2><p>Sesión iniciada:</p><strong>${user.email}</strong></div>
                <div class="profile-actions">
                    <button class="submit-btn profile-logout-btn" onclick="handleLogout()">Cerrar Sesión</button>
                    <button class="btn-google profile-back-btn" onclick="toggleLoginModal()">Volver</button>
                </div>` : `
                <button class="modal-close" onclick="toggleLoginModal()">&times;</button>
                <div class="modal-header"><i class="fas fa-coffee"></i><h2>Bienvenido</h2><p>Inicia sesión para continuar</p></div>
                <form onsubmit="handleLogin(event)">
                    <div class="input-group"><label>Correo</label><input type="email" placeholder="email@ejemplo.com" required></div>
                    <div class="input-group"><label>Contraseña</label><input type="password" placeholder="••••••••" required></div>
                    <button type="submit" class="submit-btn">Entrar</button>
                    <div class="auth-divider"><hr><span>O</span></div>
                    <button type="button" class="btn-google" onclick="handleGoogleLogin()"><i class="fab fa-google"></i> Google</button>
                </form>`;
        }
    });
}

const handleLogin = async (e) => {
    e.preventDefault();
    const [em, pw] = e.target.querySelectorAll('input');
    const btn = e.target.querySelector('.submit-btn');
    const originalText = btn.innerText;
    btn.innerText = "Verificando..."; btn.disabled = true;
    try {
        await firebase.auth().signInWithEmailAndPassword(em.value, pw.value);
        toggleLoginModal();
    } catch (err) {
        console.error("Error al iniciar sesión:", err);
        // Firebase v9+ y configuraciones seguras devuelven auth/invalid-login-credentials o auth/invalid-credential
        // en lugar de auth/user-not-found para evitar enumeración de usuarios.
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-login-credentials' || err.code === 'auth/invalid-credential') {
            if (confirm("No se encontró el usuario o la contraseña es incorrecta. ¿Deseas registrar una nueva cuenta con este correo y contraseña?")) {
                try {
                    btn.innerText = "Registrando...";
                    await firebase.auth().createUserWithEmailAndPassword(em.value, pw.value);
                    alert("¡Cuenta registrada e inicio de sesión exitoso!");
                    toggleLoginModal();
                } catch (regErr) {
                    console.error("Error al registrar cuenta:", regErr);
                    if (regErr.code === 'auth/email-already-in-use') {
                        alert("El correo ya está registrado con otra contraseña. Por favor, verifica tus datos de ingreso.");
                    } else {
                        alert("Error al registrar: " + regErr.message);
                    }
                }
            }
        } else {
            alert(err.message);
        }
    } finally { btn.innerText = originalText; btn.disabled = false; }
};

const handleGoogleLogin = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithRedirect(provider);
};
const handleLogout = () => firebase.auth().signOut().then(() => alert("Sesión cerrada"));

/**
 * Menu & Cart Logic
 */
const updateTabIndicator = () => {
    const activeTab = q('.tab-btn.active');
    const indicator = q('.tab-slider-indicator');
    if (activeTab && indicator) {
        indicator.style.width = `${activeTab.offsetWidth}px`;
        indicator.style.left = `${activeTab.offsetLeft}px`;
    }
};

const showCategory = (cat) => {
    const active = q('.menu-section.active');
    if (active) {
        active.style.opacity = "0";
        setTimeout(() => {
            qa('.menu-section').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
            const s = document.getElementById(cat);
            s.style.display = 'grid'; s.classList.add('active');
            setTimeout(() => s.style.opacity = "1", 50);
        }, 300);
    } else {
        const s = document.getElementById(cat);
        if (s) { s.style.display = 'grid'; s.classList.add('active'); }
    }
    
    qa('.tab-btn').forEach(b => b.classList.toggle('active', b.getAttribute('onclick').includes(cat)));
    
    // Smooth indicator transition
    setTimeout(updateTabIndicator, 50);
};

let cart = JSON.parse(localStorage.getItem('cafe_cart') || '[]');
const save = () => localStorage.setItem('cafe_cart', JSON.stringify(cart));

const updateUI = () => {
    const c = q('#cartItems'), count = q('#cartCount'), total = q('#cartTotal'), btnCheckout = q('#btn-checkout-start');
    const btnCancel = q('#btn-cancel-cart');
    if (count) count.innerText = cart.length;
    if (!c) return;

    if (!cart.length) {
        c.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-basket"></i>
                <p>Tu cesta está vacía</p>
            </div>`;
        if (total) total.innerText = "$0.00";
        if (btnCheckout) {
            btnCheckout.innerText = "Empezar a pedir";
            btnCheckout.onclick = () => toggleCart(); // Simplemente cierra el carrito para que elija algo
        }
        if (btnCancel) btnCancel.style.display = 'none';
        return;
    }

    c.innerHTML = cart.map((i, idx) => `
        <div class="cart-item-row">
            <img src="${i.img}">
            <div class="cart-item-info">
                <h4>${i.name}</h4>
                <span>$${i.price.toFixed(2)}</span>
            </div>
            <button onclick="rm(${idx})" class="cart-item-remove-btn">
                <i class="fas fa-times"></i>
            </button>
        </div>`).join('');

    if (total) total.innerText = `$${cart.reduce((a, b) => a + b.price, 0).toFixed(2)}`;
    if (btnCheckout) {
        btnCheckout.innerText = "Hacer Pedido";
        btnCheckout.onclick = () => showCheckout();
    }
    if (btnCancel) btnCancel.style.display = 'block';
};

window.rm = (idx) => { 
    const removedItem = cart[idx];
    cart.splice(idx, 1); 
    save(); 
    updateUI(); 
    if (removedItem) {
        incrementInventoryStock(removedItem.name);
    }
};

const showCheckout = () => {
    if (cart.length === 0) {
        toggleCart();
        return;
    }
    // Redirigir a la nueva página de pago
    window.location.href = 'pago.html';
};

const toggleCart = () => {
    const sidebar = q('#cartSidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
        const waFloat = q('.whatsapp-float');
        if (waFloat) {
            if (sidebar.classList.contains('active')) {
                waFloat.style.display = 'none';
            } else {
                waFloat.style.display = '';
            }
        }
    }
};

const cancelOrder = (redirect = false) => {
    if (cart.length === 0) {
        if (redirect) window.location.href = 'index.html';
        return;
    }
    if (confirm("¿Estás seguro de que deseas cancelar tu pedido? Se vaciará el carrito.")) {
        // Return stock for all items
        cart.forEach(item => {
            incrementInventoryStock(item.name);
        });
        cart = [];
        save();
        if (typeof updateUI === 'function') updateUI();
        if (redirect) {
            window.location.href = 'index.html';
        } else {
            toggleCart();
            showToast("Pedido cancelado");
        }
    }
};
window.cancelOrder = cancelOrder;
window.toggleCart = toggleCart;

/**
 * Product Details & Toasts
 */
const productsData = {
    // Bebidas (6 items)
    'Capuccino': {
        desc: 'Espresso con leche vaporizada y espuma cremosa, decorado con un toque de canela.',
        ingredients: ['Espresso Arábica', 'Leche entera/deslactosada', 'Canela'],
        allergens: ['Lácteos'],
        suggested: 'Brownie',
        price: 5.00,
        img: 'imagenes/capuccino.jpg',
        category: 'Bebidas',
        stock: 15
    },
    'Mocaccino': {
        desc: 'Deliciosa mezcla de espresso, chocolate premium y leche vaporizada.',
        ingredients: ['Espresso Arábica', 'Cacao 70%', 'Leche vaporizada'],
        allergens: ['Lácteos', 'Trazas de frutos secos'],
        suggested: 'Tiramisú',
        price: 6.50,
        img: 'imagenes/mocaccino.jpg',
        category: 'Bebidas',
        stock: 10
    },
    'Latte Caramel': {
        desc: 'Café latte suave con jarabe de caramelo artesanal y un toque de crema batida.',
        ingredients: ['Espresso', 'Leche vaporizada', 'Jarabe de caramelo'],
        allergens: ['Lácteos'],
        suggested: 'Cheesecake',
        price: 5.75,
        img: 'imagenes/latte caramel.webp',
        category: 'Bebidas',
        stock: 8
    },
    'Té Verde Matcha': {
        desc: 'Bebida milenaria de té verde japonés premium con leche cremosa.',
        ingredients: ['Matcha ceremonial', 'Leche de almendras', 'Miel orgánica'],
        allergens: ['Frutos secos (almendra)'],
        suggested: 'Macarons',
        price: 4.50,
        img: 'imagenes/te-matcha.jpeg',
        category: 'Bebidas',
        stock: 20
    },
    'Espresso Doppio': {
        desc: 'Dos cargas de espresso puro con una crema dorada e intensa.',
        ingredients: ['Café Arábica de altura'],
        allergens: [],
        suggested: 'Brownie',
        price: 3.00,
        img: 'imagenes/espresso doppio.jpg',
        category: 'Bebidas',
        stock: 25
    },
    'Frappé Oreo': {
        desc: 'Bebida helada ultra cremosa mezclada con galletas Oreo reales y topping de chocolate.',
        ingredients: ['Base cremosa', 'Galletas Oreo', 'Crema batida', 'Cacao'],
        allergens: ['Lácteos', 'Gluten', 'Soya'],
        suggested: 'Brownie',
        price: 7.00,
        img: 'imagenes/frappe oreo.jpg',
        category: 'Bebidas',
        stock: 12
    },

    // Desayunos (5 items)
    'Típico': {
        desc: 'Desayuno tradicional con frijoles, plátano, queso, crema y huevo al gusto.',
        ingredients: ['Frijoles rojos', 'Plátano frito', 'Queso fresco', 'Crema'],
        allergens: ['Lácteos', 'Huevo'],
        suggested: 'Capuccino',
        price: 8.00,
        img: 'imagenes/desayuno tipico.jpg',
        category: 'Desayunos',
        stock: 15
    },
    'Pancakes Clásicos': {
        desc: 'Torre de tres pancakes esponjosos servidos con mantequilla y miel de maple pura.',
        ingredients: ['Mezcla artesanal', 'Mantequilla', 'Miel de maple'],
        allergens: ['Gluten', 'Huevo', 'Lácteos'],
        suggested: 'Latte Caramel',
        price: 7.50,
        img: 'imagenes/pancackes.jpg',
        category: 'Desayunos',
        stock: 10
    },
    'Tostadas Francesas': {
        desc: 'Pan brioche empapado en crema de vainilla y canela, sellado a la perfección.',
        ingredients: ['Pan Brioche', 'Canela', 'Frutos del bosque'],
        allergens: ['Gluten', 'Lácteos', 'Huevo'],
        suggested: 'Espresso Doppio',
        price: 8.50,
        img: 'imagenes/tostadas francesas.avif',
        category: 'Desayunos',
        stock: 7
    },
    'Bagel de Salmón': {
        desc: 'Bagel tostado con queso crema, láminas de salmón ahumado y alcaparras.',
        ingredients: ['Bagel artesanal', 'Salmón ahumado', 'Queso crema'],
        allergens: ['Gluten', 'Lácteos', 'Pescado'],
        suggested: 'Té Verde Matcha',
        price: 10.50,
        img: 'imagenes/bagel salmon.jfif',
        category: 'Desayunos',
        stock: 6
    },
    'Huevos Benedictinos': {
        desc: 'Clásicos huevos pochados sobre lomo canadiense y pan muffin tostado, bañados con una rica salsa holandesa y cebollín fresco.',
        ingredients: ['Huevos', 'Muffin de trigo', 'Lomo canadiense', 'Salsa holandesa'],
        allergens: ['Gluten', 'Huevo', 'Lácteos'],
        suggested: 'Latte Caramel',
        price: 9.75,
        img: 'imagenes/huevos benedictinos.jpg',
        category: 'Desayunos',
        stock: 9
    },

    // Almuerzos (5 items)
    'Sandwich de Pavo': {
        desc: 'Pan artesanal tostado con finas lascas de pavo ahumado, queso suizo, lechuga y tomate.',
        ingredients: ['Pan de masa madre', 'Pavo ahumado', 'Queso suizo', 'Vegetales'],
        allergens: ['Gluten', 'Lácteos'],
        suggested: 'Té Helado',
        price: 9.50,
        img: 'imagenes/sandwich de pavo.jpg',
        category: 'Almuerzos',
        stock: 14
    },
    'Ensalada César': {
        desc: 'Lechuga romana fresca, croutones crujientes, queso parmesano y nuestro aderezo césar especial.',
        ingredients: ['Lechuga romana', 'Parmesano', 'Croutones', 'Aderezo César'],
        allergens: ['Lácteos', 'Gluten', 'Huevo', 'Pescado (en aderezo)'],
        suggested: 'Sandwich de Pavo',
        price: 10.00,
        img: 'imagenes/ensalada cesar.jpg',
        category: 'Almuerzos',
        stock: 18
    },
    'Bowl Saludable': {
        desc: 'Una explosión de nutrientes con quinoa, vegetales frescos y aderezo cítrico.',
        ingredients: ['Quinoa', 'Aguacate', 'Garbanzos', 'Kale'],
        allergens: [],
        suggested: 'Té Verde Matcha',
        price: 11.00,
        img: 'imagenes/bowl saludable.webp',
        category: 'Almuerzos',
        stock: 15
    },
    'Tacos al Pastor': {
        desc: 'Tres tacos de cerdo marinado con piña, servidos en tortilla de maíz recién hecha.',
        ingredients: ['Cerdo marinado', 'Piña', 'Tortilla de maíz'],
        allergens: [],
        suggested: 'Frappé Oreo',
        price: 9.00,
        img: 'imagenes/tacos al pastor.jpg',
        category: 'Almuerzos',
        stock: 22
    },
    'Wrap de Pollo Crispy': {
        desc: 'Wrap de pollo crujiente con lechuga fresca, tomates picados, queso cheddar fundido y nuestro aderezo chipotle ligeramente picante.',
        ingredients: ['Tortilla de trigo', 'Pechuga de pollo empanizada', 'Lechuga', 'Cheddar', 'Chipotle'],
        allergens: ['Gluten', 'Lácteos'],
        suggested: 'Frappé Oreo',
        price: 9.75,
        img: 'imagenes/wrap de pollo.webp',
        category: 'Almuerzos',
        stock: 12
    },

    // Cenas (5 items)
    'Pizza Artesanal': {
        desc: 'Pizza individual horneada con masa delgada, salsa de tomate natural, mozzarella y albahaca.',
        ingredients: ['Masa madre', 'Pomodoro', 'Mozzarella fresca', 'Albahaca'],
        allergens: ['Gluten', 'Lácteos'],
        suggested: 'Mocaccino',
        price: 12.00,
        img: 'imagenes/pizza artesanal.jpeg',
        category: 'Cenas',
        stock: 10
    },
    'Burger Gourmet': {
        desc: 'Hamburguesa de carne angus con queso fundido y tocino en pan brioche artesanal.',
        ingredients: ['Carne Angus', 'Pan Brioche', 'Queso Cheddar'],
        allergens: ['Gluten', 'Lácteos'],
        suggested: 'Mocaccino',
        price: 13.50,
        img: 'imagenes/burguer gourmet.webp',
        category: 'Cenas',
        stock: 11
    },
    'Risotto de Hongos': {
        desc: 'Arroz arborio cocinado lentamente con una selección de hongos silvestres y parmesano.',
        ingredients: ['Arroz Arborio', 'Hongos', 'Parmesano', 'Vino blanco'],
        allergens: ['Lácteos'],
        suggested: 'Pizza Artesanal',
        price: 14.00,
        img: 'imagenes/risotto.webp',
        category: 'Cenas',
        stock: 8
    },
    'Pasta Carbonara': {
        desc: 'Receta clásica italiana elaborada con fettuccine al dente, tocino crujiente, yema de huevo fresco, pimienta negra molida y queso pecorino romano.',
        ingredients: ['Fettuccine', 'Tocino de cerdo', 'Yema de huevo', 'Queso Parmesano/Pecorino'],
        allergens: ['Gluten', 'Huevo', 'Lácteos'],
        suggested: 'Cheesecake',
        price: 12.50,
        img: 'imagenes/pasta carbonara.jpg',
        category: 'Cenas',
        stock: 7
    },
    'Salmón a la Plancha': {
        desc: 'Filete de salmón de 200g sellado a la plancha, servido con espárragos, zanahorias baby, tomates cherry al horno y un toque de mantequilla de ajo.',
        ingredients: ['Salmón atlántico', 'Espárragos', 'Zanahorias baby', 'Mantequilla de ajo'],
        allergens: ['Pescado', 'Lácteos'],
        suggested: 'Té Verde Matcha',
        price: 16.00,
        img: 'imagenes/salmon.jpg',
        category: 'Cenas',
        stock: 6
    },

    // Postres (5 items)
    'Brownie': {
        desc: 'Bizcocho de chocolate intenso con nueces, melcochudo por dentro.',
        ingredients: ['Chocolate amargo', 'Nueces', 'Mantequilla', 'Harina'],
        allergens: ['Lácteos', 'Gluten', 'Frutos secos'],
        suggested: 'Mocaccino',
        price: 4.50,
        img: 'imagenes/brownie.jfif',
        category: 'Postres',
        stock: 15
    },
    'Cheesecake': {
        desc: 'Tarta de queso estilo New York sobre base de galleta, bañada en coulis de frutos rojos.',
        ingredients: ['Queso crema', 'Galleta', 'Frutos rojos'],
        allergens: ['Lácteos', 'Gluten', 'Huevo'],
        suggested: 'Latte Caramel',
        price: 6.00,
        img: 'imagenes/cheesecacke.jpg',
        category: 'Postres',
        stock: 9
    },
    'Tiramisú': {
        desc: 'Clásico postre italiano con capas de bizcocho soletilla empapadas en espresso y crema de mascarpone.',
        ingredients: ['Mascarpone', 'Café Espresso', 'Bizcocho', 'Cacao'],
        allergens: ['Lácteos', 'Gluten', 'Huevo'],
        suggested: 'Capuccino',
        price: 6.50,
        img: 'imagenes/tiramisu.webp',
        category: 'Postres',
        stock: 11
    },
    'Macarons': {
        desc: 'Selección de seis macarons franceses de colores y sabores exquisitos.',
        ingredients: ['Harina de almendra', 'Clara de huevo', 'Ganache'],
        allergens: ['Frutos secos (almendra)', 'Huevo', 'Lácteos'],
        suggested: 'Té Verde Matcha',
        price: 8.00,
        img: 'imagenes/macarons.jpeg',
        category: 'Postres',
        stock: 10
    },
    'Pie de Manzana': {
        desc: 'Tradicional pastel de manzana con costra crujiente y relleno especiado.',
        ingredients: ['Manzana verde', 'Canela', 'Mantequilla', 'Harina'],
        allergens: ['Gluten', 'Lácteos'],
        suggested: 'Espresso Doppio',
        price: 5.50,
        img: 'imagenes/pie de manzana.avif',
        category: 'Postres',
        stock: 8
    }
};

// Helper inventory variables and functions
let inventory = JSON.parse(localStorage.getItem('cafe_inventory') || 'null');

const initInventory = () => {
    if (!inventory) {
        inventory = {};
        for (const name in productsData) {
            inventory[name] = productsData[name].stock;
        }
        localStorage.setItem('cafe_inventory', JSON.stringify(inventory));
    }
};

const getInventoryStock = (name) => {
    initInventory();
    return name in inventory ? inventory[name] : 10;
};

const decrementInventoryStock = (name) => {
    initInventory();
    if (name in inventory) {
        if (inventory[name] > 0) {
            inventory[name]--;
            localStorage.setItem('cafe_inventory', JSON.stringify(inventory));
            updateStockUI(name);
            return true;
        }
        return false;
    }
    return true;
};

const incrementInventoryStock = (name) => {
    initInventory();
    if (name in inventory) {
        inventory[name]++;
        localStorage.setItem('cafe_inventory', JSON.stringify(inventory));
        updateStockUI(name);
    }
};

const updateStockUI = (name) => {
    const qty = getInventoryStock(name);
    // Find all elements displaying stock for this product and update them
    document.querySelectorAll(`[data-stock-for="${name}"]`).forEach(tag => {
        if (qty <= 0) {
            tag.className = 'product-stock-tag out-of-stock';
            tag.innerHTML = `<i class="fas fa-times-circle"></i> Agotado`;
        } else {
            tag.className = 'product-stock-tag in-stock';
            tag.innerHTML = `<i class="fas fa-check-circle"></i> Disponible`;
        }
    });

    // Update Add to Cart buttons
    document.querySelectorAll(`[data-product="${name}"] .add-to-cart-btn`).forEach(btn => {
        if (qty === 0) {
            btn.disabled = true;
            btn.innerText = 'Agotado';
            btn.style.background = '#ccc';
            btn.style.color = '#666';
            btn.style.borderColor = '#ccc';
            btn.style.cursor = 'not-allowed';
        } else {
            btn.disabled = false;
            btn.innerText = 'Agregar';
            btn.style.background = '';
            btn.style.color = '';
            btn.style.borderColor = '';
            btn.style.cursor = 'pointer';
        }
    });

    // Also update modal button if open
    const modalBtn = document.querySelector(`#productModal .submit-btn`);
    if (modalBtn && document.querySelector(`#productModal h2`)?.innerText === name) {
        if (qty === 0) {
            modalBtn.disabled = true;
            modalBtn.innerText = 'Agotado';
            modalBtn.style.background = '#ccc';
            modalBtn.style.cursor = 'not-allowed';
        } else {
            modalBtn.disabled = false;
            modalBtn.innerText = 'Agregar al Carrito';
            modalBtn.style.background = '';
            modalBtn.style.cursor = 'pointer';
        }
    }
};

const updateAllStockUI = () => {
    for (const name in productsData) {
        updateStockUI(name);
    }
};

const showProductDetails = (name, price, img) => {
    const data = productsData[name] || { desc: 'Un clásico de nuestra casa.', ingredients: [], allergens: [], suggested: '', category: 'Varios' };
    const modal = q('#productModal');
    const content = q('#productModalContent');
    
    if (modal && content) {
        const qty = getInventoryStock(name);
        const isOutOfStock = qty <= 0;
        
        content.innerHTML = `
            <button class="modal-close" onclick="toggleModal('productModal')">&times;</button>
            <div class="product-detail-grid">
                <div class="product-detail-img">
                    <img src="${img}" alt="${name}">
                </div>
                <div class="product-detail-info">
                    <h2>${name}</h2>
                    <span class="product-price">$${price.toFixed(2)}</span>
                    <p class="product-desc-text">${data.desc}</p>
                    
                    <div class="product-detail-meta">
                        <span class="product-category-tag"><i class="fas fa-tag"></i> <strong>Categoría:</strong> ${data.category}</span>
                        <span class="product-stock-tag" data-stock-for="${name}">
                            ${isOutOfStock ? `<i class="fas fa-times-circle"></i> Agotado` : `<i class="fas fa-check-circle"></i> Disponible`}
                        </span>
                    </div>
                    
                    <div class="product-detail-section">
                        <h4>Ingredientes Clave:</h4>
                        <p>${data.ingredients.join(', ')}</p>
                    </div>
                    
                    <div class="product-detail-section">
                        <h4>Alérgenos:</h4>
                        <div class="allergen-list">
                            ${data.allergens.length ? data.allergens.map(a => `<span class="allergen-badge">${a}</span>`).join('') : '<span class="allergen-badge">Ninguno</span>'}
                        </div>
                    </div>
                    
                    ${data.suggested ? `
                    <div class="suggested-box">
                        <p>✨ <strong>Recomendación:</strong> Pruébalo con nuestro ${data.suggested}</p>
                    </div>` : ''}
                    
                    <button class="submit-btn" ${isOutOfStock ? 'disabled style="background: #ccc; cursor: not-allowed;"' : ''} onclick="addToCart('${name}', ${price}, '${img}'); toggleModal('productModal');">
                        ${isOutOfStock ? 'Agotado' : 'Agregar al Carrito'}
                    </button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    }
};

const showToast = (msg) => {
    let container = q('#toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast reveal-init';
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-check-circle"></i>
            <span>${msg}</span>
        </div>
        <button onclick="toggleCart(); this.parentElement.parentElement.remove();">VER</button>
    `;
    
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('reveal'), 10);
    
    setTimeout(() => {
        toast.classList.remove('reveal');
        setTimeout(() => toast.remove(), 600);
    }, 4000);
};

const addToCart = (n, p, i) => {
    const qty = getInventoryStock(n);
    if (qty <= 0) {
        alert(`Lo sentimos, el producto ${n} se encuentra agotado.`);
        return;
    }
    decrementInventoryStock(n);
    cart.push({ name: n, price: p, img: i });
    save(); updateUI();
    showToast(`¡${n} añadido!`);
    const btn = q('.cart-floating-btn');
    if (btn) { btn.style.animation = 'none'; void btn.offsetWidth; btn.style.animation = 'pulse 0.5s'; }
};

/**
 * Real-time Reviews System (Firestore)
 */
const loadReviews = () => {
    const list = document.getElementById('reviews-list');
    if (!list || typeof firebase === 'undefined') return;

    // Escuchar cambios en la colección "resenas" ordenados por fecha
    firebase.firestore().collection('resenas').orderBy('date', 'desc').onSnapshot((snapshot) => {
        list.innerHTML = ''; // Limpiar lista actual
        snapshot.forEach((doc) => {
            const r = doc.data();
            const date = r.date ? new Date(r.date.seconds * 1000).toLocaleDateString() : 'Reciente';

            let starsHtml = '';
            for (let i = 1; i <= 5; i++) {
                starsHtml += i <= r.rating ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
            }

            const item = document.createElement('div');
            item.className = 'review-item product-list-item reveal';
            item.innerHTML = `
                <div class="review-avatar" style="background: ${r.rating >= 4 ? 'var(--secondary-color)' : 'var(--primary-color)'}">
                    ${r.name.charAt(0).toUpperCase()}
                </div>
                <div class="review-body">
                    <div class="review-header">
                        <span class="review-name">${r.name}</span>
                        <div class="review-rating">${starsHtml}</div>
                    </div>
                    <span class="review-date">${date}</span>
                    <p class="product-desc">"${r.text}"</p>
                </div>`;
            list.appendChild(item);
        });
    });
};

const submitReview = async (e) => {
    e.preventDefault();
    if (typeof currentRating === 'undefined' || currentRating == 0) {
        alert("Por favor selecciona una calificación");
        return;
    }

    const name = document.getElementById('rev-name').value;
    const text = document.getElementById('rev-text').value;
    const btn = e.target.querySelector('input[type="submit"]');

    try {
        btn.disabled = true;
        btn.value = "Publicando...";

        await firebase.firestore().collection('resenas').add({
            name,
            text,
            rating: parseInt(currentRating),
            date: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("¡Gracias por tu reseña!");
        if (typeof closeReviewModal === 'function') closeReviewModal();
        e.target.reset();
        if (typeof currentRating !== 'undefined') {
            currentRating = 0;
            if (typeof updateStars === 'function') updateStars();
        }
    } catch (err) {
        console.error(err);
        alert("Error al publicar la reseña. Inténtalo de nuevo.");
    } finally {
        btn.disabled = false;
        btn.value = "Publicar Reseña";
    }
};

const openReviewModal = () => {
    const m = document.getElementById('reviewModal');
    if (m) {
        m.style.display = 'flex';
        m.querySelector('.modal-content')?.classList.add('scale-in');
    }
};

const closeReviewModal = () => {
    const m = document.getElementById('reviewModal');
    if (m) m.style.display = 'none';
};

/**
 * Animations
 */
const setupObs = () => {
    const obs = new IntersectionObserver((es) => es.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('reveal'); obs.unobserve(e.target); }
    }), { threshold: 0.1 });
    qa('.product-list-item, .subpage-header, .hero-section').forEach(el => { el.classList.add('reveal-init'); obs.observe(el); });
};

const toggleMobileMenu = () => {
    q('.menu')?.classList.toggle('active');
    q('.menu-overlay')?.classList.toggle('active');
};

document.addEventListener('DOMContentLoaded', () => {
    ensureLoginModal();
    updateUI(); setupObs(); loadReviews(); updateAllStockUI();
    
    // Initialize hero slider if active on page
    initHeroSlider();

    // Initialize menu tabs indicator
    setTimeout(updateTabIndicator, 200);
    window.addEventListener('resize', updateTabIndicator);

    const style = document.createElement('style');
    style.textContent = `.reveal-init{opacity:0;transform:translateY(20px);transition:all .6s;}.reveal-init.reveal{opacity:1;transform:translateY(0);}`;
    document.head.appendChild(style);
});

/**
 * Interactive Hero Slider (Dashboard)
 */
function initHeroSlider() {
    const slidesInfo = qa('.slide-info');
    const phoneSlides = qa('.phone-slide, .visual-slide');
    const floatingCards = qa('.floating-card');
    const dots = qa('.pag-dot');
    
    if (slidesInfo.length === 0) return;

    let currentSlide = 0;
    let slideInterval;
    const intervalTime = 5000;

    const showSlide = (index) => {
        slidesInfo.forEach(el => el.classList.remove('active'));
        phoneSlides.forEach(el => el.classList.remove('active'));
        floatingCards.forEach(el => el.classList.remove('active'));
        dots.forEach(el => el.classList.remove('active'));

        if (slidesInfo[index]) slidesInfo[index].classList.add('active');
        if (phoneSlides[index]) phoneSlides[index].classList.add('active');
        if (floatingCards[index]) floatingCards[index].classList.add('active');
        if (dots[index]) dots[index].classList.add('active');

        // Restart cup liquid animation on slide 2
        if (index === 2) {
            const liquid = q('.cup-liquid');
            if (liquid) {
                liquid.style.animation = 'none';
                liquid.offsetHeight; // trigger reflow
                liquid.style.animation = null;
            }
        }

        // Animate progress/meter bars on active slide if present
        const activeSlide = slidesInfo[index];
        if (activeSlide) {
            const fills = activeSlide.querySelectorAll('.meter-fill');
            fills.forEach(fill => {
                const pct = fill.getAttribute('data-pct') || '0%';
                fill.style.width = pct;
            });
        }

        // Scroll active card into view on mobile
        if (window.innerWidth <= 992) {
            const activeCard = floatingCards[index];
            const track = q('.floating-cards-track');
            if (activeCard && track) {
                track.scrollTo({
                    left: activeCard.offsetLeft - (track.clientWidth / 2) + (activeCard.clientWidth / 2),
                    behavior: 'smooth'
                });
            }
        }

        currentSlide = index;
    };

    const nextSlide = () => {
        let next = (currentSlide + 1) % slidesInfo.length;
        showSlide(next);
    };

    const startSlideShow = () => {
        clearInterval(slideInterval);
        slideInterval = setInterval(nextSlide, intervalTime);
    };

    const resetSlideShow = () => {
        startSlideShow();
    };

    dots.forEach((dot, idx) => {
        dot.addEventListener('click', () => {
            showSlide(idx);
            resetSlideShow();
        });
    });

    floatingCards.forEach((card, idx) => {
        card.addEventListener('click', () => {
            showSlide(idx);
            resetSlideShow();
        });
    });

    // Run first slide animation triggers
    showSlide(0);
    startSlideShow();
}
