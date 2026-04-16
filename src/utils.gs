/**
 * utils.gs — Funciones helper reutilizables
 */

const MESES_ES = {
  enero: '01', febrero: '02', marzo: '03', abril: '04',
  mayo: '05', junio: '06', julio: '07', agosto: '08',
  septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12'
};

/**
 * Parsea una cadena de fecha a formato YYYY-MM-DD.
 * Soporta: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, "15 de enero de 2026"
 * @param {string} str
 * @returns {string|null} YYYY-MM-DD o null si no puede parsear
 */
function parseDate(str) {
  if (!str) return null;
  const s = str.trim();

  // YYYY-MM-DD
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;

  // DD/MM/YYYY o DD-MM-YYYY
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // "15 de enero de 2026" o "15 enero 2026"
  m = s.match(/(\d{1,2})\s+(?:de\s+)?([a-záéíóúü]+)(?:\s+de)?\s+(\d{4})/i);
  if (m) {
    const [, d, mesStr, y] = m;
    const mes = MESES_ES[mesStr.toLowerCase()];
    if (mes) return `${y}-${mes}-${d.padStart(2, '0')}`;
  }

  // DD/MM/YY
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (m) {
    const [, d, mo, y] = m;
    const year = parseInt(y) < 50 ? `20${y}` : `19${y}`;
    return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return null;
}

/**
 * Parsea una cadena de monto a número.
 * Soporta: "S/ 1,234.56", "S/1234.56", "1.234,56", "1234.56", "USD 25.00"
 * @param {string} str
 * @returns {number|null}
 */
function parseAmount(str) {
  if (!str) return null;

  // Quitar símbolo de moneda y espacios
  let s = str.replace(/S\/\s*/i, '').replace(/USD\s*/i, '').replace(/PEN\s*/i, '').trim();

  // Detectar formato europeo: 1.234,56
  if (/^\d{1,3}(\.\d{3})+(,\d{2})?$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    // Formato americano: 1,234.56 — quitar comas de miles
    s = s.replace(/,/g, '');
  }

  const n = parseFloat(s);
  if (isNaN(n) || n <= 0) return null;
  return n;
}

/**
 * Normaliza texto: trim, colapsa espacios múltiples, mayúsculas.
 * @param {string} str
 * @returns {string}
 */
function normalizeText(str) {
  if (!str) return '';
  return str.trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Sanitiza el cuerpo del email para enviar a Claude API.
 * Remueve caracteres de control y trunca a maxChars.
 * @param {string} str
 * @param {number} [maxChars]
 * @returns {string}
 */
function sanitizeForPrompt(str, maxChars) {
  if (!str) return '';
  const max = maxChars || CONFIG.maxEmailBodyChars;
  // Remover caracteres de control excepto \n y \t
  let s = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');
  // Colapsar líneas en blanco múltiples
  s = s.replace(/\n{3,}/g, '\n\n');
  // Truncar
  if (s.length > max) {
    s = s.substring(0, max) + '\n[... truncado]';
  }
  return s;
}

/**
 * Extrae texto plano de un cuerpo HTML (naive, para fallback).
 * @param {string} html
 * @returns {string}
 */
function htmlToText(html) {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Retorna timestamp actual en zona horaria America/Lima (UTC-5).
 * @returns {string} ISO 8601
 */
function getNowLima() {
  const now = new Date();
  // Lima es UTC-5 sin horario de verano
  const limaOffset = -5 * 60;
  const utcOffset = now.getTimezoneOffset();
  const limaMs = now.getTime() + (utcOffset + limaOffset) * 60 * 1000;
  const lima = new Date(limaMs);

  const pad = (n) => String(n).padStart(2, '0');
  return `${lima.getFullYear()}-${pad(lima.getMonth() + 1)}-${pad(lima.getDate())}T` +
         `${pad(lima.getHours())}:${pad(lima.getMinutes())}:${pad(lima.getSeconds())}-05:00`;
}

/**
 * Logger que omite cuerpos de email para proteger datos sensibles.
 * @param {'INFO'|'WARN'|'ERROR'} level
 * @param {string} message
 * @param {Object} [data]
 */
function log(level, message, data) {
  const ts = getNowLima();
  const safe = data ? JSON.stringify(data) : '';
  console.log(`[${ts}] [${level}] ${message} ${safe}`);
}

/**
 * Obtiene o crea un label de Gmail por nombre.
 * @param {string} labelName
 * @returns {GmailLabel}
 */
function getOrCreateLabel(labelName) {
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    label = GmailApp.createLabel(labelName);
  }
  return label;
}
