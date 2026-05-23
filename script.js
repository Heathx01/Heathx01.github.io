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
    btn.innerText = "Verificando..."; btn.disabled = true;
    try {
        await firebase.auth().signInWithEmailAndPassword(em.value, pw.value);
        toggleLoginModal();
    } catch (err) {
        if (err.code === 'auth/user-not-found' && confirm("¿Registrar nueva cuenta?")) {
            await firebase.auth().createUserWithEmailAndPassword(em.value, pw.value);
            toggleLoginModal();
        } else alert(err.message);
    } finally { btn.innerText = "Entrar"; btn.disabled = false; }
};

const handleGoogleLogin = () => firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider()).then(toggleLoginModal);
const handleLogout = () => firebase.auth().signOut().then(() => alert("Sesión cerrada"));

/**
 * Menu & Cart Logic
 */
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
};

let cart = JSON.parse(localStorage.getItem('cafe_cart') || '[]');
const save = () => localStorage.setItem('cafe_cart', JSON.stringify(cart));

const updateUI = () => {
    const c = q('#cartItems'), count = q('#cartCount'), total = q('#cartTotal'), btnCheckout = q('#btn-checkout-start');
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
};

window.rm = (idx) => { 
    cart.splice(idx, 1); 
    save(); 
    updateUI(); 
};

const showCheckout = () => {
    if (cart.length === 0) {
        toggleCart();
        return;
    }
    // Redirigir a la nueva página de pago
    window.location.href = 'pago.html';
};

const toggleCart = () => q('#cartSidebar')?.classList.toggle('active');

/**
 * Product Details & Toasts
 */
