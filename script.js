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
                <div style="display:flex; flex-direction:column; gap:1rem;">
                    <button class="submit-btn" onclick="handleLogout()" style="background:var(--secondary-color);">Cerrar Sesión</button>
                    <button class="btn-google" onclick="toggleLoginModal()" style="border:none;">Volver</button>
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
    const c = q('#cartItems'), count = q('#cartCount'), total = q('#cartTotal');
    if (count) count.innerText = cart.length;
    if (!c) return;
    if (!cart.length) {
        c.innerHTML = '<div style="text-align:center;margin-top:3rem;opacity:.5;"><i class="fas fa-shopping-basket" style="font-size:3rem;"></i><p>Vacío</p></div>';
        if (total) total.innerText = "$0.00";
        return;
    }
    c.innerHTML = cart.map((i, idx) => `
        <div class="cart-item-row" style="display:flex;gap:1rem;margin-bottom:1.5rem;align-items:center;">
            <img src="${i.img}" style="width:50px;height:50px;border-radius:8px;object-fit:cover;">
            <div style="flex:1;"><h4 style="font-size:.9rem;margin:0;">${i.name}</h4><span style="color:var(--secondary-color);">$${i.price.toFixed(2)}</span></div>
            <button onclick="rm(${idx})" style="background:none;border:none;cursor:pointer;"><i class="fas fa-times"></i></button>
        </div>`).join('');
    if (total) total.innerText = `$${cart.reduce((a, b) => a + b.price, 0).toFixed(2)}`;
};

const addToCart = (n, p, i) => {
    cart.push({ name: n, price: p, img: i });
    save(); updateUI();
    const btn = q('.cart-floating-btn');
    if (btn) { btn.style.animation = 'none'; void btn.offsetWidth; btn.style.animation = 'pulse 0.5s'; }
};

const rm = (idx) => { cart.splice(idx, 1); save(); updateUI(); };
const toggleCart = () => q('#cartSidebar')?.classList.toggle('active');

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
