// Base de datos local (IndexedDB para guardar historial)
let db;

// Inicializar base de datos
async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('IglesiaDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if(!db.objectStoreNames.contains('registros')) {
                const store = db.createObjectStore('registros', { keyPath: 'id', autoIncrement: true });
                store.createIndex('fecha', 'fecha');
                store.createIndex('sede', 'sede');
                store.createIndex('semana', 'semana');
                store.createIndex('mes', 'mes');
            }
        };
    });
}

// Guardar registro
async function guardarRegistro(datos) {
    await initDB();
    
    const totalMinisteriosV = datos.ministerios.alabanza.v + datos.ministerios.produccion.v + 
                              datos.ministerios.servidores.v + datos.ministerios.conexion.v + 
                              datos.ministerios.maestrosKids.v;
    const totalMinisteriosM = datos.ministerios.alabanza.m + datos.ministerios.produccion.m + 
                              datos.ministerios.servidores.m + datos.ministerios.conexion.m + 
                              datos.ministerios.maestrosKids.m;
    
    const totalAdultos = datos.asistentes.adultos.v + datos.asistentes.adultos.m;
    const totalKids = datos.asistentes.kids.v + datos.asistentes.kids.m;
    
    const registro = {
        fecha: datos.fecha,
        sede: datos.sede,
        semana: obtenerSemana(datos.fecha),
        mes: datos.fecha.substring(0, 7),
        ministerios: datos.ministerios,
        asistentes: datos.asistentes,
        totalMinisteriosV: totalMinisteriosV,
        totalMinisteriosM: totalMinisteriosM,
        totalAdultosV: datos.asistentes.adultos.v,
        totalAdultosM: datos.asistentes.adultos.m,
        totalKidsV: datos.asistentes.kids.v,
        totalKidsM: datos.asistentes.kids.m,
        totalVarones: totalMinisteriosV + datos.asistentes.adultos.v + datos.asistentes.kids.v,
        totalMujeres: totalMinisteriosM + datos.asistentes.adultos.m + datos.asistentes.kids.m,
        totalGeneral: (totalMinisteriosV + totalMinisteriosM) + totalAdultos + totalKids,
        timestamp: new Date().toISOString()
    };
    
    const transaction = db.transaction(['registros'], 'readwrite');
    const store = transaction.objectStore('registros');
    
    return new Promise((resolve, reject) => {
        const request = store.add(registro);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Obtener todos los registros
async function obtenerDatos() {
    await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['registros'], 'readonly');
        const store = transaction.objectStore('registros');
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

// Obtener semana del año
function obtenerSemana(fecha) {
    const date = new Date(fecha);
    const year = date.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${year}-W${week}`;
}

// Enviar por WhatsApp
function enviarWhatsApp(fecha, sede, total) {
    const mensaje = `📊 *REPORTE IGLESIA AGUA VIVA* 📊\n\n📅 Fecha: ${fecha}\n📍 Sede: ${sede}\n👥 Total Asistentes: ${total}\n\n¡Dios les bendiga! 🙏`;
    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

// Inicializar
initDB().then(() => {
    console.log('Base de datos lista');
});

// Exportar funciones
window.guardarRegistro = guardarRegistro;
window.obtenerDatos = obtenerDatos;
window.enviarWhatsApp = enviarWhatsApp;