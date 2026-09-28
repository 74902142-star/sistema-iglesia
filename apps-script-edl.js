// ══════════════════════════════════════════════════════════
// INSCRIPCIONES EDL - Google Apps Script
// Pegar en: Extensiones > Apps Script del Google Sheet
// ══════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://bhuxtunecrqybnlmdspy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_O2I6gdmeKFfxE5J6KO5kcA_2-sADXLy';
const SHEET_NAME = 'Inscripciones EDL';

function actualizarSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
    || SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // 1. Leer inscripciones de Supabase
  const inscripciones = obtenerInscripciones();
  if (inscripciones.length === 0) {
    sheet.getRange('A1').setValue('Sin datos de inscripciones');
    return;
  }

  // 2. Ordenar por Curso, luego por Sede
  inscripciones.sort((a, b) => {
    if (a.curso < b.curso) return -1;
    if (a.curso > b.curso) return 1;
    if (a.sede < b.sede) return -1;
    if (a.sede > b.sede) return 1;
    return 0;
  });

  // 3. Preparar datos
  const headers = ['Nombres', 'DNI', 'Celular', 'Correo', 'Líder', 'Sede', 'Curso', 'Fecha/Horario', 'Estado', 'Monto'];
  const data = inscripciones.map(i => [
    i.nombres || '-',
    i.dni || '-',
    i.celular || '-',
    i.correo || '-',
    i.lider || '-',
    i.sede || '-',
    i.curso || '-',
    i.fechaHorario || '-',
    i.estadoPago || '-',
    i.monto ? 'S/ ' + i.monto : '-'
  ]);

  // 4. Limpiar hoja
  sheet.clear();

  // 5. Título
  const lastCol = headers.length;
  sheet.getRange(1, 1, 1, lastCol).merge();
  const titleRange = sheet.getRange(1, 1);
  titleRange.setValue('INSCRIPCIONES ESCUELA DE LIDERAZGO 2026');
  titleRange.setFontFamily('Arial');
  titleRange.setFontSize(14);
  titleRange.setFontWeight('bold');
  titleRange.setFontColor('#FFFFFF');
  titleRange.setBackground('#00334F');
  titleRange.setHorizontalAlignment('center');
  titleRange.setVerticalAlignment('middle');
  sheet.setRowHeight(1, 40);

  // 6. Subtítulo
  sheet.getRange(2, 1, 1, lastCol).merge();
  const subRange = sheet.getRange(2, 1);
  subRange.setValue('Total: ' + inscripciones.length + ' inscripciones | Actualizado: ' + new Date().toLocaleString('es-PE'));
  subRange.setFontFamily('Arial');
  subRange.setFontSize(10);
  subRange.setFontColor('#64748B');
  subRange.setBackground('#F1F5F9');
  subRange.setHorizontalAlignment('center');
  sheet.setRowHeight(2, 25);

  // 7. Headers
  const headerRange = sheet.getRange(3, 1, 1, lastCol);
  headerRange.setValues([headers]);
  headerRange.setFontFamily('Arial');
  headerRange.setFontSize(10);
  headerRange.setFontWeight('bold');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setBackground('#1C6390');
  headerRange.setHorizontalAlignment('center');
  headerRange.setBorder(true, true, true, true, true, true);
  sheet.setRowHeight(3, 28);

  // 8. Datos
  if (data.length > 0) {
    const dataRange = sheet.getRange(4, 1, data.length, lastCol);
    dataRange.setValues(data);
    dataRange.setFontFamily('Arial');
    dataRange.setFontSize(10);
    dataRange.setBorder(true, true, true, true, true, true);

    // Colores alternados por fila
    for (let i = 0; i < data.length; i++) {
      const rowRange = sheet.getRange(i + 4, 1, 1, lastCol);
      rowRange.setBackground(i % 2 === 0 ? '#FFFFFF' : '#F8FAFC');
      rowRange.setVerticalAlignment('middle');
    }

    // Colores por estado de pago
    for (let i = 0; i < data.length; i++) {
      const estado = data[i][8]; // columna Estado
      const estadoCell = sheet.getRange(i + 4, 9);
      if (estado === 'Canceló') {
        estadoCell.setBackground('#DCFCE7');
        estadoCell.setFontColor('#16A34A');
      } else {
        estadoCell.setBackground('#FEF2F2');
        estadoCell.setFontColor('#DC2626');
      }
    }

    // Filtros automáticos
    sheet.getRange(3, 1, data.length + 1, lastCol).createFilter();
  }

  // 9. Anchos de columna
  sheet.setColumnWidth(1, 280);  // Nombres
  sheet.setColumnWidth(2, 90);   // DNI
  sheet.setColumnWidth(3, 100);  // Celular
  sheet.setColumnWidth(4, 260);  // Correo
  sheet.setColumnWidth(5, 200);  // Líder
  sheet.setColumnWidth(6, 180);  // Sede
  sheet.setColumnWidth(7, 220);  // Curso
  sheet.setColumnWidth(8, 280);  // Fecha/Horario
  sheet.setColumnWidth(9, 90);   // Estado
  sheet.setColumnWidth(10, 80);  // Monto

  // 10. Fijar filas superiores
  sheet.setFrozenRows(3);

  SpreadsheetApp.flush();
  Logger.log('✅ Sheet actualizado: ' + inscripciones.length + ' inscripciones');
}

function obtenerInscripciones() {
  const url = SUPABASE_URL + '/rest/v1/inscripciones?select=*&order=timestamp.desc&limit=1000';
  const options = {
    method: 'get',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const rows = JSON.parse(response.getContentText());
  if (!Array.isArray(rows)) {
    Logger.log('Error Supabase: ' + response.getContentText());
    return [];
  }

  return rows.map(r => ({
    nombres:      r.nombres || '',
    dni:          r.dni || '',
    celular:      r.celular || '',
    correo:       r.correo || '',
    lider:        r.lider || '',
    sede:         r.sede || '',
    curso:        r.cursoNombre || '',
    fechaHorario: r.fechaHorario || '',
    estadoPago:   r.estadoPago || '',
    monto:        r.monto || ''
  }));
}

// ══════════════════════════════════════════════════════════
// TRIGGER: Se ejecuta cada vez que alguien abre el sheet
// ══════════════════════════════════════════════════════════
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔄 Actualizar')
    .addItem('Actualizar desde Supabase', 'actualizarSheet')
    .addToUi();

  // Auto-actualizar al abrir
  actualizarSheet();
}

// ══════════════════════════════════════════════════════════
// TRIGGER TEMPORAL: Actualiza cada 5 minutos (opcional)
// Para activar: Uncomment la función de abajo y crear un
// time-driven trigger desde el editor de Apps Script
// ══════════════════════════════════════════════════════════
/*
function crearTrigger() {
  ScriptApp.newTrigger('actualizarSheet')
    .timeBased()
    .everyMinutes(5)
    .create();
}
*/
