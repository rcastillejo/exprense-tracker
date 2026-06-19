/**
 * bcp-parser.gs — Parser para emails de BCP
 *
 * Formatos reconocidos:
 * - "Consumo con tu Tarjeta de Débito/Crédito BCP"
 * - Monto: "S/ 150.00" o "S/150.00"
 * - Fecha: "15/01/2026" o "15 de enero de 2026"
 * - Comercio: texto en mayúsculas tras "en " o "Comercio:"
 */

const BcpParser = {
  /**
   * Parsea el cuerpo de un email de BCP.
   * @param {string} body - Cuerpo del email en texto plano
   * @returns {{fecha: string, monto: number, comercio: string, raw: string}|null}
   */
  parse(body) {
    if (!body) return null;

    const monto = this._extractMonto(body);
    const fecha = this._extractFecha(body);
    const comercio = this._extractComercio(body);

    if (!monto || !fecha) return null;

    return {
      fecha,
      monto,
      comercio: comercio || 'Desconocido',
      raw: body
    };
  },

  _extractMonto(body) {
    // Patrones: "S/ 1,234.56", "S/1234.56", "S/ 150.00"
    const patterns = [
      /[Ss]\/\s*([\d,]+\.?\d{0,2})/,
      /[Mm]onto[:\s]+S\/\s*([\d,]+\.?\d{0,2})/i,
      /[Ii]mporte[:\s]+S\/\s*([\d,]+\.?\d{0,2})/i,
      /[Cc]onsumaste\s+S\/\s*([\d,]+\.?\d{0,2})/i
    ];

    for (const pattern of patterns) {
      const m = body.match(pattern);
      if (m) {
        const amount = parseAmount(m[1]);
        if (amount) return amount;
      }
    }
    return null;
  },

  _extractFecha(body) {
    const patterns = [
      /[Ff]echa[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/,
      /[Ff]echa[:\s]+(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/i,
      /(\d{2}\/\d{2}\/\d{4})\s+\d{2}:\d{2}/,
      /(\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?\d{4})/i
    ];

    for (const pattern of patterns) {
      const m = body.match(pattern);
      if (m) {
        const date = parseDate(m[1]);
        if (date) return date;
      }
    }
    return null;
  },

  _extractComercio(body) {
    const patterns = [
      /[Ee]n\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s\.\-&']{2,50}?)(?:\s*\n|\s{2,}|$)/m,
      /[Cc]omercio[:\s]+([^\n]{2,60})/i,
      /[Ee]stablecimiento[:\s]+([^\n]{2,60})/i,
      /[Ll]ugar[:\s]+([^\n]{2,60})/i
    ];

    for (const pattern of patterns) {
      const m = body.match(pattern);
      if (m) {
        const comercio = normalizeText(m[1]);
        if (comercio.length >= 2) return comercio;
      }
    }
    return null;
  }
};
