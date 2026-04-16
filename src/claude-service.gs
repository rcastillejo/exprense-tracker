/**
 * claude-service.gs — Cliente de Claude API para categorización y parseo fallback
 */

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_API_VERSION = '2023-06-01';
const CLAUDE_TIMEOUT_MS = 30000;

const ClaudeService = {
  /**
   * Llama a Claude API con el prompt dado.
   * @param {string} prompt
   * @returns {string|null} Respuesta de texto o null si hubo error
   */
  _call(prompt) {
    const apiKey = CONFIG.claudeApiKey;
    if (!apiKey) {
      log('ERROR', 'CLAUDE_API_KEY no configurada en PropertiesService');
      return null;
    }

    const payload = {
      model: CONFIG.claudeModel,
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }]
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': CLAUDE_API_VERSION
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      timeout: CLAUDE_TIMEOUT_MS
    };

    try {
      const response = UrlFetchApp.fetch(CLAUDE_API_URL, options);
      const code = response.getResponseCode();

      if (code !== 200) {
        log('WARN', 'Claude API error HTTP', { status: code });
        return null;
      }

      const body = JSON.parse(response.getContentText());
      const text = body?.content?.[0]?.text;
      return text ? text.trim() : null;
    } catch (e) {
      log('ERROR', 'Error llamando Claude API', { error: e.message });
      return null;
    }
  },

  /**
   * Categoriza un gasto usando Claude API.
   * @param {string} comercio - Nombre del comercio
   * @param {number} monto - Monto en soles
   * @param {string} banco - Nombre del banco
   * @returns {{categoria: string, categorized_by_ai: boolean}}
   */
  categorize(comercio, monto, banco) {
    const categorias = CONFIG.categorias.join(', ');
    const prompt =
      `Clasifica este gasto en una sola categoría de la lista.\n` +
      `Comercio: ${comercio}\n` +
      `Monto: S/ ${monto}\n` +
      `Banco: ${banco}\n` +
      `Categorías válidas: ${categorias}\n` +
      `Responde SOLO con el nombre de la categoría, sin explicación.`;

    const response = this._call(prompt);

    if (!response) {
      return { categoria: 'Sin categorizar', categorized_by_ai: false };
    }

    // Validar que la respuesta es una categoría válida
    const categoriaLimpia = response.split('\n')[0].trim();
    const esValida = CONFIG.categorias.some(
      (c) => c.toLowerCase() === categoriaLimpia.toLowerCase()
    );

    const categoria = esValida ? categoriaLimpia : 'Otro';
    return { categoria, categorized_by_ai: true };
  },

  /**
   * Intenta parsear un email con Claude API como fallback.
   * @param {string} emailBody - Cuerpo del email
   * @param {string} banco - Nombre del banco para contexto
   * @returns {{fecha: string, monto: number, comercio: string, parsed_by_ai: boolean}|null}
   */
  parseWithAI(emailBody, banco) {
    const safeBody = sanitizeForPrompt(emailBody);
    const prompt =
      `Extrae los datos de gasto de este email bancario peruano.\n` +
      `Banco: ${banco}\n` +
      `Email:\n${safeBody}\n\n` +
      `Responde en JSON con exactamente estos campos:\n` +
      `{"fecha": "YYYY-MM-DD", "monto": number, "comercio": "string"}\n` +
      `Si no puedes extraer algún campo, responde null como valor del campo.\n` +
      `Responde SOLO el JSON, sin texto adicional.`;

    const response = this._call(prompt);

    if (!response) return null;

    try {
      // Extraer JSON de la respuesta (puede haber texto antes/después)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.monto || !parsed.fecha) return null;

      return {
        fecha: parseDate(parsed.fecha) || parsed.fecha,
        monto: parseAmount(String(parsed.monto)) || parsed.monto,
        comercio: normalizeText(parsed.comercio || 'Desconocido'),
        parsed_by_ai: true
      };
    } catch (e) {
      log('WARN', 'No se pudo parsear respuesta JSON de Claude', { error: e.message });
      return null;
    }
  }
};
