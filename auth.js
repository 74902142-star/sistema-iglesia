// Sesión local (admin / invitado) en localStorage — sin backend de autenticación
const Auth = {
    getUsuario() {
        try {
            return JSON.parse(localStorage.getItem('usuarioActual'));
        } catch (e) {
            return null;
        }
    },

    esAdmin() {
        const u = this.getUsuario();
        return u && u.rol === 'admin';
    },

    esInvitado() {
        const u = this.getUsuario();
        return u && u.rol === 'invitado';
    },

    entrarComoInvitado(nombre) {
        localStorage.setItem('usuarioActual', JSON.stringify({
            rol: 'invitado',
            nombre: (nombre || 'Invitado').trim() || 'Invitado',
            email: ''
        }));
    },

    requiereAdmin() {
        if (!this.esAdmin()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    },

    /** Página de registro: invitado o admin */
    permitirRegistro() {
        const u = this.getUsuario();
        if (u && (u.rol === 'invitado' || u.rol === 'admin')) return true;
        this.entrarComoInvitado();
        return true;
    },

    cerrarSesion() {
        localStorage.removeItem('usuarioActual');
        window.location.href = 'index.html';
    }
};

// ══════════════ Cierre por inactividad (5 minutos) ══════════════
// Vale para admin e invitado: si no hay actividad (ratón, teclado, táctil)
// durante 5 minutos, se cierra la sesión y se vuelve a index.html.
(function () {
    var TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos
    var timer = null;

    function haySesion() {
        try { return !!localStorage.getItem('usuarioActual'); } catch (e) { return false; }
    }

    function cerrarPorInactividad() {
        if (!haySesion()) return;
        try {
            localStorage.removeItem('usuarioActual');
            localStorage.removeItem('tutorValidado');
        } catch (e) { }
        // Evita bucle si ya estamos en index
        var pag = (location.pathname || '').split('/').pop() || '';
        if (pag !== 'index.html' && pag !== '' && pag !== '/') {
            window.location.href = 'index.html';
        }
    }

    function reiniciarTimer() {
        if (!haySesion()) return;
        clearTimeout(timer);
        timer = setTimeout(cerrarPorInactividad, TIMEOUT_MS);
    }

    // Cualquier interacción del usuario reinicia el contador
    ['mousemove', 'mousedown', 'keydown', 'keyup', 'touchstart', 'touchmove', 'scroll', 'click', 'focus']
        .forEach(function (ev) {
            document.addEventListener(ev, reiniciarTimer, { passive: true });
        });

    // Al cargar la página, si hay sesión, arrancar el contador
    document.addEventListener('DOMContentLoaded', reiniciarTimer);
    // Por si auth.js se carga después del DOMContentLoaded
    if (document.readyState !== 'loading') reiniciarTimer();
})();

// Invitados: en el menú lateral solo ven el módulo al que entraron
// (Notas, Ingreso/Conteo o EDL) + Cerrar Sesión. No ven Aula, Kids, etc.
document.addEventListener('DOMContentLoaded', function () {
    try {
        var u = Auth.getUsuario();
        if (u && u.rol === 'invitado') {
            var path = (location.pathname || '').split('/').pop() || 'guest.html';
            // Ocultar siempre: Aula, Kids, Lideres, Dashboard, Configuración
            ['nav-aula', 'nav-kids', 'nav-lideres', 'nav-dashboard', 'nav-config'].forEach(function (id) {
                var el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            // En guest.html las tarjetas las controla guest.html
            if (path === 'guest.html') return;
            // Módulos que un invitado puede abrir: solo se ve el actual
            // (los IDs reales del sidebar: nav-registro = ingreso.html)
            var mapa = {
                'notas.html': 'nav-notas',
                'ingreso.html': 'nav-registro',
                'edl.html': 'nav-edl'
            };
            var actual = mapa[path];
            ['nav-notas', 'nav-registro', 'nav-edl'].forEach(function (id) {
                if (id !== actual) {
                    var el = document.getElementById(id);
                    if (el) el.style.display = 'none';
                }
            });
        }
    } catch (e) { }
});
