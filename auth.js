// Usuarios predefinidos (administradores)
const usuariosPredefinidos = [
    {
        nombre: "Jhon Smith",
        email: "jhonfernandezcondor@gmail.com",
        password: "JSferco18",
        sede: "admin",
        rol: "admin",
        verificado: true
    },
    {
        nombre: "Patricia Perez",
        email: "kperezsuasnabar@gmail.com",
        password: "72566646",
        sede: "admin",
        rol: "admin",
        verificado: true
    }
];

// Inicializar usuarios en localStorage
function inicializarUsuarios() {
    if(!localStorage.getItem('usuarios')) {
        localStorage.setItem('usuarios', JSON.stringify(usuariosPredefinidos));
    }
}

// Verificar si hay usuario actual
function verificarSesion() {
    const usuarioActual = localStorage.getItem('usuarioActual');
    if(!usuarioActual) {
        window.location.href = 'index.html';
        return null;
    }
    return JSON.parse(usuarioActual);
}

// Cerrar sesión
function cerrarSesion() {
    localStorage.removeItem('usuarioActual');
    window.location.href = 'index.html';
}

// Obtener usuarios registrados
function obtenerUsuarios() {
    return JSON.parse(localStorage.getItem('usuarios') || '[]');
}

// Guardar usuario
function guardarUsuario(usuario) {
    const usuarios = obtenerUsuarios();
    usuarios.push(usuario);
    localStorage.setItem('usuarios', JSON.stringify(usuarios));
}

// Exportar funciones
window.inicializarUsuarios = inicializarUsuarios;
window.verificarSesion = verificarSesion;
window.cerrarSesion = cerrarSesion;
window.obtenerUsuarios = obtenerUsuarios;
window.guardarUsuario = guardarUsuario;

// Inicializar al cargar
inicializarUsuarios();