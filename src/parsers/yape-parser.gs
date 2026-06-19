/**
 * yape-parser.gs — Parser para emails de Yape
 *
 * Formatos reconocidos:
 * - "Realizaste un pago a [Nombre] por S/ [monto]"
 * - Fecha: DD/MM/YYYY o textual en el cuerpo
 */

const YapeParser = {
  /**
   * Parsea el cuerpo de un email de Yape.
   * @param {string} body
   * @returns {{fecha: string, monto: number, comercio: string, raw: string}|null}
   */
  parse(body) {
    if (!body) return null;

    const monto = this._extractMonto(body);
    const fecha = this._extractFecha(body);
    const comercio = this._extractDestinatario(body);

    if (!monto || !fecha) return null;

    return {
      fecha,
      monto,
      comercio: comercio || 'Desconocido',
      raw: body
    };
  },

  _extractMonto(body) {
    const patterns = [
      /por\s+S\/\s*([\d,]+\.?\d{0,2})/i,
      /[Ss]\/\s*([\d,]+\.?\d{0,2})/,
      /[Mm]onto[:\s]+S\/\s*([\d,]+\.?\d{0,2})/i,
      /[Pp]agaste\s+S\/\s*([\d,]+\.?\d{0,2})/i
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
      /(\d{2}\/\d{2}\/\d{4})\s+\d{2}:\d{2}/,
      /(\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?\d{4})/i,
      /(\d{2}\/\d{2}\/\d{4})/
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

  _extractDestinatario(body) {
    const patterns = [
      /[Pp]agaste\s+a\s+([^\n\r]{2,50}?)(?:\s+por\s+S\/|\s*\n)/i,
      /[Pp]ago\s+a\s+([^\n\r]{2,50}?)(?:\s+por\s+S\/|\s*\n)/i,
      /[Rr]ealizaste\s+un\s+pago\s+a\s+([^\n\r]{2,50}?)(?:\s+por\s+S\/|\s*\n)/i,
      /[Pp]ara[:\s]+([^\n\r]{2,50}?)(?:\s*\n|\s+[Ss]\/)/i
    ];

    for (const pattern of patterns) {
      const m = body.match(pattern);
      if (m) {
        const dest = normalizeText(m[1]);
        if (dest.length >= 2) return dest;
      }
    }
    return null;
  }
};
