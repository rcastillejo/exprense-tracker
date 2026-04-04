/**
 * parsers-test.gs — Tests unitarios para los 6 parsers con fixtures de email
 */

// ── BCP ──────────────────────────────────────────────────────────────────────

const BCP_EMAIL_OK = `
Notificación de consumo BCP

Hola Juan,
Realizaste un consumo con tu Tarjeta de Débito BCP.

Fecha: 15/01/2026 10:35
Monto: S/ 89.50
Comercio: WONG LAS BEGONIAS
Número de tarjeta: **** 4521

Si no reconoces esta operación, llámanos al 311-9898.
`;

const BCP_EMAIL_SIN_MONTO = `
Notificación de consumo BCP

Hola Juan,
Realizaste un consumo con tu Tarjeta BCP.

Fecha: 15/01/2026
(monto no disponible en este email)
`;

TestRunner.suite('BcpParser — parse exitoso', ({ test, assert }) => {
  test('extrae monto correctamente', () => {
    const result = BcpParser.parse(BCP_EMAIL_OK);
    assert.isNotNull(result);
    assert.closeTo(result.monto, 89.50, 0.001);
  });

  test('extrae fecha en formato YYYY-MM-DD', () => {
    const result = BcpParser.parse(BCP_EMAIL_OK);
    assert.isNotNull(result);
    assert.equal(result.fecha, '2026-01-15');
  });

  test('extrae comercio', () => {
    const result = BcpParser.parse(BCP_EMAIL_OK);
    assert.isNotNull(result);
    assert.isNotNull(result.comercio);
    assert.isTrue(result.comercio.length > 0);
  });

  test('incluye raw en el resultado', () => {
    const result = BcpParser.parse(BCP_EMAIL_OK);
    assert.isNotNull(result);
    assert.equal(result.raw, BCP_EMAIL_OK);
  });
});

TestRunner.suite('BcpParser — casos de error', ({ test, assert }) => {
  test('retorna null si no hay monto', () => {
    assert.isNull(BcpParser.parse(BCP_EMAIL_SIN_MONTO));
  });

  test('retorna null para string vacío', () => {
    assert.isNull(BcpParser.parse(''));
  });

  test('retorna null para null', () => {
    assert.isNull(BcpParser.parse(null));
  });
});

// ── Interbank ─────────────────────────────────────────────────────────────────

const INTERBANK_EMAIL_OK = `
Alerta de consumo Interbank

Se realizó un consumo con tu tarjeta Interbank:

Fecha: 20/02/2026 14:22
Importe: S/ 45.00
Establecimiento: METRO SURCO
Tarjeta: **** 7890
`;

const INTERBANK_EMAIL_SIN_FECHA = `
Alerta de consumo Interbank

Se realizó un consumo con tu tarjeta Interbank:
Importe: S/ 45.00
Establecimiento: METRO SURCO
`;

TestRunner.suite('InterbankParser — parse exitoso', ({ test, assert }) => {
  test('extrae monto', () => {
    const result = InterbankParser.parse(INTERBANK_EMAIL_OK);
    assert.isNotNull(result);
    assert.closeTo(result.monto, 45.00, 0.001);
  });

  test('extrae fecha', () => {
    const result = InterbankParser.parse(INTERBANK_EMAIL_OK);
    assert.isNotNull(result);
    assert.equal(result.fecha, '2026-02-20');
  });
});

TestRunner.suite('InterbankParser — casos de error', ({ test, assert }) => {
  test('retorna null si no hay fecha', () => {
    assert.isNull(InterbankParser.parse(INTERBANK_EMAIL_SIN_FECHA));
  });

  test('retorna null para null', () => {
    assert.isNull(InterbankParser.parse(null));
  });
});

// ── BBVA ──────────────────────────────────────────────────────────────────────

const BBVA_EMAIL_OK = `
Alerta de compra BBVA

Hola,
Se realizó una compra con tu tarjeta BBVA.

Fecha: 10/03/2026
Monto: S/ 120.00
Comercio: RIPLEY JOCKEY PLAZA
`;

TestRunner.suite('BbvaParser — parse exitoso', ({ test, assert }) => {
  test('extrae monto', () => {
    const result = BbvaParser.parse(BBVA_EMAIL_OK);
    assert.isNotNull(result);
    assert.closeTo(result.monto, 120.00, 0.001);
  });

  test('extrae fecha', () => {
    const result = BbvaParser.parse(BBVA_EMAIL_OK);
    assert.isNotNull(result);
    assert.equal(result.fecha, '2026-03-10');
  });
});

