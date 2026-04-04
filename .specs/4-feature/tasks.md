# Tasks — Email Ingestion Pipeline

## Issue: #4 — BCP, Interbank, BBVA, Scotiabank, Yape/Plin
## Version: v1.0
## Date: 2026-04-04
## Status: In Progress

---

## Resumen de dependencias

```
T-01 (config.gs)
T-02 (utils.gs)
  └── T-03 (gmail-service.gs) → depende de T-01, T-02
  └── T-04 (sheets-service.gs) → depende de T-01, T-02
  └── T-05 (claude-service.gs) → depende de T-01, T-02
T-06..T-11 (parsers) → independientes entre sí, dependen de T-02
T-12 (main.gs) → depende de T-01..T-11
T-13 (appsscript.json) → independiente
T-14 (tests) → depende de T-01..T-12
```

---

## T-01 — `src/config.gs` — Configuración central

**Prioridad:** Alta  
**Dependencias:** Ninguna  
**Estimación:** 30 min

### Descripción

Crear el objeto `CONFIG` con todos los parámetros configurables del pipeline:
- `spreadsheetId`, `sheetName`, `usuario`
- `claudeApiKey` (leído de `PropertiesService`)
- `bancos`: objeto con configuración por banco (BCP, Interbank, BBVA, Scotiabank, Yape, Plin)
- `execution`: parámetros de checkpoint y timeout

### Criterios de aceptación

- [ ] `CONFIG` exportable como constante global accesible desde todos los módulos
- [ ] Clave API leída de `PropertiesService`, no hardcodeada
- [ ] Un banco puede deshabilitarse con `enabled: false` sin tocar otro código
- [ ] Parámetros de `gmail_query`, `label_procesado`, `label_error`, `fallback_ai`, `banco_nombre` presentes por banco

---

## T-02 — `src/utils.gs` — Utilidades

**Prioridad:** Alta  
**Dependencias:** Ninguna  
**Estimación:** 45 min

### Descripción

Implementar funciones helper reutilizables:
- `parseDate(str)` → `string YYYY-MM-DD | null`
- `parseAmount(str)` → `number | null`
- `normalizeText(str)` → `string`
- `sanitizeForPrompt(str)` → `string` (remueve control chars)
- `log(level, message, data)` → void
- `getNowLima()` → `string` ISO 8601 UTC-5
- `getOrCreateLabel(labelName)` → Gmail label

### Criterios de aceptación

- [ ] `parseDate` soporta formatos DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, "15 de enero de 2026"
- [ ] `parseAmount` maneja separadores peruanos: "1,234.56" y "1.234,56"
- [ ] `sanitizeForPrompt` elimina caracteres de control y trunca a 3000 chars
- [ ] `log` nunca registra el cuerpo completo del email, solo asunto y email_id

---

## T-03 — `src/gmail-service.gs` — Servicio Gmail

**Prioridad:** Alta  
**Dependencias:** T-01, T-02  
**Estimación:** 45 min

### Descripción

Implementar `GmailService` con métodos:
- `searchEmails(query)` → `GmailMessage[]`
- `getEmailBody(message)` → `string` (plain text, fallback HTML→text)
- `applyLabel(message, labelName)` → void
- `buildQuery(bankConfig)` → `string` (query con exclusión de labels procesados)

### Criterios de aceptación

- [ ] `buildQuery` añade `-label:<ok> -label:<error>` automáticamente
- [ ] `getEmailBody` retorna texto plano; si no hay, extrae texto de HTML
- [ ] `applyLabel` crea el label si no existe usando `getOrCreateLabel`
- [ ] Maneja threads con múltiples mensajes (usa el primer mensaje)

---

## T-04 — `src/sheets-service.gs` — Servicio Sheets

**Prioridad:** Alta  
**Dependencias:** T-01, T-02  
**Estimación:** 45 min

### Descripción

Implementar `SheetsService` con métodos:
- `getProcessedEmailIds()` → `Set<string>`
- `appendRow(row)` → void
- `ensureHeaders()` → void (crea header row si la hoja está vacía)

### Criterios de aceptación

- [ ] `getProcessedEmailIds` lee la columna J (email_id) completa al inicio
- [ ] `appendRow` escribe las 11 columnas en el orden definido en requirements.md
- [ ] `ensureHeaders` crea headers si la hoja está vacía
- [ ] Maneja el caso de Sheets no encontrado con error descriptivo

