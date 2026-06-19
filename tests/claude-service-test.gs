/**
 * claude-service-test.gs — Tests para ClaudeService con mock de UrlFetchApp
 *
 * IMPORTANTE: Estos tests mockean UrlFetchApp para no hacer llamadas reales a Claude API.
 * Los mocks se restauran al final de cada test.
 */

/**
 * Mock de UrlFetchApp para tests.
 * Reemplaza temporalmente UrlFetchApp.fetch con una función configurable.
 */
function withMockFetch(mockResponse, fn) {
  const original = UrlFetchApp.fetch;
  UrlFetchApp.fetch = () => ({
    getResponseCode: () => mockResponse.status || 200,
    getContentText: () => JSON.stringify(mockResponse.body || {})
  });
  try {
    fn();
  } finally {
    UrlFetchApp.fetch = original;
  }
}

function makeClaudeResponse(text) {
  return {
    status: 200,
    body: {
      content: [{ type: 'text', text }]
    }
  };
}

TestRunner.suite('ClaudeService — categorize', ({ test, assert }) => {
  test('retorna categoría válida cuando Claude responde correctamente', () => {
    withMockFetch(makeClaudeResponse('Supermercado'), () => {
      // Temporalmente proveer una API key para el test
      const origGet = PropertiesService.getScriptProperties().getProperty;
      PropertiesService.getScriptProperties().getProperty = (key) => {
        if (key === 'CLAUDE_API_KEY') return 'test-key-mock';
        return origGet.call(PropertiesService.getScriptProperties(), key);
      };

      const result = ClaudeService.categorize('WONG LAS BEGONIAS', 89.50, 'BCP');
      assert.equal(result.categoria, 'Supermercado');
      assert.isTrue(result.categorized_by_ai);

      PropertiesService.getScriptProperties().getProperty = origGet;
    });
  });

  test('retorna "Otro" cuando Claude responde con categoría no válida', () => {
    withMockFetch(makeClaudeResponse('CategoriaInventada'), () => {
      const origGet = PropertiesService.getScriptProperties().getProperty;
      PropertiesService.getScriptProperties().getProperty = (key) =>
        key === 'CLAUDE_API_KEY' ? 'test-key-mock' : origGet.call(PropertiesService.getScriptProperties(), key);

      const result = ClaudeService.categorize('COMERCIO X', 100, 'BCP');
      assert.equal(result.categoria, 'Otro');
      assert.isTrue(result.categorized_by_ai);

      PropertiesService.getScriptProperties().getProperty = origGet;
    });
  });

  test('retorna "Sin categorizar" cuando Claude API falla (error HTTP)', () => {
    withMockFetch({ status: 500, body: { error: 'internal error' } }, () => {
      const origGet = PropertiesService.getScriptProperties().getProperty;
      PropertiesService.getScriptProperties().getProperty = (key) =>
        key === 'CLAUDE_API_KEY' ? 'test-key-mock' : origGet.call(PropertiesService.getScriptProperties(), key);

      const result = ClaudeService.categorize('COMERCIO X', 100, 'BCP');
      assert.equal(result.categoria, 'Sin categorizar');
      assert.isFalse(result.categorized_by_ai);

      PropertiesService.getScriptProperties().getProperty = origGet;
    });
  });

  test('retorna "Sin categorizar" cuando no hay API key', () => {
    const origGet = PropertiesService.getScriptProperties().getProperty;
    PropertiesService.getScriptProperties().getProperty = (key) =>
      key === 'CLAUDE_API_KEY' ? null : origGet.call(PropertiesService.getScriptProperties(), key);

    const result = ClaudeService.categorize('COMERCIO X', 100, 'BCP');
    assert.equal(result.categoria, 'Sin categorizar');
    assert.isFalse(result.categorized_by_ai);

    PropertiesService.getScriptProperties().getProperty = origGet;
  });
});

TestRunner.suite('ClaudeService — parseWithAI', ({ test, assert }) => {
  const validAiParseBody = '{"fecha": "2026-01-15", "monto": 89.50, "comercio": "WONG"}';

  test('retorna datos parseados cuando Claude responde con JSON válido', () => {
    withMockFetch(makeClaudeResponse(validAiParseBody), () => {
      const origGet = PropertiesService.getScriptProperties().getProperty;
      PropertiesService.getScriptProperties().getProperty = (key) =>
        key === 'CLAUDE_API_KEY' ? 'test-key-mock' : origGet.call(PropertiesService.getScriptProperties(), key);

      const result = ClaudeService.parseWithAI('cuerpo de email', 'BCP');
      assert.isNotNull(result);
      assert.equal(result.fecha, '2026-01-15');
      assert.closeTo(result.monto, 89.50, 0.001);
      assert.isTrue(result.parsed_by_ai);

      PropertiesService.getScriptProperties().getProperty = origGet;
    });
  });

  test('retorna null cuando Claude responde con JSON incompleto (sin monto)', () => {
    withMockFetch(makeClaudeResponse('{"fecha": "2026-01-15", "monto": null, "comercio": "WONG"}'), () => {
      const origGet = PropertiesService.getScriptProperties().getProperty;
      PropertiesService.getScriptProperties().getProperty = (key) =>
        key === 'CLAUDE_API_KEY' ? 'test-key-mock' : origGet.call(PropertiesService.getScriptProperties(), key);

      const result = ClaudeService.parseWithAI('cuerpo de email', 'BCP');
      assert.isNull(result);

      PropertiesService.getScriptProperties().getProperty = origGet;
    });
  });

  test('retorna null cuando Claude responde con texto no-JSON', () => {
    withMockFetch(makeClaudeResponse('No pude extraer los datos del email.'), () => {
      const origGet = PropertiesService.getScriptProperties().getProperty;
      PropertiesService.getScriptProperties().getProperty = (key) =>
        key === 'CLAUDE_API_KEY' ? 'test-key-mock' : origGet.call(PropertiesService.getScriptProperties(), key);

      const result = ClaudeService.parseWithAI('cuerpo de email', 'BCP');
      assert.isNull(result);

      PropertiesService.getScriptProperties().getProperty = origGet;
    });
  });

  test('retorna null cuando API devuelve error 429', () => {
    withMockFetch({ status: 429, body: { error: 'rate limit' } }, () => {
      const origGet = PropertiesService.getScriptProperties().getProperty;
      PropertiesService.getScriptProperties().getProperty = (key) =>
        key === 'CLAUDE_API_KEY' ? 'test-key-mock' : origGet.call(PropertiesService.getScriptProperties(), key);

      const result = ClaudeService.parseWithAI('cuerpo de email', 'BCP');
      assert.isNull(result);

      PropertiesService.getScriptProperties().getProperty = origGet;
    });
  });
});
