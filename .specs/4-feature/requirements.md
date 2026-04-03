# Requirements — Email Ingestion Pipeline
## Issue: #4
## Feature: Email ingestion pipeline — BCP, Interbank, BBVA, Scotiabank, Yape/Plin
## Status: Draft
## Date: 2026-04-03

---

## Contexto

Los emails de gasto de BCP, Interbank, BBVA, Scotiabank y Yape/Plin llegan a 2 cuentas Gmail con formatos distintos. Se necesita un pipeline en Google Apps Script que los lea, parsee y registre en Google Sheets automáticamente cada día.

Stack tecnológico: Google Apps Script + Google Sheets + Claude API (ADR-001).

---

## User Stories

### US-01 — Ingesta automática diaria de emails

**As a** usuario del hogar,  
**I want** que el sistema lea automáticamente los emails de gasto de mi Gmail cada día,  
**so that** no tenga que ingresar ningún gasto manualmente.

#### Criterios de aceptación

```gherkin
GIVEN que hay emails nuevos de BCP, Interbank, BBVA, Scotiabank o Yape/Plin en mi Gmail
WHEN el trigger diario de Apps Script se ejecuta (una vez al día)
THEN el sistema lee todos los emails de gasto del día anterior
  AND solo procesa emails de remitentes bancarios conocidos
  AND no duplica registros ya procesados en ejecuciones anteriores

GIVEN que no hay emails nuevos de bancos en el período consultado
WHEN el trigger diario se ejecuta
THEN el sistema finaliza sin error y sin registrar filas nuevas

GIVEN que un email ya fue procesado en una ejecución anterior
WHEN el trigger diario se ejecuta
THEN el sistema no lo vuelve a registrar (deduplicación por message ID)
```

---

### US-02 — Parser por banco

**As a** usuario del hogar,  
**I want** que el sistema extraiga correctamente el monto, fecha y comercio de cada email bancario,  
**so that** los datos registrados sean precisos sin intervención manual.

#### Criterios de aceptación

```gherkin
GIVEN un email de notificación de consumo de BCP
WHEN el parser de BCP lo procesa
THEN extrae: fecha de la transacción, monto en soles, nombre del comercio
  AND el monto tiene precisión de 2 decimales
  AND la fecha está en formato ISO 8601 (YYYY-MM-DD)

GIVEN un email de notificación de consumo de Interbank
WHEN el parser de Interbank lo procesa
THEN extrae: fecha de la transacción, monto en soles, nombre del comercio

GIVEN un email de notificación de consumo de BBVA
WHEN el parser de BBVA lo procesa
THEN extrae: fecha de la transacción, monto en soles, nombre del comercio

GIVEN un email de notificación de consumo de Scotiabank
WHEN el parser de Scotiabank lo procesa
THEN extrae: fecha de la transacción, monto en soles, nombre del comercio

GIVEN un email de operación de Yape o Plin
WHEN el parser de Yape/Plin lo procesa
THEN extrae: fecha de la transacción, monto en soles, nombre del destinatario o comercio

GIVEN un email de banco cuyo formato no puede ser parseado por regex
WHEN el parser no extrae los campos requeridos
THEN el sistema intenta extracción via Claude API como fallback
  AND si Claude tampoco puede extraer, registra el gasto como "REVISAR" con el asunto del email
```

---

### US-03 — Registro consolidado en Google Sheets

**As a** usuario del hogar,  
**I want** que todos los gastos de ambos usuarios queden registrados en una sola hoja de Google Sheets,  
**so that** pueda ver el consolidado del hogar en un solo lugar.

#### Criterios de aceptación

```gherkin
GIVEN que el parser extrajo exitosamente los datos de un email
WHEN se registra el gasto en Sheets
THEN se agrega una fila con los campos: fecha, monto, comercio, banco, usuario, categoría
  AND el campo "usuario" identifica a cuál de los 2 usuarios pertenece el gasto
  AND el campo "banco" indica el banco de origen (BCP, Interbank, BBVA, Scotiabank, Yape/Plin)

GIVEN que existen gastos de ambos usuarios
WHEN se consulta la hoja consolidada
THEN se muestran gastos de Usuario 1 y Usuario 2 en la misma hoja
  AND los registros están ordenados por fecha descendente
```

---

### US-04 — Categorización automática via Claude API