---

## T-05 — `src/claude-service.gs` — Servicio Claude API

**Prioridad:** Alta  
**Dependencias:** T-01, T-02  
**Estimación:** 60 min

### Descripción

Implementar `ClaudeService` con dos métodos:
- `categorize(comercio, monto, banco)` → `string` (categoría de la lista)
- `parseWithAI(emailBody, banco)` → `{fecha, monto, comercio} | null`

Usar `UrlFetchApp.fetch()` para llamar a Claude API con `claude-haiku-4-5`.

### Criterios de aceptación

- [ ] `categorize` retorna una de las 12 categorías válidas o "Otro" como fallback
- [ ] `parseWithAI` retorna `null` si la respuesta no tiene JSON válido
- [ ] Maneja errores HTTP de Claude API (4xx, 5xx) retornando null sin tirar excepción
- [ ] Prompt de categorización incluye comercio, monto y banco
- [ ] Prompt de parseo incluye cuerpo del email sanitizado (max 3000 chars)
- [ ] Timeout de 30s para ambas llamadas via `muteHttpExceptions: true`

---

## T-06 — `src/parsers/bcp-parser.gs` — Parser BCP

**Prioridad:** Media  
**Dependencias:** T-02  
**Estimación:** 60 min

### Descripción

Implementar `BcpParser` con método `parse(body)` → `ParsedEmail | null`.

Formato típico BCP:
- Asunto: "Consumo con tu tarjeta BCP"
- Monto: "S/ 150.00" o "USD 25.00"
- Fecha: "15/01/2026" o "15 de enero de 2026"
- Comercio: "WONG LAS BEGONIAS" o similar

### Criterios de aceptación

- [ ] Extrae monto, fecha y comercio de email típico BCP
- [ ] Retorna `null` si no puede extraer monto o fecha
- [ ] `raw` contiene el cuerpo original para debugging
- [ ] Testeable con fixture de email BCP

---

## T-07 — `src/parsers/interbank-parser.gs` — Parser Interbank

**Prioridad:** Media  
**Dependencias:** T-02  
**Estimación:** 45 min

### Descripción

Implementar `InterbankParser` con método `parse(body)` → `ParsedEmail | null`.

Formato típico Interbank:
- Alerta de consumo con tarjeta
- Monto en soles o dólares
- Nombre del establecimiento

### Criterios de aceptación

- [ ] Extrae los 3 campos de email típico Interbank
- [ ] Retorna `null` si faltan campos obligatorios

---

## T-08 — `src/parsers/bbva-parser.gs` — Parser BBVA

**Prioridad:** Media  
**Dependencias:** T-02  
**Estimación:** 45 min

### Descripción

Implementar `BbvaParser` con método `parse(body)` → `ParsedEmail | null`.

Formato típico BBVA:
- "Alerta de compra" con monto y establecimiento
- Fecha de la transacción incluida

### Criterios de aceptación

- [ ] Extrae los 3 campos de email típico BBVA
- [ ] Retorna `null` si faltan campos obligatorios

---

## T-09 — `src/parsers/scotiabank-parser.gs` — Parser Scotiabank

**Prioridad:** Media  
**Dependencias:** T-02  
**Estimación:** 45 min

### Descripción

Implementar `ScotiabankParser` con método `parse(body)` → `ParsedEmail | null`.

Formato típico Scotiabank:
- Notificación de consumo con tarjeta
- Monto, fecha, establecimiento

### Criterios de aceptación

- [ ] Extrae los 3 campos de email típico Scotiabank
- [ ] Retorna `null` si faltan campos obligatorios

---

## T-10 — `src/parsers/yape-parser.gs` — Parser Yape

**Prioridad:** Media  
**Dependencias:** T-02  
**Estimación:** 45 min

### Descripción

Implementar `YapeParser` con método `parse(body)` → `ParsedEmail | null`.

Formato típico Yape:
- "Realizaste un pago a [nombre]"
- Monto en soles
- Fecha de la operación

### Criterios de aceptación

- [ ] Extrae monto, fecha y nombre del destinatario como comercio
- [ ] Retorna `null` si faltan campos obligatorios

---

