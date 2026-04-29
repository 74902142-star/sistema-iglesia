// ============================================
// IGLESIA AGUA VIVA - FIREBASE DATABASE
// ============================================

const SEDES = [
    { id: 'san_carlos_10am', nombre: 'San Carlos - 10am (Domingo)', tipo: 'domingo', icono: '🏛️' },
    { id: 'san_carlos_12pm', nombre: 'San Carlos - 12pm (Domingo)', tipo: 'domingo', icono: '🏛️' },
    { id: 'san_carlos_5pm', nombre: 'San Carlos - 5pm (Sábado)', tipo: 'next', icono: '🌙' },
    { id: 'san_carlos_7pm', nombre: 'San Carlos - 7pm (Sábado)', tipo: 'next', icono: '🌙' },
    { id: 'el_tambo_12pm', nombre: 'El Tambo - 12pm', tipo: 'domingo', icono: '🏛️' },
    { id: 'el_tambo_6pm', nombre: 'El Tambo - 6pm', tipo: 'next', icono: '🌙' },
    { id: 'chupaca_6pm', nombre: 'Chupaca - 6pm', tipo: 'next', icono: '🌙' },
    { id: 'jauja', nombre: 'Jauja', tipo: 'domingo', icono: '🏔️' },
    { id: 'belen', nombre: 'Belén - Tu Casa', tipo: 'domingo', icono: '🏠' },
    { id: 'transformando_ciudades', nombre: 'Transformando Ciudades', tipo: 'domingo', icono: '🌍' }
];

const USUARIOS_PREDEFINIDOS = [
    { id: 1, nombre: "Jhon Smith", email: "jhonfernandezcondor@gmail.com", password: "JSferco18", sede: "admin", rol: "admin", verificado: true },
    { id: 2, nombre: "Patricia Perez", email: "kperezsuasnabar@gmail.com", password: "72566646", sede: "admin", rol: "admin", verificado: true }
];

// ========== REGISTROS ==========

async function guardarRegistro(datos) {
    return new Promise(async (resolve, reject) => {
        try {
            const ministerios = datos.ministerios;
            const asistentes = datos.asistentes;
            
            const totalMV = Object.values(ministerios).reduce((s, m) => s + (Number(m.v) || 0), 0);
            const totalMM = Object.values(ministerios).reduce((s, m) => s + (Number(m.m) || 0), 0);
            const totalAV = Number(asistentes.adultos?.v) || 0;
            const totalAM = Number(asistentes.adultos?.m) || 0;
            const totalKV = Number(asistentes.kids?.v) || 0;
            const totalKM = Number(asistentes.kids?.m) || 0;
            
            const fechaObj = new Date(datos.fecha);
            const anio = fechaObj.getFullYear();
            
            if (anio < 2026) {
                reject(new Error('Solo registros desde 2026'));
                return;
            }
            
            const nuevoRegistro = {
                id: Date.now(),
                fecha: datos.fecha,
                sede: datos.sede,
                semana: obtenerSemana(datos.fecha),
                mes: datos.fecha.substring(0, 7),
                anio: anio,
                ministerios: ministerios,
                asistentes: asistentes,
                totalMV: totalMV,
                totalMM: totalMM,
                totalAV: totalAV,
                totalAM: totalAM,
                totalKV: totalKV,
                totalKM: totalKM,
                totalVarones: totalMV + totalAV + totalKV,
                totalMujeres: totalMM + totalAM + totalKM,
                totalGeneral: (totalMV + totalMM) + (totalAV + totalAM) + (totalKV + totalKM),
                timestamp: new Date().toISOString()
            };
            
            await firebase.firestore().collection('registros').add(nuevoRegistro);
            console.log('✅ Registro guardado en Firebase');
            resolve(nuevoRegistro);
        } catch (error) {
            console.error('❌ Error:', error);
            reject(error);
        }
    });
}

