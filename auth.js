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

// Invitados: en el menú lateral solo ven el módulo al que entraron
// (Notas, Ingreso/Conteo o EDL). No ven Aula, Kids, etc.
document.addEventListener('DOMContentLoaded', function () {
    try {
        var u = Auth.getUsuario();
        if (u && u.rol === 'invitado') {
            var path = (location.pathname || '').split('/').pop() || 'guest.html';
            // Ocultar siempre: Aula, Kids, Lideres, Dashboard, Registro principal
            ['nav-aula', 'nav-kids', 'nav-lideres', 'nav-dashboard', 'nav-registro'].forEach(function (id) {
                var el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            // En guest.html las tarjetas las controla guest.html
            if (path === 'guest.html') return;
            // Solo queda visible el módulo actual; ocultar los otros dos
            var mapa = {
                'notas.html': 'nav-notas',
                'ingreso.html': 'nav-ingreso',
                'edl.html': 'nav-edl'
            };
            var actual = mapa[path];
            ['nav-notas', 'nav-ingreso', 'nav-edl'].forEach(function (id) {
                if (id !== actual) {
                    var el = document.getElementById(id);
                    if (el) el.style.display = 'none';
                }
            });
        }
    } catch (e) { }
});
