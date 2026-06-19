/**
 * main-test.gs — Tests de integración del orquestador main.gs
 */

TestRunner.suite('ParserRegistry — getParser', ({ test, assert }) => {
  test('retorna BcpParser para clave "bcp"', () => {
    const parser = ParserRegistry.getParser('bcp');
    assert.isNotNull(parser);
    assert.isNotNull(parser.parse);
  });

  test('retorna InterbankParser para clave "interbank"', () => {
    const parser = ParserRegistry.getParser('interbank');
    assert.isNotNull(parser);
  });

  test('retorna BbvaParser para clave "bbva"', () => {
    assert.isNotNull(ParserRegistry.getParser('bbva'));
  });

  test('retorna ScotiabankParser para clave "scotiabank"', () => {
    assert.isNotNull(ParserRegistry.getParser('scotiabank'));
  });

  test('retorna YapeParser para clave "yape"', () => {
    assert.isNotNull(ParserRegistry.getParser('yape'));
  });

  test('retorna PlinParser para clave "plin"', () => {
    assert.isNotNull(ParserRegistry.getParser('plin'));
  });

  test('retorna null para banco desconocido', () => {
    assert.isNull(ParserRegistry.getParser('banco_desconocido'));
  });
});

TestRunner.suite('CONFIG — estructura', ({ test, assert }) => {
  test('CONFIG tiene todos los bancos definidos', () => {
    const bancos = Object.keys(CONFIG.bancos);
    assert.isTrue(bancos.includes('bcp'));
    assert.isTrue(bancos.includes('interbank'));
    assert.isTrue(bancos.includes('bbva'));
    assert.isTrue(bancos.includes('scotiabank'));
    assert.isTrue(bancos.includes('yape'));
    assert.isTrue(bancos.includes('plin'));
  });

  test('cada banco tiene los campos requeridos', () => {
    const requiredFields = [
      'enabled', 'banco_nombre', 'gmail_query',
      'label_procesado', 'label_error', 'parser', 'fallback_ai'
    ];
    for (const [key, banco] of Object.entries(CONFIG.bancos)) {
      for (const field of requiredFields) {
        if (banco[field] === undefined) {
          throw new Error(`Banco ${key} falta campo: ${field}`);
        }
      }
    }
  });

  test('CONFIG tiene las 12 categorías definidas', () => {
    assert.equal(CONFIG.categorias.length, 12);
    assert.isTrue(CONFIG.categorias.includes('Supermercado'));
    assert.isTrue(CONFIG.categorias.includes('Transferencia'));
    assert.isTrue(CONFIG.categorias.includes('Otro'));
  });

  test('maxExecutionMs está configurado', () => {
    assert.isTrue(CONFIG.maxExecutionMs > 0);
    assert.isTrue(CONFIG.maxExecutionMs <= 360000); // máximo 6 min
  });

  test('claudeModel está configurado', () => {
    assert.isNotNull(CONFIG.claudeModel);
    assert.isTrue(CONFIG.claudeModel.length > 0);
  });
});

TestRunner.suite('main — _processEmail integración con mocks', ({ test, assert }) => {
  // Test de integración: parseo exitoso → categorización → escritura en Sheets
  test('flujo completo: parseo OK → escribe fila con status "ok"', () => {
    // Preparar mocks
    const writtenRows = [];
    const origAppendRow = SheetsService.appendRow;
    SheetsService.appendRow = (row) => { writtenRows.push(row); };

    const origApplyLabel = GmailService.applyLabel;
    const appliedLabels = [];
    GmailService.applyLabel = (msg, label) => { appliedLabels.push(label); };

    // Mock de ClaudeService.categorize (sin llamada real)
    const origCategorize = ClaudeService.categorize;
    ClaudeService.categorize = () => ({ categoria: 'Supermercado', categorized_by_ai: true });

    const mockEmail = {
      getId: () => 'test-email-id',
      getSubject: () => 'Consumo BCP',
      getPlainBody: () => `
Consumo con tu Tarjeta BCP
Fecha: 15/01/2026 10:00
Monto: S/ 89.50
Comercio: WONG LAS BEGONIAS
      `,
      getBody: () => '',
      getThread: () => ({ addLabel: () => {} })
    };

    const bcpConfig = CONFIG.bancos.bcp;

    try {
      const result = _processEmail(mockEmail, 'test-email-id', bcpConfig);
      assert.isTrue(result.success);
      assert.equal(writtenRows.length, 1);
      assert.equal(writtenRows[0].status, 'ok');
      assert.equal(writtenRows[0].banco, 'BCP');
      assert.equal(writtenRows[0].email_id, 'test-email-id');
    } finally {
      SheetsService.appendRow = origAppendRow;
      GmailService.applyLabel = origApplyLabel;
      ClaudeService.categorize = origCategorize;
    }
  });

  test('flujo: parseo fallido → registra status "parse_error"', () => {
    const writtenRows = [];
    const origAppendRow = SheetsService.appendRow;
    SheetsService.appendRow = (row) => { writtenRows.push(row); };

    const origApplyLabel = GmailService.applyLabel;
    GmailService.applyLabel = () => {};

    const mockEmail = {
      getId: () => 'test-email-bad',
      getSubject: () => 'Email sin datos bancarios',
      getPlainBody: () => 'Este email no tiene datos de transacción bancaria',
      getBody: () => '',
      getThread: () => ({ addLabel: () => {} })
    };

    // BCP con fallback_ai=false para simplificar el test
    const testConfig = { ...CONFIG.bancos.bcp, fallback_ai: false };

    try {
      const result = _processEmail(mockEmail, 'test-email-bad', testConfig);
      assert.isFalse(result.success);
      assert.equal(writtenRows.length, 1);
      assert.equal(writtenRows[0].status, 'parse_error');
    } finally {
      SheetsService.appendRow = origAppendRow;
      GmailService.applyLabel = origApplyLabel;
    }
  });
});
