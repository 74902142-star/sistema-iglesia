// ══════════════════════════════════════════════════════════
// INSCRIPCIONES EDL - Google Apps Script
// Pegar en: Extensiones > Apps Script del Google Sheet
// Libro: https://docs.google.com/spreadsheets/d/11Lov2GO5Avj-vyI0K_WixOHW5fzECj2RtXFh17qKwc0/
//
// HOJAS DEL LIBRO
//   • CICLO 202610 → ciclo anterior. Solo se RENOMBRA y se BLOQUEA
//                    (contraseña 74902142). Su contenido no se toca.
//   • CICLO 202620 → ciclo actual. Se crea si no existe y se actualiza
//                    con cada nueva inscripción.
//
// ACTUALIZACIÓN AUTOMÁTICA
//   • Al abrir el libro (onOpen) se refresca CICLO 202620.
//   • Para refrescar cada 5 minutos sin abrir el libro: ejecutar UNA vez
//     crearTrigger() desde el editor de Apps Script.
//
// FUNCIONES
//   actualizarCiclo202620() → refresca la hoja del ciclo actual (+ bloqueo)
//   actualizarCiclo202610() → regenera la hoja del ciclo anterior (manual:
//                             solo si se recuperan sus datos)
//   crearTrigger()          → actualización automática cada 5 minutos
//   quitarTrigger()         → elimina ese disparador
// ══════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://bhuxtunecrqybnlmdspy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_O2I6gdmeKFfxE5J6KO5kcA_2-sADXLy';

const HOJA_ANTERIOR = 'CICLO 202610';
const HOJA_ACTUAL = 'CICLO 202620';
const CICLO_ANTERIOR = '202610';
const CICLO_ACTUAL = '202620';
const CLAVE_BLOQUEO = '74902142';

const COLUMNAS = ['Nro', 'Nombres', 'DNI', 'Celular', 'Correo', 'Lider', 'Sede', 'Curso'];
const COLOR_TITULO = '#00334F';
const COLOR_HEADER = '#1C6390';
const COLOR_PAR = '#FFFFFF';
const COLOR_IMPAR = '#F1F5F9';
const ANCHOS_PX = [45, 246, 80, 88, 220, 158, 141, 176];

// ══════════════ DISPARADORES ══════════════

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🔄 Actualizar')
      .addItem('Actualizar inscripciones ' + CICLO_ACTUAL, 'actualizarCiclo202620')
      .addToUi();
  } catch (e) {
    Logger.log('onOpen menú: ' + e);
  }
  try {
    actualizarCiclo202620();
  } catch (e) {
    Logger.log('onOpen actualización: ' + e);
  }
}

function crearTrigger() {
  const existe = ScriptApp.getProjectTriggers()
    .some(t => t.getHandlerFunction() === 'actualizarCiclo202620');
  if (existe) {
    Logger.log('El disparador de 5 minutos ya existe.');
    return;
  }
  ScriptApp.newTrigger('actualizarCiclo202620').timeBased().everyMinutes(5).create();
  Logger.log('Disparador creado: cada 5 minutos.');
}

function quitarTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'actualizarCiclo202620')
    .forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log('Disparador eliminado.');
}

// ══════════════ HOJAS ══════════════

// Primera pestaña = ciclo anterior: solo renombrar (si hace falta) y bloquear.
function prepararHojaAnterior_(ss) {
  let hoja = ss.getSheetByName(HOJA_ANTERIOR);
  if (!hoja) {
    hoja = ss.getSheets()[0];
    if (hoja.getName() !== HOJA_ACTUAL) {
      try {
        hoja.setName(HOJA_ANTERIOR);
      } catch (e) {
        Logger.log('No se pudo renombrar la hoja: ' + e);
      }
    }
    hoja = ss.getSheetByName(HOJA_ANTERIOR) || hoja;
  }
  repararTitulo_(hoja);
  bloquearHoja_(hoja);
  return hoja;
}

