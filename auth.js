// Sesión local (admin / invitado) — no modifica firebase-config.js
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