async function actualizarRegistro(id, datos) {
    return new Promise(async (resolve, reject) => {
        try {
            const ministerios = datos.ministerios;
            const asistentes = datos.asistentes;
            
            const totalMV = Object.values(ministerios).reduce((s, m) => s + (Number(m.v) || 0), 0);
            const totalMM = Object.values(ministerios).reduce((s, m) => s + (Number(m.m) || 0), 0);
            const totalAV = Number(asistentes.adultos?.v) || 0;
            const totalAM = Number(asistentes.adultos?.m) || 0;
            const totalKV = Number(asistentes.kids?.v) || 0;
            const totalKM = Number(asistentes.kids?.m) || 0;
            
            const registroActualizado = {
                fecha: datos.fecha,
                sede: datos.sede,
                semana: obtenerSemana(datos.fecha),
                mes: datos.fecha.substring(0, 7),
                anio: new Date(datos.fecha).getFullYear(),
                ministerios: ministerios,
                asistentes: asistentes,
                totalMV: totalMV,
                totalMM: totalMM,
                totalAV: totalAV,
                totalAM: totalAM,
                totalKV: totalKV,
                totalKM: totalKM,
                totalVarones: totalMV + totalAV + totalKV,
                totalMujeres: totalMM + totalAM + totalKM,
                totalGeneral: (totalMV + totalMM) + (totalAV + totalAM) + (totalKV + totalKM),
                timestamp: new Date().toISOString()
            };
            
            const querySnapshot = await firebase.firestore().collection('registros').where('id', '==', id).get();
            for (const doc of querySnapshot.docs) {
                await doc.ref.update(registroActualizado);
            }
            
            console.log('✏️ Registro actualizado:', id);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

async function eliminarRegistro(id) {
    return new Promise(async (resolve, reject) => {
        try {
            const querySnapshot = await firebase.firestore().collection('registros').where('id', '==', id).get();
            for (const doc of querySnapshot.docs) {
                await doc.ref.delete();
            }
            console.log('🗑️ Registro eliminado:', id);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

async function obtenerRegistrosFiltrados(filtros = {}) {
    return new Promise(async (resolve, reject) => {
        try {
            let registros = [];
            const snapshot = await firebase.firestore().collection('registros').get();
            
            snapshot.forEach(doc => {
                registros.push(doc.data());
            });
            
            // Filtrar por año >= 2026
            registros = registros.filter(r => r.anio >= 2026);
            
            // Aplicar filtros locales
            const usuario = obtenerUsuarioActual();
            if (usuario && usuario.rol !== 'admin' && usuario.sede && usuario.sede !== 'admin') {
                registros = registros.filter(r => r.sede === usuario.sede);
            }
            if (filtros.sede && filtros.sede !== 'todas') {
                registros = registros.filter(r => r.sede === filtros.sede);
            }
            if (filtros.semana) {
                registros = registros.filter(r => r.semana === filtros.semana);
            }
            if (filtros.mes) {
                registros = registros.filter(r => r.mes === filtros.mes);
            }
            if (filtros.anio) {
                registros = registros.filter(r => r.anio == filtros.anio);
            }
            
            registros.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            resolve(registros);
        } catch (error) {
            console.error('Error al obtener registros:', error);
            reject(error);
        }
    });
}

// ========== USUARIOS ==========

function obtenerUsuarioActual() {
    return JSON.parse(localStorage.getItem('usuarioActual') || 'null');
}

function login(email, password) {
    const usuarios = JSON.parse(localStorage.getItem('iglesia_usuarios') || '[]');
    const usuario = usuarios.find(u => u.email === email && u.password === password);
    if (usuario && usuario.verificado) {
        localStorage.setItem('usuarioActual', JSON.stringify(usuario));
        return { success: true, usuario };
    }
    return { success: false, message: 'Credenciales incorrectas' };
}

function registrarUsuario(nombre, email, sede, password) {
    const usuarios = JSON.parse(localStorage.getItem('iglesia_usuarios') || '[]');
    if (usuarios.find(u => u.email === email)) {
        return { success: false, message: 'El correo ya está registrado' };
    }
    const nuevoUsuario = {
        id: Date.now(),
        nombre, email, sede, password,
        rol: 'lider',
        verificado: true,
        creado: new Date().toISOString()
    };
    usuarios.push(nuevoUsuario);
    localStorage.setItem('iglesia_usuarios', JSON.stringify(usuarios));
    return { success: true, usuario: nuevoUsuario };
}

function logout() {
    localStorage.removeItem('usuarioActual');
    window.location.href = 'index.html';
}

function verificarSesion() {
    const usuario = obtenerUsuarioActual();
    if (!usuario) {
        window.location.href = 'index.html';
        return false;
    }
    return usuario;
}

// ========== UTILIDADES ==========

function obtenerSemana(fecha) {
    const d = new Date(fecha);
    const year = d.getFullYear();
    const start = new Date(year, 0, 1);
    const days = Math.floor((d - start) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + start.getDay() + 1) / 7);
    return `${year}-W${week.toString().padStart(2, '0')}`;
}

function formatearSede(sedeId) {
    const sede = SEDES.find(s => s.id === sedeId);
    return sede ? `${sede.icono} ${sede.nombre}` : sedeId;
}

function exportarExcel(registros) {
    const datos = registros.map(r => ({
        'Fecha': r.fecha,
        'Sede': formatearSede(r.sede),
        'Semana': r.semana,
        'Total': r.totalGeneral,
        'Varones': r.totalVarones,
        'Mujeres': r.totalMujeres,
        'Kids': (r.totalKV || 0) + (r.totalKM || 0)
    }));
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.writeFile(wb, `iglesia_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Inicializar usuarios si no existen
if (!localStorage.getItem('iglesia_usuarios')) {
    localStorage.setItem('iglesia_usuarios', JSON.stringify(USUARIOS_PREDEFINIDOS));
}

window.db = {
    SEDES,
    guardarRegistro,
    actualizarRegistro,
    eliminarRegistro,
    obtenerRegistrosFiltrados,
    login,
    registrarUsuario,
    logout,
    verificarSesion,
    obtenerUsuarioActual,
    formatearSede,
    exportarExcel
};