## T-11 — `src/parsers/plin-parser.gs` — Parser Plin

**Prioridad:** Media  
**Dependencias:** T-02  
**Estimación:** 30 min

### Descripción

Implementar `PlinParser` con método `parse(body)` → `ParsedEmail | null`.

Formato típico Plin:
- Confirmación de pago enviado
- Monto en soles
- Nombre del destinatario

### Criterios de aceptación

- [ ] Extrae monto, fecha y nombre del destinatario como comercio
- [ ] Retorna `null` si faltan campos obligatorios

---

## T-12 — `src/main.gs` — Orquestador principal

**Prioridad:** Alta  
**Dependencias:** T-01..T-11  
**Estimación:** 60 min

### Descripción

Implementar `main()` (entry point del trigger diario) y `ParserRegistry`:

```
main()
  ├── SheetsService.getProcessedEmailIds()
  ├── para cada banco habilitado en CONFIG:
  │   ├── GmailService.searchEmails(query)
  │   └── para cada email:
  │       ├── skip si email_id ya procesado
  │       ├── ParserRegistry.getParser(banco).parse(body)
  │       ├── si parse ok → ClaudeService.categorize()
  │       ├── si parse fail y fallback_ai → ClaudeService.parseWithAI()
  │       ├── SheetsService.appendRow(row)
  │       └── GmailService.applyLabel()
  └── log resumen
```

Implementar checkpoint anti-timeout (DT-007): si `Date.now() - startTime > 5.5min`, guardar progreso en PropertiesService y salir.

### Criterios de aceptación

- [ ] `main()` puede ser llamada desde trigger diario de Apps Script
- [ ] `ParserRegistry` mapea banco → parser correctamente
- [ ] Fail-open: un email con error no interrumpe el pipeline (DT-006)
- [ ] Checkpoint guardado si tiempo > 5.5 minutos
- [ ] Log final con conteo: procesados, errores, omitidos por dedup, tiempo total

---

## T-13 — `appsscript.json` — Manifest

**Prioridad:** Alta  
**Dependencias:** Ninguna  
**Estimación:** 15 min

### Descripción

Crear manifest de Apps Script con:
- Scopes OAuth: `gmail.modify`, `spreadsheets`, `script.external_request`
- `timeZone`: `America/Lima`
- `exceptionLogging`: `STACKDRIVER`

### Criterios de aceptación

- [ ] Todos los scopes OAuth requeridos incluidos
- [ ] Timezone configurado como `America/Lima`
- [ ] Logging habilitado para diagnóstico

---

## T-14 — Tests unitarios

**Prioridad:** Media  
**Dependencias:** T-01..T-12  
**Estimación:** 90 min

### Descripción

Crear `tests/` con tests para cada componente usando un framework simple de mocking en GAS:

- `tests/test-runner.gs` — framework de tests simple (assert, mock)
- `tests/utils-test.gs` — tests para `utils.gs`
- `tests/parsers-test.gs` — tests para los 6 parsers con fixtures
- `tests/claude-service-test.gs` — tests para `ClaudeService` con mocks de UrlFetchApp
- `tests/sheets-service-test.gs` — tests para `SheetsService` con mocks de SpreadsheetApp
- `tests/gmail-service-test.gs` — tests para `GmailService` con mocks de GmailApp
- `tests/main-test.gs` — tests de integración del orquestador

### Criterios de aceptación

- [ ] Cada parser tiene al menos 2 tests: parse exitoso y parse fallido (null)
- [ ] `ClaudeService` tiene tests con mock de `UrlFetchApp` (sin llamadas reales)
- [ ] `SheetsService.getProcessedEmailIds()` tiene test de deduplicación
- [ ] Todos los tests pasan al ejecutar `runAllTests()` en Apps Script

---

## Orden de implementación recomendado

```
1. T-13 appsscript.json       (independiente, rápido)
2. T-01 config.gs             (base de todo)
3. T-02 utils.gs              (dependen los servicios)
4. T-06..T-11 parsers         (paralelo, independientes)
5. T-03 gmail-service.gs      (depende de T-01, T-02)
6. T-04 sheets-service.gs     (depende de T-01, T-02)
7. T-05 claude-service.gs     (depende de T-01, T-02)
8. T-12 main.gs               (integra todo)
9. T-14 tests                 (valida todo)
```
