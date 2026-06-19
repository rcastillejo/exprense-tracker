/**
 * gmail-service.gs — Abstracción sobre GmailApp para búsqueda y etiquetado
 */

const GmailService = {
  /**
   * Construye la query de búsqueda incluyendo exclusión de labels ya procesados.
   * @param {Object} bankConfig - Configuración del banco desde CONFIG.bancos
   * @returns {string}
   */
  buildQuery(bankConfig) {
    const exclusions = [
      `-label:${bankConfig.label_procesado}`,
      `-label:${bankConfig.label_error}`
    ].join(' ');
    return `${bankConfig.gmail_query} ${exclusions}`;
  },

  /**
   * Busca emails no procesados para un banco dado.
   * @param {Object} bankConfig
   * @returns {GmailMessage[]}
   */
  searchEmails(bankConfig) {
    const query = this.buildQuery(bankConfig);
    log('INFO', 'Buscando emails', { banco: bankConfig.banco_nombre, query });

    try {
      const threads = GmailApp.search(query, 0, 50);
      const messages = [];

      for (const thread of threads) {
        const msgs = thread.getMessages();
        if (msgs.length > 0) {
          messages.push(msgs[0]);
        }
      }

      log('INFO', 'Emails encontrados', { banco: bankConfig.banco_nombre, count: messages.length });
      return messages;
    } catch (e) {
      log('ERROR', 'Error buscando emails', { banco: bankConfig.banco_nombre, error: e.message });
      return [];
    }
  },

  /**
   * Obtiene el cuerpo del email en texto plano.
   * Usa el cuerpo plain text si está disponible, sino convierte HTML.
   * @param {GmailMessage} message
   * @returns {string}
   */
  getEmailBody(message) {
    try {
      const plainBody = message.getPlainBody();
      if (plainBody && plainBody.trim().length > 0) {
        return plainBody;
      }
      // Fallback: convertir HTML a texto
      const htmlBody = message.getBody();
      return htmlToText(htmlBody);
    } catch (e) {
      log('WARN', 'Error obteniendo cuerpo del email', {
        emailId: message.getId(),
        error: e.message
      });
      return '';
    }
  },

  /**
   * Aplica un label de Gmail al email. Crea el label si no existe.
   * @param {GmailMessage} message
   * @param {string} labelName
   */
  applyLabel(message, labelName) {
    try {
      const label = getOrCreateLabel(labelName);
      message.getThread().addLabel(label);
    } catch (e) {
      log('ERROR', 'Error aplicando label', {
        emailId: message.getId(),
        label: labelName,
        error: e.message
      });
    }
  },

  /**
   * Retorna el ID único del mensaje de Gmail.
   * @param {GmailMessage} message
   * @returns {string}
   */
  getEmailId(message) {
    return message.getId();
  },

  /**
   * Retorna el asunto del mensaje (para logging).
   * @param {GmailMessage} message
   * @returns {string}
   */
  getSubject(message) {
    return message.getSubject();
  }
};