**As a** usuario del hogar,  
**I want** que cada gasto sea categorizado automáticamente,  
**so that** pueda ver en qué rubros estoy gastando sin clasificar manualmente.

#### Criterios de aceptación

```gherkin
GIVEN un gasto con nombre de comercio extraído
WHEN se llama a Claude API para categorización
THEN se asigna una categoría de la lista predefinida:
  [Alimentación, Transporte, Entretenimiento, Salud, Hogar, Educación, Ropa, Tecnología, Otros]
  AND la categoría queda registrada en la columna "categoría" de Sheets

GIVEN que Claude API no está disponible o retorna error
WHEN se intenta categorizar un gasto
THEN el gasto se registra con categoría "Sin categoría"
  AND el pipeline no se interrumpe

GIVEN que el mismo comercio ya fue categorizado previamente en Sheets
WHEN se procesa un nuevo gasto del mismo comercio
THEN se reutiliza la categoría existente sin llamar a Claude API
  (cache local por nombre de comercio para reducir costos de API)
```

---

### US-05 — Ejecución diaria sin intervención manual

**As a** usuario del hogar,  
**I want** que el pipeline se ejecute automáticamente cada día sin que yo tenga que hacer nada,  
**so that** los gastos siempre estén actualizados sin recordar ejecutar ningún proceso.

#### Criterios de aceptación

```gherkin
GIVEN que el trigger diario de Apps Script está configurado
WHEN llega la hora programada (ej. 07:00 AM hora Lima)
THEN el pipeline se ejecuta automáticamente sin intervención del usuario
  AND procesa los emails del día anterior
  AND los resultados están disponibles en Sheets al despertar

GIVEN que el pipeline falla por un error inesperado
WHEN ocurre la excepción
THEN el error queda registrado en Apps Script Execution Log
  AND no se corrompen datos existentes en Sheets
  AND la próxima ejecución diaria reintentará desde el último email no procesado
```

---

## Restricciones técnicas (alineadas a ADR-001)

| Restricción | Detalle |
|---|---|
| Lenguaje | Google Apps Script (JavaScript ES5/ES6 compatible con V8 runtime) |
| Almacenamiento | Google Sheets — sin base de datos externa |
| Ingesta de email | Gmail API nativa de Apps Script (GmailApp service) — sin OAuth adicional |
| Categorización | Claude API con modelo `claude-haiku-4-5` — optimizado para costo bajo |
| Scheduler | Apps Script time-driven trigger — ejecución diaria, máximo 6 min/ejecución |
| Costo operativo | $0/mes en infraestructura — free tier de Google cubre 2 usuarios |
| Usuarios v1 | Exactamente 2 cuentas Gmail — sin multi-tenancy |
| Volumen | Máximo ~100 emails/día por usuario dentro de los límites de Apps Script |
| Deduplicación | Por Gmail Message ID almacenado en Sheets para evitar registros duplicados |
| Fallback de parseo | Claude API como fallback si regex no extrae los campos requeridos |

---

## Campos del registro de gasto (schema de Sheets)

| Columna | Tipo | Ejemplo | Descripción |
|---|---|---|---|
| `fecha` | Date (YYYY-MM-DD) | 2026-04-02 | Fecha de la transacción |
| `monto` | Number (2 decimales) | 45.90 | Monto en soles (PEN) |
| `comercio` | String | "Wong San Isidro" | Nombre del comercio o destinatario |
| `banco` | Enum | BCP | Banco de origen |
| `usuario` | Enum | Usuario1 | Identificador del usuario |
| `categoría` | Enum | Alimentación | Categoría asignada |
| `message_id` | String | "18e4a..." | Gmail Message ID para deduplicación |
| `procesado_en` | Timestamp | 2026-04-03T07:02:11 | Cuándo fue procesado el email |

---

## Fuera de alcance (v1)

- Integración con proveedores de correo distintos a Gmail (Outlook, Yahoo, etc.)
- Más de 2 cuentas Gmail simultáneas
- Alertas o notificaciones de gastos inusuales
- Predicción de gastos futuros
- Presupuestos o metas de ahorro
- Reportes exportables (PDF, Excel)
- App móvil o web propia — Google Sheets es el frontend
- Integración directa con APIs bancarias (no existen públicamente en Perú)
- Soporte para moneda distinta a soles peruanos (PEN)
- Procesamiento en tiempo real (el trigger es diario, no en tiempo real)
- UI de configuración — la configuración es en el script directamente
