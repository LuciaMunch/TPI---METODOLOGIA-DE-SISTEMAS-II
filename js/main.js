import { Usuario } from './classes/usuario.js';

const API_USUARIOS = 'https://69ef4787112e1b968e244d31.mockapi.io/api/usuario';

let usuarioActual = null;
let loginRole = null;

// ---------------- UI helpers (solamente vistas) ----------------

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
});

function toggleAuthForm() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    const isLoginHidden = loginForm.style.display === 'none';

    loginForm.style.display = isLoginHidden ? 'block' : 'none';
    registerForm.style.display = isLoginHidden ? 'none' : 'block';
}

function resetViews() {
    document.getElementById('adminDashboardView').style.display = 'none';
    document.getElementById('dashboardView').style.display = 'none';
}

// ---------------- Vistas ----------------

function mostrarVistaLogin() {
    document.getElementById('authView').style.display = 'flex';
    document.getElementById('userInfo').style.display = 'none';

    resetViews();
}

function mostrarVistaPrincipal() {
    resetViews();

    document.getElementById('authView').style.display = 'none';
    document.getElementById('userInfo').style.display = 'flex';

    document.getElementById('userName').textContent = usuarioActual.nombre;
    document.getElementById('userRole').textContent = usuarioActual.role;

    if (usuarioActual.role === 'ADMIN') {
        document.getElementById('adminDashboardView').style.display = 'block';
        initAdminDashboard();
    } else {
        document.getElementById('dashboardView').style.display = 'block';
        cargarProductos();
    }
}

// ---------------- Lógica de vistas ----------------

function initAdminDashboard() {
    alert('Vista ADMIN');   // eliminar
    // Funciones admin...
}

function cargarProductos() {
    alert('Vista USUARIO'); // eliminar
    // Funciones usuario...
}

// ---------------- LOGIN ----------------

function setLoginRole(role) {
    loginRole = role;

    document.getElementById('btn-usuario')?.classList.remove('active');
    document.getElementById('btn-admin')?.classList.remove('active');

    if (role === 'USUARIO') {
        document.getElementById('btn-usuario')?.classList.add('active');
    } else {
        document.getElementById('btn-admin')?.classList.add('active');
    }
}

function manejarLogin(e) {

    if (!loginRole) {
        alert('Elegí tipo de usuario');
        return;
    }

    usuarioActual = new Usuario(
        0,
        loginRole === 'ADMIN' ? 'Admin' : 'Usuario',
        "Demo",
        'demo@mail.com',
        "Contraseña1",
        loginRole
    );

    usuarioActual.role = loginRole;

    console.log('ROLE FINAL:', usuarioActual.role);

    localStorage.setItem('usuarioActual', JSON.stringify(usuarioActual));

    loginRole = null; // evitar bug de rol persistente
    document.getElementById('loginForm').reset();

    mostrarVistaPrincipal();
}

function cerrarSesion() {
    usuarioActual = null;
    loginRole = null;

    localStorage.removeItem('usuarioActual');

    document.getElementById('loginForm')?.reset();
    mostrarVistaLogin();
}

// ---------------- REGISTRO ----------------

function validarPass(password) {
    return (
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /\d/.test(password)
    );
}

function validarStrLogin(str) {
    const regex = /^(?=.*[a-zA-Z])[a-zA-Z]{3,20}$/;
    return regex.test(str);
}

async function crearUsuario(e) {
    e.preventDefault();

    const nombre = document.getElementById('registerName').value;
    const apellido = document.getElementById('registerSurname').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const direccion = document.getElementById('registerDireccion').value;
    const piso = document.getElementById('registerPiso').value;
    const dpto = document.getElementById('registerDpto').value;

    if (!validarStrLogin(nombre)) {
        alert('Nombre de usuario inválido');
        return;
    }

    if (!validarStrLogin(apellido)) {
        alert('Apellido inválido');
        return;
    }

    if (!validarPass(password)) {
        alert('Contraseña débil, mínimo 8 caracteres, con mayúscula, minúscula y número');
        return;
    }

    const userData = {
        nombre,
        apellido,
        email,
        password,
        role: 'USUARIO',
        direccion,
        piso,
        dpto
    };

    try {
        const res = await fetch(API_USUARIOS);
        if (!res.ok) throw new Error('Error al consultar la API');

        const users = await res.json();
        if (users.some(u => u.email === email)) {
            alert('Email ya registrado');
            return;
        }

        await fetch(API_USUARIOS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        document.getElementById('registerForm').reset();
        toggleAuthForm();

    } catch (err) {
        console.error(err);
        alert('Error al registrar');
    }
}

// ---------------- INIT (mantener al final) ----------------

// Global (HTML)
window.toggleAuthForm = toggleAuthForm;
window.cerrarSesion = cerrarSesion;
window.manejarLogin = manejarLogin;
window.crearUsuario = crearUsuario;
window.openModal = openModal;
window.closeModal = closeModal;

document.addEventListener('DOMContentLoaded', () => {
    const usuarioGuardado = localStorage.getItem('usuarioActual');

    if (usuarioGuardado) {
        usuarioActual = JSON.parse(usuarioGuardado);
        mostrarVistaPrincipal();
    } else {
        mostrarVistaLogin();
    }

    // listeners
    document.getElementById('registerForm')?.addEventListener('submit', crearUsuario);
    document.getElementById('logoutBtn')?.addEventListener('click', cerrarSesion);

    document.getElementById('btn-usuario')?.addEventListener('click', (e) => {
        setLoginRole('USUARIO');
        manejarLogin(e);
    });

    document.getElementById('btn-admin')?.addEventListener('click', (e) => {
        setLoginRole('ADMIN');
        manejarLogin(e);
    });

    document.getElementById('toggleAuth')?.addEventListener('click', toggleAuthForm);
    document.getElementById('toggleAuthBack')?.addEventListener('click', toggleAuthForm);
});