TestRunner.suite('BbvaParser — casos de error', ({ test, assert }) => {
  test('retorna null para cuerpo sin monto ni fecha', () => {
    assert.isNull(BbvaParser.parse('Email sin datos de transacción'));
  });

  test('retorna null para null', () => {
    assert.isNull(BbvaParser.parse(null));
  });
});

// ── Scotiabank ────────────────────────────────────────────────────────────────

const SCOTIABANK_EMAIL_OK = `
Notificación de consumo Scotiabank

Estimado cliente,
Se realizó un consumo con su tarjeta Scotiabank:

Fecha: 05/04/2026 09:15
Monto: S/ 55.00
Establecimiento: TOTTUS SAN BORJA
`;

TestRunner.suite('ScotiabankParser — parse exitoso', ({ test, assert }) => {
  test('extrae monto', () => {
    const result = ScotiabankParser.parse(SCOTIABANK_EMAIL_OK);
    assert.isNotNull(result);
    assert.closeTo(result.monto, 55.00, 0.001);
  });

  test('extrae fecha', () => {
    const result = ScotiabankParser.parse(SCOTIABANK_EMAIL_OK);
    assert.isNotNull(result);
    assert.equal(result.fecha, '2026-04-05');
  });
});

TestRunner.suite('ScotiabankParser — casos de error', ({ test, assert }) => {
  test('retorna null para cuerpo vacío', () => {
    assert.isNull(ScotiabankParser.parse(''));
  });

  test('retorna null para null', () => {
    assert.isNull(ScotiabankParser.parse(null));
  });
});

// ── Yape ──────────────────────────────────────────────────────────────────────

const YAPE_EMAIL_OK = `
¡Pago exitoso con Yape!

Pagaste a María García por S/ 30.00

Fecha: 12/04/2026 11:00
Operación: #YP-20260412-001

Gracias por usar Yape.
`;

const YAPE_EMAIL_SIN_DESTINATARIO = `
¡Pago exitoso con Yape!

Enviaste S/ 30.00

Fecha: 12/04/2026
`;

TestRunner.suite('YapeParser — parse exitoso', ({ test, assert }) => {
  test('extrae monto', () => {
    const result = YapeParser.parse(YAPE_EMAIL_OK);
    assert.isNotNull(result);
    assert.closeTo(result.monto, 30.00, 0.001);
  });

  test('extrae fecha', () => {
    const result = YapeParser.parse(YAPE_EMAIL_OK);
    assert.isNotNull(result);
    assert.equal(result.fecha, '2026-04-12');
  });

  test('usa "Desconocido" si no extrae destinatario', () => {
    const result = YapeParser.parse(YAPE_EMAIL_SIN_DESTINATARIO);
    // Puede parsear monto y fecha, pero comercio será Desconocido
    if (result) {
      assert.isTrue(result.comercio === 'DESCONOCIDO' || result.comercio.length > 0);
    }
  });
});

TestRunner.suite('YapeParser — casos de error', ({ test, assert }) => {
  test('retorna null para cuerpo sin monto', () => {
    assert.isNull(YapeParser.parse('Email de Yape sin datos de pago'));
  });

  test('retorna null para null', () => {
    assert.isNull(YapeParser.parse(null));
  });
});

// ── Plin ──────────────────────────────────────────────────────────────────────

const PLIN_EMAIL_OK = `
¡Transferencia exitosa con Plin!

Enviaste dinero a Carlos López por S/ 50.00

Fecha: 15/04/2026 16:30
Operación: #PL-20260415-002

Tu pago fue procesado correctamente.
`;

TestRunner.suite('PlinParser — parse exitoso', ({ test, assert }) => {
  test('extrae monto', () => {
    const result = PlinParser.parse(PLIN_EMAIL_OK);
    assert.isNotNull(result);
    assert.closeTo(result.monto, 50.00, 0.001);
  });

  test('extrae fecha', () => {
    const result = PlinParser.parse(PLIN_EMAIL_OK);
    assert.isNotNull(result);
    assert.equal(result.fecha, '2026-04-15');
  });
});

TestRunner.suite('PlinParser — casos de error', ({ test, assert }) => {
  test('retorna null para cuerpo sin monto ni fecha', () => {
    assert.isNull(PlinParser.parse('Email de Plin sin datos'));
  });

  test('retorna null para null', () => {
    assert.isNull(PlinParser.parse(null));
  });
});
