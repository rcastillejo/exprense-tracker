/**
 * sheets-service-test.gs — Tests para SheetsService con mock de SpreadsheetApp
 */

/**
 * Crea un mock de la hoja de cálculo con datos dados.
 * @param {Array[]} rows - Filas de datos (sin header)
 * @returns {Object} Mock de Sheet
 */
function makeMockSheet(rows) {
  const allRows = [SHEET_HEADERS, ...rows];
  const appendedRows = [];

  return {
    getLastRow: () => allRows.length,
    getRange: (row, col, numRows, numCols) => ({
      getValues: () => {
        const result = [];
        for (let r = row - 1; r < row - 1 + numRows; r++) {
          const rowData = allRows[r] || [];
          const colData = [];
          for (let c = col - 1; c < col - 1 + numCols; c++) {
            colData.push(rowData[c] !== undefined ? rowData[c] : '');
          }
          result.push(colData);
        }
        return result;
      }
    }),
    appendRow: (row) => { appendedRows.push(row); allRows.push(row); },
    setFontWeight: () => {},
    _appendedRows: appendedRows
  };
}

/**
 * Inyecta un mock de SpreadsheetApp para la duración de fn().
 */
function withMockSpreadsheet(mockSheet, fn) {
  const original = SpreadsheetApp.openById;
  SpreadsheetApp.openById = () => ({
    getSheetByName: () => mockSheet,
    insertSheet: () => mockSheet
  });
  try {
    fn(mockSheet);
  } finally {
    SpreadsheetApp.openById = original;
  }
}

TestRunner.suite('SheetsService — getProcessedEmailIds', ({ test, assert }) => {
  test('retorna Set vacío cuando la hoja tiene solo headers', () => {
    const sheet = makeMockSheet([]);
    withMockSpreadsheet(sheet, () => {
      const ids = SheetsService.getProcessedEmailIds();
      assert.equal(ids.size, 0);
    });
  });

  test('retorna IDs de emails ya procesados', () => {
    const sheet = makeMockSheet([
      ['2026-01-15', 89.50, 'WONG', 'BCP', 'usuario1', 'Supermercado',
       true, false, 'ok', 'email-id-001', '2026-01-15T10:00:00-05:00'],
      ['2026-01-16', 45.00, 'METRO', 'Interbank', 'usuario1', 'Supermercado',
       true, false, 'ok', 'email-id-002', '2026-01-16T11:00:00-05:00']
    ]);
    withMockSpreadsheet(sheet, () => {
      const ids = SheetsService.getProcessedEmailIds();
      assert.equal(ids.size, 2);
      assert.isTrue(ids.has('email-id-001'));
      assert.isTrue(ids.has('email-id-002'));
      assert.isFalse(ids.has('email-id-999'));
    });
  });
});

TestRunner.suite('SheetsService — appendRow', ({ test, assert }) => {
  test('escribe una fila con todos los campos correctos', () => {
    const sheet = makeMockSheet([]);
    withMockSpreadsheet(sheet, () => {
      SheetsService.appendRow({
        fecha: '2026-01-15',
        monto: 89.50,
        comercio: 'WONG LAS BEGONIAS',
        banco: 'BCP',
        usuario: 'usuario1',
        categoria: 'Supermercado',
        categorized_by_ai: true,
        parsed_by_ai: false,
        status: 'ok',
        email_id: 'email-id-123',
        timestamp_ingesta: '2026-01-15T10:00:00-05:00'
      });

      const written = sheet._appendedRows[0];
      assert.equal(written[0], '2026-01-15');      // fecha
      assert.equal(written[1], 89.50);              // monto
      assert.equal(written[2], 'WONG LAS BEGONIAS'); // comercio
      assert.equal(written[3], 'BCP');               // banco
      assert.equal(written[4], 'usuario1');           // usuario
      assert.equal(written[5], 'Supermercado');       // categoria
      assert.isTrue(written[6]);                     // categorized_by_ai
      assert.isFalse(written[7]);                    // parsed_by_ai
      assert.equal(written[8], 'ok');                // status
      assert.equal(written[9], 'email-id-123');      // email_id
    });
  });

  test('usa "Sin categorizar" como default de categoria', () => {
    const sheet = makeMockSheet([]);
    withMockSpreadsheet(sheet, () => {
      SheetsService.appendRow({
        fecha: '2026-01-15',
        monto: 89.50,
        comercio: 'WONG',
        banco: 'BCP',
        email_id: 'test-id'
      });
      const written = sheet._appendedRows[0];
      assert.equal(written[5], 'Sin categorizar');
    });
  });

  test('usa "ok" como default de status', () => {
    const sheet = makeMockSheet([]);
    withMockSpreadsheet(sheet, () => {
      SheetsService.appendRow({
        fecha: '2026-01-15',
        monto: 89.50,
        comercio: 'WONG',
        banco: 'BCP',
        email_id: 'test-id'
      });
      const written = sheet._appendedRows[0];
      assert.equal(written[8], 'ok');
    });
  });
});

TestRunner.suite('SheetsService — ensureHeaders', ({ test, assert }) => {
  test('crea headers cuando la hoja está vacía', () => {
    const emptySheet = {
      getLastRow: () => 0,
      getRange: () => ({ setFontWeight: () => {} }),
      appendRow: (row) => { emptySheet._headerRow = row; }
    };
    withMockSpreadsheet(emptySheet, () => {
      SheetsService.ensureHeaders();
      assert.isNotNull(emptySheet._headerRow);
      assert.equal(emptySheet._headerRow[0], 'fecha');
      assert.equal(emptySheet._headerRow[9], 'email_id');
    });
  });

  test('no modifica hoja que ya tiene headers', () => {
    let appendCalled = false;
    const sheetWithHeaders = {
      getLastRow: () => 5,
      appendRow: () => { appendCalled = true; }
    };
    withMockSpreadsheet(sheetWithHeaders, () => {
      SheetsService.ensureHeaders();
      assert.isFalse(appendCalled);
    });
  });
});
