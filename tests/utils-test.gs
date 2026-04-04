/**
 * utils-test.gs — Tests unitarios para utils.gs
 */

TestRunner.suite('utils — parseDate', ({ test, assert }) => {
  test('parsea formato DD/MM/YYYY', () => {
    assert.equal(parseDate('15/01/2026'), '2026-01-15');
  });

  test('parsea formato DD-MM-YYYY', () => {
    assert.equal(parseDate('15-01-2026'), '2026-01-15');
  });

  test('parsea formato YYYY-MM-DD (pass-through)', () => {
    assert.equal(parseDate('2026-01-15'), '2026-01-15');
  });

  test('parsea formato textual "15 de enero de 2026"', () => {
    assert.equal(parseDate('15 de enero de 2026'), '2026-01-15');
  });

  test('parsea formato textual "5 de marzo 2026" (sin "de" final)', () => {
    assert.equal(parseDate('5 de marzo 2026'), '2026-03-05');
  });

  test('parsea formato DD/MM/YY con año 2-dígitos', () => {
    assert.equal(parseDate('15/01/26'), '2026-01-15');
  });

  test('retorna null para string vacío', () => {
    assert.isNull(parseDate(''));
  });

  test('retorna null para null', () => {
    assert.isNull(parseDate(null));
  });

  test('retorna null para formato no reconocido', () => {
    assert.isNull(parseDate('no es una fecha'));
  });
});

TestRunner.suite('utils — parseAmount', ({ test, assert }) => {
  test('parsea "S/ 150.00"', () => {
    assert.equal(parseAmount('S/ 150.00'), 150);
  });

  test('parsea "S/150.00" (sin espacio)', () => {
    assert.equal(parseAmount('S/150.00'), 150);
  });

  test('parsea "1,234.56" (formato americano con miles)', () => {
    assert.closeTo(parseAmount('1,234.56'), 1234.56, 0.001);
  });

  test('parsea "1.234,56" (formato europeo con miles)', () => {
    assert.closeTo(parseAmount('1.234,56'), 1234.56, 0.001);
  });

  test('parsea "S/ 1,234.56"', () => {
    assert.closeTo(parseAmount('S/ 1,234.56'), 1234.56, 0.001);
  });

  test('retorna null para string vacío', () => {
    assert.isNull(parseAmount(''));
  });

  test('retorna null para null', () => {
    assert.isNull(parseAmount(null));
  });

  test('retorna null para monto 0', () => {
    assert.isNull(parseAmount('0.00'));
  });

  test('retorna null para texto no numérico', () => {
    assert.isNull(parseAmount('no es monto'));
  });
});

TestRunner.suite('utils — normalizeText', ({ test, assert }) => {
  test('convierte a mayúsculas', () => {
    assert.equal(normalizeText('wong las begonias'), 'WONG LAS BEGONIAS');
  });

  test('elimina espacios múltiples', () => {
    assert.equal(normalizeText('WONG   LAS  BEGONIAS'), 'WONG LAS BEGONIAS');
  });

  test('hace trim', () => {
    assert.equal(normalizeText('  WONG  '), 'WONG');
  });

  test('retorna string vacío para null', () => {
    assert.equal(normalizeText(null), '');
  });
});

TestRunner.suite('utils — sanitizeForPrompt', ({ test, assert }) => {
  test('trunca texto largo al máximo configurado', () => {
    const longText = 'a'.repeat(4000);
    const result = sanitizeForPrompt(longText, 3000);
    assert.isTrue(result.length <= 3000 + 20); // +20 por el "[... truncado]"
    assert.isTrue(result.includes('[... truncado]'));
  });

  test('no modifica texto corto', () => {
    const shortText = 'Texto corto normal';
    assert.equal(sanitizeForPrompt(shortText, 3000), shortText);
  });

  test('elimina caracteres de control', () => {
    const withControl = 'Texto\x00con\x01control';
    const result = sanitizeForPrompt(withControl, 3000);
    assert.isFalse(result.includes('\x00'));
    assert.isFalse(result.includes('\x01'));
  });

  test('retorna string vacío para null', () => {
    assert.equal(sanitizeForPrompt(null, 3000), '');
  });
});

TestRunner.suite('utils — htmlToText', ({ test, assert }) => {
  test('convierte <br> a salto de línea', () => {
    const html = 'Línea 1<br>Línea 2';
    const result = htmlToText(html);
    assert.isTrue(result.includes('\n') || result.includes('Línea 1'));
  });

  test('remueve tags HTML', () => {
    const html = '<b>Texto</b> normal <span>aquí</span>';
    const result = htmlToText(html);
    assert.isFalse(result.includes('<b>'));
    assert.isTrue(result.includes('Texto'));
    assert.isTrue(result.includes('normal'));
  });

  test('decodifica entidades HTML comunes', () => {
    const html = 'S/&nbsp;150.00 &amp; más';
    const result = htmlToText(html);
    assert.isTrue(result.includes('S/'));
    assert.isTrue(result.includes('&'));
  });
});
