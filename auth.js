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

// Invitados: solo ven Registro de Notas en el menú (sin Aula, EDL, Kids, etc.)
document.addEventListener('DOMContentLoaded', function () {
    try {
        var u = Auth.getUsuario();
        if (u && u.rol === 'invitado') {
            ['nav-aula', 'opt-aula', 'nav-edl', 'opt-edl', 'nav-kids', 'opt-kids',
             'nav-lideres', 'opt-lideres', 'nav-dashboard', 'opt-dashboard',
             'nav-registro', 'opt-registro', 'opt-ingreso'].forEach(function (id) {
                var el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
        }
    } catch (e) { }
});