const productsData = {
    'Capuccino': {
        desc: 'Espresso con leche vaporizada y espuma cremosa, decorado con un toque de canela.',
        ingredients: ['Espresso Arábica', 'Leche entera/deslactosada', 'Canela'],
        allergens: ['Lácteos'],
        suggested: 'Brownie'
    },
    'Mocaccino': {
        desc: 'Deliciosa mezcla de espresso, chocolate premium y leche vaporizada.',
        ingredients: ['Espresso Arábica', 'Cacao 70%', 'Leche vaporizada'],
        allergens: ['Lácteos', 'Trazas de frutos secos'],
        suggested: 'Tiramisú'
    },
    'Latte Caramel': {
        desc: 'Café latte suave con jarabe de caramelo artesanal y un toque de crema batida.',
        ingredients: ['Espresso', 'Leche vaporizada', 'Jarabe de caramelo'],
        allergens: ['Lácteos'],
        suggested: 'Cheesecake'
    },
    'Té Verde Matcha': {
        desc: 'Bebida milenaria de té verde japonés premium con leche cremosa.',
        ingredients: ['Matcha ceremonial', 'Leche de almendras', 'Miel orgánica'],
        allergens: ['Frutos secos (almendra)'],
        suggested: 'Macarons'
    },
    'Espresso Doppio': {
        desc: 'Dos cargas de espresso puro con una crema dorada e intensa.',
        ingredients: ['Café Arábica de altura'],
        allergens: [],
        suggested: 'Brownie'
    },
    'Frappé Oreo': {
        desc: 'Bebida helada ultra cremosa mezclada con galletas Oreo reales y topping de chocolate.',
        ingredients: ['Base cremosa', 'Galletas Oreo', 'Crema batida', 'Cacao'],
        allergens: ['Lácteos', 'Gluten', 'Soya'],
        suggested: 'Brownie'
    },
    'Típico': {
        desc: 'Desayuno tradicional con frijoles, plátano, queso, crema y huevo al gusto.',
        ingredients: ['Frijoles rojos', 'Plátano frito', 'Queso fresco', 'Crema'],
        allergens: ['Lácteos', 'Huevo'],
        suggested: 'Capuccino'
    },
    'Pancakes Clásicos': {
        desc: 'Torre de tres pancakes esponjosos servidos con mantequilla y miel de maple pura.',
        ingredients: ['Mezcla artesanal', 'Mantequilla', 'Miel de maple'],
        allergens: ['Gluten', 'Huevo', 'Lácteos'],
        suggested: 'Latte Caramel'
    },
    'Tostadas Francesas': {
        desc: 'Pan brioche empapado en crema de vainilla y canela, sellado a la perfección.',
        ingredients: ['Pan Brioche', 'Canela', 'Frutos del bosque'],
        allergens: ['Gluten', 'Lácteos', 'Huevo'],
        suggested: 'Espresso Doppio'
    },
    'Bagel de Salmón': {
        desc: 'Bagel tostado con queso crema, láminas de salmón ahumado y alcaparras.',
        ingredients: ['Bagel artesanal', 'Salmón ahumado', 'Queso crema'],
        allergens: ['Gluten', 'Lácteos', 'Pescado'],
        suggested: 'Té Verde Matcha'
    },
    'Sandwich de Pavo': {
        desc: 'Pan artesanal tostado con finas lascas de pavo ahumado, queso suizo, lechuga y tomate.',
        ingredients: ['Pan de masa madre', 'Pavo ahumado', 'Queso suizo', 'Vegetales'],
        allergens: ['Gluten', 'Lácteos'],
        suggested: 'Té Helado'
    },
    'Ensalada César': {
        desc: 'Lechuga romana fresca, croutones crujientes, queso parmesano y nuestro aderezo césar especial.',
        ingredients: ['Lechuga romana', 'Parmesano', 'Croutones', 'Aderezo César'],
        allergens: ['Lácteos', 'Gluten', 'Huevo', 'Pescado (en aderezo)'],
        suggested: 'Sandwich de Pavo'
    },
    'Bowl Saludable': {
        desc: 'Una explosión de nutrientes con quinoa, vegetales frescos y aderezo cítrico.',
        ingredients: ['Quinoa', 'Aguacate', 'Garbanzos', 'Kale'],
        allergens: [],
        suggested: 'Té Verde Matcha'
    },
    'Tacos al Pastor': {
        desc: 'Tres tacos de cerdo marinado con piña, servidos en tortilla de maíz recién hecha.',
        ingredients: ['Cerdo marinado', 'Piña', 'Tortilla de maíz'],
        allergens: [],
        suggested: 'Frappé Oreo'
    },
    'Pizza Artesanal': {
        desc: 'Pizza individual horneada con masa delgada, salsa de tomate natural, mozzarella y albahaca.',
        ingredients: ['Masa madre', 'Pomodoro', 'Mozzarella fresca', 'Albahaca'],
        allergens: ['Gluten', 'Lácteos'],
        suggested: 'Mocaccino'
    },
    'Burger Gourmet': {
        desc: 'Hamburguesa de carne angus con queso fundido y tocino en pan brioche artesanal.',
        ingredients: ['Carne Angus', 'Pan Brioche', 'Queso Cheddar'],
        allergens: ['Gluten', 'Lácteos'],
        suggested: 'Mocaccino'
    },
    'Risotto de Hongos': {
        desc: 'Arroz arborio cocinado lentamente con una selección de hongos silvestres y parmesano.',
        ingredients: ['Arroz Arborio', 'Hongos', 'Parmesano', 'Vino blanco'],
        allergens: ['Lácteos'],
        suggested: 'Pizza Artesanal'
    },
    'Brownie': {
        desc: 'Bizcocho de chocolate intenso con nueces, melcochudo por dentro.',
        ingredients: ['Chocolate amargo', 'Nueces', 'Mantequilla', 'Harina'],
        allergens: ['Lácteos', 'Gluten', 'Frutos secos'],
        suggested: 'Mocaccino'
    },
    'Cheesecake': {
        desc: 'Tarta de queso estilo New York sobre base de galleta, bañada en coulis de frutos rojos.',
        ingredients: ['Queso crema', 'Galleta', 'Frutos rojos'],
        allergens: ['Lácteos', 'Gluten', 'Huevo'],
        suggested: 'Latte Caramel'
    },
    'Tiramisú': {
        desc: 'Clásico postre italiano con capas de bizcocho soletilla empapadas en espresso y crema de mascarpone.',
        ingredients: ['Mascarpone', 'Café Espresso', 'Bizcocho', 'Cacao'],
        allergens: ['Lácteos', 'Gluten', 'Huevo'],
        suggested: 'Capuccino'
    },
    'Macarons': {
        desc: 'Selección de seis macarons franceses de colores y sabores exquisitos.',
        ingredients: ['Harina de almendra', 'Clara de huevo', 'Ganache'],
        allergens: ['Frutos secos (almendra)', 'Huevo', 'Lácteos'],
        suggested: 'Té Verde Matcha'
    },
    'Pie de Manzana': {
        desc: 'Tradicional pastel de manzana con costra crujiente y relleno especiado.',
        ingredients: ['Manzana verde', 'Canela', 'Mantequilla', 'Harina'],
        allergens: ['Gluten', 'Lácteos'],
        suggested: 'Espresso Doppio'
    }
};

const showProductDetails = (name, price, img) => {
    const data = productsData[name] || { desc: 'Un clásico de nuestra casa.', ingredients: [], allergens: [], suggested: '' };
    const modal = q('#productModal');
    const content = q('#productModalContent');
    
    if (modal && content) {
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
                    
                    <div class="product-detail-section">
                        <h4>Ingredientes Clave:</h4>
                        <p>${data.ingredients.join(', ')}</p>
                    </div>
                    
                    <div class="product-detail-section">
                        <h4>Alérgenos:</h4>
                        <div class="allergen-list">
                            ${data.allergens.map(a => `<span class="allergen-badge">${a}</span>`).join('')}
                        </div>
                    </div>
                    
                    ${data.suggested ? `
                    <div class="suggested-box">
                        <p>✨ <strong>Recomendación:</strong> Pruébalo con nuestro ${data.suggested}</p>
                    </div>` : ''}
                    
                    <button class="submit-btn" onclick="addToCart('${name}', ${price}, '${img}'); toggleModal('productModal');">
                        Agregar al Carrito
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
    updateUI(); setupObs(); loadReviews();
    const style = document.createElement('style');
    style.textContent = `.reveal-init{opacity:0;transform:translateY(20px);transition:all .6s;}.reveal-init.reveal{opacity:1;transform:translateY(0);}`;
    document.head.appendChild(style);
});
