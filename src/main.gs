/**
 * main.gs — Orquestador principal del pipeline de ingesta de emails
 *
 * Punto de entrada para el trigger diario de Apps Script.
 * Ejecutar main() desde el trigger de Apps Script.
 *
 * SETUP DEL TRIGGER:
 * Para configurar el trigger automático, ejecutar setupDailyTrigger() una vez.
 */

/**
 * Registro de parsers por clave de banco.
 */
const ParserRegistry = {
  bcp: BcpParser,
  interbank: InterbankParser,
  bbva: BbvaParser,
  scotiabank: ScotiabankParser,
  yape: YapeParser,
  plin: PlinParser,

  /**
   * Retorna el parser para el banco dado.
   * @param {string} bancoKey - Clave del banco (ej. "bcp")
   * @returns {Object|null}
   */
  getParser(bancoKey) {
    return this[bancoKey] || null;
  }
};

/**
 * Entry point principal del pipeline.
 * Puede ser llamado manualmente o por un trigger diario de Apps Script.
 */
function main() {
  const startTime = Date.now();
  log('INFO', '=== Pipeline iniciado ===', { usuario: CONFIG.usuario });

  // Contadores para resumen final
  const stats = {
    procesados: 0,
    errores: 0,
    deduplicados: 0,
    bancoStats: {}
  };

  // Verificar configuración mínima
  if (CONFIG.spreadsheetId === 'SHEET_ID_AQUI') {
    log('ERROR', 'CONFIG.spreadsheetId no configurado. Actualizar config.gs antes de ejecutar.');
    return;
  }

  if (!CONFIG.claudeApiKey) {
    log('WARN', 'CLAUDE_API_KEY no encontrada en PropertiesService. Categorización y fallback AI desactivados.');
  }

  // Asegurar headers en la hoja
  try {
    SheetsService.ensureHeaders();
  } catch (e) {
    log('ERROR', 'No se pudo acceder a Google Sheets. Abortando.', { error: e.message });
    return;
  }

  // Cargar IDs de emails ya procesados (deduplicación secundaria)
  const processedIds = SheetsService.getProcessedEmailIds();

  // Procesar cada banco habilitado
  for (const [bancoKey, bankConfig] of Object.entries(CONFIG.bancos)) {
    if (!bankConfig.enabled) {
      log('INFO', 'Banco deshabilitado, omitiendo', { banco: bankConfig.banco_nombre });
      continue;
    }

    stats.bancoStats[bancoKey] = { procesados: 0, errores: 0, deduplicados: 0 };

    // Verificar límite de tiempo antes de cada banco
    if (Date.now() - startTime > CONFIG.maxExecutionMs) {
      log('WARN', 'Límite de tiempo alcanzado. Guardando checkpoint.', { banco: bancoKey });
      _saveCheckpoint(bancoKey, stats);
      break;
    }

    const emails = GmailService.searchEmails(bankConfig);

    for (const email of emails) {
      // Verificar límite de tiempo antes de cada email
      if (Date.now() - startTime > CONFIG.maxExecutionMs) {
        log('WARN', 'Límite de tiempo alcanzado durante procesamiento de emails.', { banco: bancoKey });
        _saveCheckpoint(bancoKey, stats);
        break;
      }

      const emailId = GmailService.getEmailId(email);
      const subject = GmailService.getSubject(email);

      // Deduplicación secundaria (capa Sheets)
      if (processedIds.has(emailId)) {
        log('INFO', 'Email ya procesado (dedup Sheets), omitiendo', { emailId });
        stats.deduplicados++;
        stats.bancoStats[bancoKey].deduplicados++;
        continue;
      }

      // Procesar el email (fail-open: errores individuales no interrumpen el pipeline)
      try {
        const result = _processEmail(email, emailId, bankConfig);

        if (result.success) {
          stats.procesados++;
          stats.bancoStats[bancoKey].procesados++;
          processedIds.add(emailId);
        } else {
          stats.errores++;
          stats.bancoStats[bancoKey].errores++;
        }
      } catch (e) {
        log('ERROR', 'Error inesperado procesando email', {
          emailId,
          subject,
          banco: bancoKey,
          error: e.message
        });
        stats.errores++;
        stats.bancoStats[bancoKey].errores++;
        // Registrar en Sheets como parse_error y aplicar label de error
        _handleEmailError(email, emailId, bankConfig, e.message);
      }
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  log('INFO', '=== Pipeline finalizado ===', {
    usuario: CONFIG.usuario,
    procesados: stats.procesados,
    errores: stats.errores,
    deduplicados: stats.deduplicados,
    elapsed_s: elapsed,
    bancoStats: stats.bancoStats
  });
}

/**
 * Procesa un email individual: parseo → categorización → escritura en Sheets → label.
 * @param {GmailMessage} email
 * @param {string} emailId
 * @param {Object} bankConfig
 * @returns {{success: boolean}}
 */
function _processEmail(email, emailId, bankConfig) {
  const subject = GmailService.getSubject(email);
  const body = GmailService.getEmailBody(email);

  if (!body) {
    log('WARN', 'Email sin cuerpo', { emailId, subject });
    _writeRow({
      email_id: emailId,
      banco: bankConfig.banco_nombre,
      status: 'parse_error',
      comercio: subject || 'Sin asunto'
    });
    GmailService.applyLabel(email, bankConfig.label_error);
    return { success: false };
  }

  // Obtener el parser para este banco
  const parser = ParserRegistry.getParser(bankConfig.parser);
  if (!parser) {
    log('ERROR', 'Parser no encontrado para banco', { banco: bankConfig.parser });
    return { success: false };
  }

  // Intentar parseo con regex
  let parsed = parser.parse(body);
  let parsed_by_ai = false;

  // Fallback a Claude API si el regex falla y está habilitado
  if (!parsed && bankConfig.fallback_ai && CONFIG.claudeApiKey) {
    log('INFO', 'Regex falló, intentando Claude API fallback', {
      emailId,
      banco: bankConfig.banco_nombre
    });
    const aiResult = ClaudeService.parseWithAI(body, bankConfig.banco_nombre);
    if (aiResult) {
      parsed = aiResult;
      parsed_by_ai = true;
    }
  }

  // Si no se pudo parsear, registrar como error
  if (!parsed) {
    log('WARN', 'No se pudo parsear email', {
      emailId,
      banco: bankConfig.banco_nombre,
      subject
    });
    _writeRow({
      email_id: emailId,
      banco: bankConfig.banco_nombre,
      status: 'parse_error',
      comercio: subject || 'Sin asunto',
      parsed_by_ai: false
    });
    GmailService.applyLabel(email, bankConfig.label_error);
    return { success: false };
  }

  // Categorizar con Claude API
  let categoria = 'Sin categorizar';
  let categorized_by_ai = false;

  if (CONFIG.claudeApiKey) {
    const catResult = ClaudeService.categorize(
      parsed.comercio,
      parsed.monto,
      bankConfig.banco_nombre
    );
    categoria = catResult.categoria;
    categorized_by_ai = catResult.categorized_by_ai;
  }

  // Escribir en Sheets
  _writeRow({
    fecha: parsed.fecha,
    monto: parsed.monto,
    comercio: parsed.comercio,
    banco: bankConfig.banco_nombre,
    usuario: CONFIG.usuario,
    categoria,
    categorized_by_ai,
    parsed_by_ai,
    status: 'ok',
    email_id: emailId
  });

  // Aplicar label de procesado exitoso
  GmailService.applyLabel(email, bankConfig.label_procesado);

  log('INFO', 'Email procesado exitosamente', {
    emailId,
    banco: bankConfig.banco_nombre,
    monto: parsed.monto,
    categoria
  });

  return { success: true };
}

/**
 * Escribe una fila en Sheets con valores por defecto para campos faltantes.
 * @param {Object} fields
 */
function _writeRow(fields) {
  SheetsService.appendRow({
    fecha: fields.fecha || '',
    monto: fields.monto || 0,
    comercio: fields.comercio || '',
    banco: fields.banco || '',
    usuario: fields.usuario || CONFIG.usuario,
    categoria: fields.categoria || 'Sin categorizar',
    categorized_by_ai: fields.categorized_by_ai || false,
    parsed_by_ai: fields.parsed_by_ai || false,
    status: fields.status || 'ok',
    email_id: fields.email_id || '',
    timestamp_ingesta: getNowLima()
  });
}

/**
 * Maneja un error inesperado en el procesamiento de un email.
 * Registra en Sheets como parse_error y aplica label de error.
 */
function _handleEmailError(email, emailId, bankConfig, errorMessage) {
  try {
    _writeRow({
      email_id: emailId,
      banco: bankConfig.banco_nombre,
      status: 'parse_error',
      comercio: `Error: ${errorMessage}`.substring(0, 100)
    });
    GmailService.applyLabel(email, bankConfig.label_error);
  } catch (e) {
    log('ERROR', 'Error al manejar error de email', { emailId, error: e.message });
  }
}

/**
 * Guarda un checkpoint en PropertiesService para continuar en la próxima ejecución.
 * @param {string} lastBancoKey - Último banco procesado
 * @param {Object} stats - Estadísticas actuales
 */
function _saveCheckpoint(lastBancoKey, stats) {
  try {
    const checkpoint = {
      lastBancoKey,
      stats,
      timestamp: getNowLima()
    };
    PropertiesService.getScriptProperties().setProperty(
      'PIPELINE_CHECKPOINT',
      JSON.stringify(checkpoint)
    );
    log('INFO', 'Checkpoint guardado', { lastBancoKey });
  } catch (e) {
    log('ERROR', 'Error guardando checkpoint', { error: e.message });
  }
}

/**
 * Configura un trigger diario a las 7:00 AM hora de Lima.
 * Ejecutar esta función una sola vez para configurar el trigger.
 */
function setupDailyTrigger() {
  // Eliminar triggers existentes de main para evitar duplicados
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'main') {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  // Crear trigger diario a las 7 AM
  ScriptApp.newTrigger('main')
    .timeBased()
    .atHour(7)
    .everyDays(1)
    .inTimezone('America/Lima')
    .create();

  log('INFO', 'Trigger diario configurado para las 7:00 AM hora de Lima');
}
