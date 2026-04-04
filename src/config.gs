/**
 * config.gs — Configuración central del pipeline de ingesta de emails
 *
 * INSTRUCCIONES DE SETUP:
 * 1. Reemplazar SHEET_ID_AQUI con el ID de tu Google Sheet
 * 2. Configurar CLAUDE_API_KEY en Apps Script:
 *    Menu > Project Settings > Script Properties > Add property
 *    Key: CLAUDE_API_KEY, Value: sk-ant-...
 * 3. Cambiar CONFIG.usuario a "usuario2" en la segunda instancia del script
 */

const CONFIG = {
  // ID del Google Sheet (obtenido de la URL: /spreadsheets/d/<ID>/edit)
  spreadsheetId: 'SHEET_ID_AQUI',

  // Nombre de la hoja donde se registran los gastos
  sheetName: 'gastos',

  // Identificador del usuario para esta instancia del script
  // Cambiar a "usuario2" en la segunda instancia
  usuario: 'usuario1',

  // Clave API de Claude — leída de PropertiesService, nunca hardcodeada
  get claudeApiKey() {
    return PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  },

  // Modelo de Claude a usar
  claudeModel: 'claude-haiku-4-5-20251001',

  // Máximo de caracteres del cuerpo del email enviado a Claude
  maxEmailBodyChars: 3000,

  // Tiempo máximo de ejecución en ms antes de guardar checkpoint (5.5 min)
  maxExecutionMs: 330000,

  // Configuración por banco
  bancos: {
    bcp: {
      enabled: true,
      banco_nombre: 'BCP',
      gmail_query: 'from:(alertas@notificacionesbcp.com.pe) subject:(consumo OR cargo)',
      label_procesado: 'ingesta/bcp/ok',
      label_error: 'ingesta/bcp/error',
      parser: 'bcp',
      fallback_ai: true
    },
    interbank: {
      enabled: true,
      banco_nombre: 'Interbank',
      gmail_query: 'from:(alertas@interbank.pe) subject:(consumo OR cargo)',
      label_procesado: 'ingesta/interbank/ok',
      label_error: 'ingesta/interbank/error',
      parser: 'interbank',
      fallback_ai: true
    },
    bbva: {
      enabled: true,
      banco_nombre: 'BBVA',
      gmail_query: 'from:(alertas@notificaciones.bbvaperu.com) subject:(alerta OR compra)',
      label_procesado: 'ingesta/bbva/ok',
      label_error: 'ingesta/bbva/error',
      parser: 'bbva',
      fallback_ai: true
    },
    scotiabank: {
      enabled: true,
      banco_nombre: 'Scotiabank',
      gmail_query: 'from:(notificaciones@scotiabank.com.pe)',
      label_procesado: 'ingesta/scotiabank/ok',
      label_error: 'ingesta/scotiabank/error',
      parser: 'scotiabank',
      fallback_ai: true
    },
    yape: {
      enabled: true,
      banco_nombre: 'Yape',
      gmail_query: 'from:(noreply@yape.com.pe) subject:(realizaste un pago)',
      label_procesado: 'ingesta/yape/ok',
      label_error: 'ingesta/yape/error',
      parser: 'yape',
      fallback_ai: false
    },
    plin: {
      enabled: true,
      banco_nombre: 'Plin',
      gmail_query: 'from:(noreply@plin.pe) subject:(realizaste un pago)',
      label_procesado: 'ingesta/plin/ok',
      label_error: 'ingesta/plin/error',
      parser: 'plin',
      fallback_ai: false
    }
  },

  // Categorías válidas para clasificación
  categorias: [
    'Supermercado',
    'Restaurante',
    'Transporte',
    'Salud',
    'Educación',
    'Entretenimiento',
    'Ropa',
    'Tecnología',
    'Hogar',
    'Servicios',
    'Transferencia',
    'Otro'
  ]
};