// Si la versión anterior del script dejó "Sin datos de inscripciones"
// en A1 (falló la consulta a Supabase), restaura el título real.
function repararTitulo_(hoja) {
  try {
    const titulo = String(hoja.getRange(1, 1).getValue() || '').trim();
    if (titulo.indexOf('INSCRIPCIONES') === 0) return;
    const ultima = hoja.getLastRow();
    if (titulo === '' && ultima < 4) return;
    let filas = 0;
    if (ultima >= 4) {
      filas = hoja.getRange(4, 2, ultima - 3, 1).getValues()
        .filter(f => String((f && f[0]) || '').trim() !== '').length;
    }
    desbloquearHoja_(hoja);
    hoja.getRange(1, 1).setValue('INSCRIPCIONES EDL 2026 - Total: ' + filas);
    Logger.log('Título restaurado en ' + hoja.getName() + ': ' + filas + ' filas.');
  } catch (e) {
    Logger.log('repararTitulo_: ' + e);
  }
}

function obtenerHojaActual_(ss) {
  let hoja = ss.getSheetByName(HOJA_ACTUAL);
  if (!hoja) hoja = ss.insertSheet(HOJA_ACTUAL, 1);
  return hoja;
}

function bloquearHoja_(hoja) {
  try {
    const protecciones = hoja.getProtections(SpreadsheetApp.SheetProtectionType.SHEET);
    if (protecciones.length > 0) return false;
    const proteccion = hoja.protect();
    proteccion.setWarningOnly(false);
    proteccion.setDescription('Ciclo ' + CICLO_ANTERIOR + ' finalizado. Editar solo con contraseña.');
    proteccion.setPassword(CLAVE_BLOQUEO);
    const editores = proteccion.getEditors();
    if (editores.length) proteccion.removeEditors(editores);
    return true;
  } catch (e) {
    Logger.log('bloquearHoja_: ' + e);
    return false;
  }
}

function desbloquearHoja_(hoja) {
  hoja.getProtections(SpreadsheetApp.SheetProtectionType.SHEET)
    .forEach(p => p.remove());
}

// ══════════════ DATOS (Supabase) ══════════════

function obtenerInscripciones_(ciclo) {
  const columnas = 'nombres,dni,celular,correo,lider,sede,cursoNombre,timestamp';
  const opciones = {
    method: 'get',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY
    },
    muteHttpExceptions: true
  };
  let datos = [];
  let offset = 0;
  for (let pagina = 0; pagina < 20; pagina++) {
    const url = SUPABASE_URL + '/rest/v1/inscripciones?select=' + columnas +
      '&ciclo=eq.' + encodeURIComponent(ciclo) +
      '&order=timestamp.asc&limit=1000&offset=' + offset;
    const respuesta = UrlFetchApp.fetch(url, opciones);
    if (respuesta.getResponseCode() !== 200) {
      Logger.log('Error Supabase (' + respuesta.getResponseCode() + '): ' +
        respuesta.getContentText().slice(0, 300));
      break;
    }
    const fila = JSON.parse(respuesta.getContentText());
    if (!Array.isArray(fila)) {
      Logger.log('Respuesta inesperada: ' + respuesta.getContentText().slice(0, 300));
      break;
    }
    datos = datos.concat(fila);
    if (fila.length < 1000) break;
    offset += 1000;
  }
  // Omite registros vacíos (sin nombre): no son inscripciones.
  return datos.filter(r => (r.nombres || '').trim() !== '');
}

function ordenar_(datos) {
  return datos.sort((a, b) => {
    const cursoA = (a.cursoNombre || '').toLowerCase();
    const cursoB = (b.cursoNombre || '').toLowerCase();
    if (cursoA !== cursoB) return cursoA < cursoB ? -1 : 1;
    const fechaA = a.timestamp || '';
    const fechaB = b.timestamp || '';
    if (fechaA !== fechaB) return fechaA < fechaB ? -1 : 1;
    return 0;
  });
}

