/**
 * sheets-service.gs — Abstracción sobre SpreadsheetApp para lectura/escritura
 *
 * Columnas (A-K):
 * A: fecha, B: monto, C: comercio, D: banco, E: usuario,
 * F: categoria, G: categorized_by_ai, H: parsed_by_ai,
 * I: status, J: email_id, K: timestamp_ingesta
 */

const SHEET_HEADERS = [
  'fecha', 'monto', 'comercio', 'banco', 'usuario',
  'categoria', 'categorized_by_ai', 'parsed_by_ai',
  'status', 'email_id', 'timestamp_ingesta'
];

// Índice (0-based) de la columna email_id en SHEET_HEADERS
const EMAIL_ID_COL_INDEX = 9;

const SheetsService = {
  /**
   * Obtiene la hoja de gastos, creándola si no existe.
   * @returns {Sheet}
   */
  getSheet() {
    const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
    let sheet = ss.getSheetByName(CONFIG.sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.sheetName);
      log('INFO', 'Hoja creada', { sheetName: CONFIG.sheetName });
    }
    return sheet;
  },

  /**
   * Asegura que la primera fila tenga los headers correctos.
   * Solo escribe si la hoja está vacía.
   */
  ensureHeaders() {
    const sheet = this.getSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(SHEET_HEADERS);
      sheet.getRange(1, 1, 1, SHEET_HEADERS.length).setFontWeight('bold');
      log('INFO', 'Headers creados en hoja', { sheetName: CONFIG.sheetName });
    }
  },

  /**
   * Lee todos los email_ids ya procesados para deduplicación.
   * @returns {Set<string>}
   */
  getProcessedEmailIds() {
    try {
      const sheet = this.getSheet();
      const lastRow = sheet.getLastRow();

      if (lastRow <= 1) {
        return new Set();
      }

      // Columna J (email_id) = columna 10 (1-based)
      const emailIdColNum = EMAIL_ID_COL_INDEX + 1;
      const values = sheet
        .getRange(2, emailIdColNum, lastRow - 1, 1)
        .getValues();

      const ids = new Set();
      for (const [id] of values) {
        if (id) ids.add(String(id));
      }

      log('INFO', 'Email IDs procesados cargados', { count: ids.size });
      return ids;
    } catch (e) {
      log('ERROR', 'Error leyendo email_ids de Sheets', { error: e.message });
      return new Set();
    }
  },

  /**
   * Agrega una fila de gasto a la hoja.
   * @param {Object} row - Objeto con los campos del gasto
   * @param {string} row.fecha
   * @param {number} row.monto
   * @param {string} row.comercio
   * @param {string} row.banco
   * @param {string} row.usuario
   * @param {string} row.categoria
   * @param {boolean} row.categorized_by_ai
   * @param {boolean} row.parsed_by_ai
   * @param {string} row.status
   * @param {string} row.email_id
   * @param {string} row.timestamp_ingesta
   */
  appendRow(row) {
    try {
      const sheet = this.getSheet();
      sheet.appendRow([
        row.fecha || '',
        row.monto || 0,
        row.comercio || '',
        row.banco || '',
        row.usuario || CONFIG.usuario,
        row.categoria || 'Sin categorizar',
        row.categorized_by_ai || false,
        row.parsed_by_ai || false,
        row.status || 'ok',
        row.email_id || '',
        row.timestamp_ingesta || getNowLima()
      ]);
    } catch (e) {
      log('ERROR', 'Error escribiendo fila en Sheets', {
        email_id: row.email_id,
        error: e.message
      });
      throw e;
    }
  }
};