// ══════════════ ESCRITURA (mismo diseño que la hoja del ciclo 202610) ══════════════

function texto_(valor) {
  if (valor === null || valor === undefined) return '-';
  const t = String(valor).trim();
  return t === '' ? '-' : t;
}

function escribirHoja_(hoja, titulo, datos, hojaOrigen) {
  try {
    if (hoja.getLastRow() > 0) hoja.getDataRange().breakApart();
  } catch (e) { /* sin celdas combinadas */ }
  hoja.clear();

  // Título (fila 1, combinada A1:H1)
  hoja.getRange(1, 1, 1, COLUMNAS.length).merge();
  hoja.getRange(1, 1)
    .setValue(titulo)
    .setFontFamily('Arial')
    .setFontSize(14)
    .setFontWeight('bold')
    .setFontColor('#FFFFFF')
    .setBackground(COLOR_TITULO)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  // Fila 2: separadora en blanco. Encabezados en la fila 3.
  hoja.getRange(3, 1, 1, COLUMNAS.length)
    .setValues([COLUMNAS])
    .setFontFamily('Arial')
    .setFontSize(10)
    .setFontColor('#FFFFFF')
    .setBackground(COLOR_HEADER)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  // Datos desde la fila 4, con filas alternadas.
  const filas = datos.map((d, i) => [
    i + 1,
    texto_(d.nombres),
    texto_(d.dni),
    texto_(d.celular),
    texto_(d.correo),
    texto_(d.lider),
    texto_(d.sede),
    texto_(d.cursoNombre)
  ]);
  if (filas.length > 0) {
    hoja.getRange(4, 1, filas.length, COLUMNAS.length)
      .setValues(filas)
      .setFontFamily('Arial')
      .setFontSize(10)
      .setVerticalAlignment('middle');
    for (let i = 0; i < filas.length; i++) {
      hoja.getRange(4 + i, 1, 1, COLUMNAS.length)
        .setBackground(i % 2 === 0 ? COLOR_PAR : COLOR_IMPAR);
    }
  }

  // Anchos de columna (los mismos del ciclo anterior cuando existen).
  for (let c = 1; c <= COLUMNAS.length; c++) {
    let ancho = ANCHOS_PX[c - 1];
    if (hojaOrigen) {
      try { ancho = hojaOrigen.getColumnWidth(c); } catch (e) { /* usa el ancho base */ }
    }
    hoja.setColumnWidth(c, ancho);
  }

  hoja.setFrozenRows(3);
}

// ══════════════ ACTUALIZACIÓN ══════════════

function actualizarCiclo202620() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaAnterior = prepararHojaAnterior_(ss);
  const hojaActual = obtenerHojaActual_(ss);
  const datos = ordenar_(obtenerInscripciones_(CICLO_ACTUAL));
  escribirHoja_(hojaActual, 'INSCRIPCIONES EDL 2026 - Total: ' + datos.length, datos, hojaAnterior);
  Logger.log('Hoja ' + HOJA_ACTUAL + ' actualizada: ' + datos.length + ' inscripciones.');
}

// Manual: regenera la hoja del ciclo anterior desde Supabase.
// (La hoja queda bloqueada de nuevo al terminar.)
function actualizarCiclo202610() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaAnterior = prepararHojaAnterior_(ss);
  desbloquearHoja_(hojaAnterior);
  const datos = ordenar_(obtenerInscripciones_(CICLO_ANTERIOR));
  escribirHoja_(hojaAnterior, 'INSCRIPCIONES EDL 2026 - Total: ' + datos.length, datos, null);
  bloquearHoja_(hojaAnterior);
  Logger.log('Hoja ' + HOJA_ANTERIOR + ' regenerada: ' + datos.length + ' inscripciones.');
}
