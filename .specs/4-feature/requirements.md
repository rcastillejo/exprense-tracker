# Requirements — Email Ingestion Pipeline

## Issue: #4 — BCP, Interbank, BBVA, Scotiabank, Yape/Plin
## Version: v1.0
## Date: 2026-04-03
## Status: Draft

---

## Contexto

Ver [`docs/problem-statement.md`](../../docs/problem-statement.md) y [`docs/decisions/ADR-001-stack-tecnologico.md`](../../docs/decisions/ADR-001-stack-tecnologico.md).

El pipeline debe procesar emails de gasto de 5 bancos/billeteras peruanas (BCP, Interbank, BBVA, Scotiabank, Yape/Plin) llegados a 2 cuentas Gmail, registrar cada transacción en Google Sheets con categorización automática via Claude API, y ejecutarse diariamente sin intervención manual.

---

## User Stories

### US-01 — Ingesta automática de emails de BCP

**As a** usuario del sistema,  
**I want** que los emails de notificación de consumo de BCP sean leídos y procesados automáticamente cada día,  
**so that** no tenga que ingresar manualmente ningún gasto realizado con mi tarjeta BCP.

#### Criterios de aceptación

**Scenario 1 — Email de consumo BCP procesado correctamente**
```
GIVEN que existe un email de BCP con notificación de consumo no procesado en Gmail
  AND el email contiene monto, fecha, y nombre de comercio en el cuerpo
WHEN el trigger diario de Apps Script se ejecuta
THEN el gasto se registra en Google Sheets
  AND los campos fecha, monto, comercio y banco quedan correctamente extraídos
  AND el email queda marcado para no ser procesado nuevamente
```

**Scenario 2 — Email de BCP sin datos suficientes**
```
GIVEN que existe un email de BCP que no contiene monto o fecha parseable
WHEN el trigger diario se ejecuta
THEN el email se registra con status "parse_error"
  AND se conserva el asunto y remitente para revisión manual
  AND el pipeline continúa sin interrumpirse
```

---

### US-02 — Ingesta automática de emails de Interbank

**As a** usuario del sistema,  
**I want** que los emails de notificación de consumo de Interbank sean procesados automáticamente,  
**so that** mis gastos con tarjeta Interbank queden registrados sin esfuerzo manual.

#### Criterios de aceptación

**Scenario 1 — Email de consumo Interbank procesado correctamente**
```
GIVEN que existe un email de Interbank con notificación de consumo no procesado
  AND el email contiene los campos de transacción en su formato habitual
WHEN el trigger diario se ejecuta
THEN el gasto se registra en Sheets con fecha, monto, comercio y banco="Interbank"
  AND el email queda marcado para no ser reprocesado
```

**Scenario 2 — Email duplicado de Interbank**
```
GIVEN que un email de Interbank ya fue procesado en una ejecución anterior
WHEN el trigger diario vuelve a ejecutarse
THEN el email no se procesa nuevamente
  AND no se crea un registro duplicado en Sheets
```

---

### US-03 — Ingesta automática de emails de BBVA

**As a** usuario del sistema,  
**I want** que los emails de alerta de compra de BBVA sean capturados automáticamente,  
**so that** todos mis consumos BBVA aparezcan en el consolidado sin acción manual.

#### Criterios de aceptación

**Scenario 1 — Alerta de compra BBVA procesada**
```
GIVEN que existe un email de alerta de compra de BBVA en Gmail
WHEN el trigger diario se ejecuta
THEN el gasto se registra con banco="BBVA", monto, fecha y comercio correctos
```

**Scenario 2 — Email de BBVA con formato no reconocido**
```
GIVEN que BBVA cambia el formato del email de alerta
  AND el regex del parser no puede extraer los campos requeridos
WHEN el trigger diario se ejecuta
THEN el gasto se envía a Claude API como fallback de parseo
  AND si Claude extrae los datos, se registra con flag "parsed_by_ai=true"
  AND si Claude tampoco puede, se registra con status "parse_error"
```

---

### US-04 — Ingesta automática de emails de Scotiabank

**As a** usuario del sistema,  
**I want** que las notificaciones de consumo de Scotiabank sean procesadas automáticamente,  
**so that** mis gastos Scotiabank se integren al consolidado del hogar.

#### Criterios de aceptación

**Scenario 1 — Notificación de Scotiabank procesada**
```
GIVEN que existe un email de notificación de Scotiabank no procesado
WHEN el trigger diario se ejecuta
THEN el gasto se registra con banco="Scotiabank" y todos los campos requeridos
```

---

### US-05 — Ingesta automática de pagos Yape / Plin

**As a** usuario del sistema,  
**I want** que los emails de confirmación de pago de Yape y Plin sean procesados,  
**so that** los pagos por billetera digital también queden registrados automáticamente.

#### Criterios de aceptación

**Scenario 1 — Pago Yape procesado**
```
GIVEN que existe un email de confirmación de pago Yape en Gmail
WHEN el trigger diario se ejecuta
THEN el gasto se registra con banco="Yape", monto, fecha y destinatario como comercio
```

**Scenario 2 — Pago Plin procesado**
```
GIVEN que existe un email de confirmación de pago Plin en Gmail
WHEN el trigger diario se ejecuta
THEN el gasto se registra con banco="Plin", monto, fecha y destinatario como comercio
```

---

### US-06 — Vista consolidada de ambos usuarios

**As a** usuario del hogar,  
**I want** ver todos los gastos de ambos usuarios en una sola hoja de Google Sheets,  
**so that** pueda analizar el gasto total del hogar en menos de 30 segundos.

#### Criterios de aceptación

**Scenario 1 — Ambos usuarios visibles en la misma hoja**
```
GIVEN que el pipeline ha procesado emails de los 2 usuarios del hogar
WHEN abro la hoja consolidada en Google Sheets
THEN veo registros de ambos usuarios identificados por el campo "usuario"
  AND puedo filtrar por usuario, banco, mes o categoría con los filtros nativos de Sheets
```

**Scenario 2 — Estructura de columnas consistente**
```
GIVEN que hay registros de múltiples bancos y usuarios
WHEN reviso cualquier fila del Sheets
THEN los campos fecha, monto, comercio, banco, usuario y categoría siempre están presentes
  AND el campo monto está expresado en soles (PEN) como número
  AND el campo fecha está en formato YYYY-MM-DD
```

---

### US-07 — Categorización automática de gastos

**As a** usuario del hogar,  
**I want** que cada gasto sea categorizado automáticamente (supermercado, restaurante, transporte, etc.),  
**so that** pueda analizar en qué rubros gasta el hogar sin clasificar nada manualmente.

#### Criterios de aceptación

**Scenario 1 — Gasto categorizado exitosamente por Claude API**
```
GIVEN que un gasto ha sido extraído con comercio y monto
WHEN se invoca Claude API (claude-haiku-4-5) para categorizar
THEN el campo categoría queda asignado con un valor de la lista de categorías definida
  AND el flag "categorized_by_ai=true" queda marcado
```

**Scenario 2 — Claude API no disponible**
```
GIVEN que Claude API devuelve error o timeout
WHEN el pipeline intenta categorizar un gasto
THEN el gasto se registra con categoría="Sin categorizar"
  AND el pipeline no se interrumpe
  AND el gasto puede re-categorizarse en una ejecución futura
```

**Scenario 3 — Categorías disponibles**
```
GIVEN que Claude API categoriza un gasto
THEN la categoría asignada es una de:
  Supermercado | Restaurante | Transporte | Salud | Educación |
  Entretenimiento | Ropa | Tecnología | Hogar | Servicios | Transferencia | Otro
```

---

### US-08 — Ejecución diaria automática

**As a** usuario del hogar,  
**I want** que el pipeline se ejecute automáticamente cada día sin que yo haga nada,  
**so that** el Sheets siempre esté actualizado al día siguiente sin intervención manual.

#### Criterios de aceptación

**Scenario 1 — Trigger diario configurado**
```
GIVEN que el Apps Script está desplegado con un time-driven trigger
WHEN llega la hora de ejecución configurada (ej. 07:00 AM)
THEN el pipeline se ejecuta automáticamente
  AND procesa todos los emails nuevos desde la última ejecución
  AND termina dentro del límite de 6 minutos de Apps Script
```

**Scenario 2 — Ejecución sin emails nuevos**
```
GIVEN que no hay emails nuevos de ningún banco desde la última ejecución
WHEN el trigger diario se ejecuta
THEN el pipeline finaliza sin errores y sin escribir filas en Sheets
```

---

## Estructura de datos en Google Sheets

Cada fila en la hoja de gastos debe contener:

| Campo | Tipo | Descripción |
|---|---|---|
| `fecha` | String (YYYY-MM-DD) | Fecha de la transacción |
| `monto` | Number | Monto en soles (PEN), positivo |
| `comercio` | String | Nombre del comercio o destinatario |
| `banco` | String | BCP / Interbank / BBVA / Scotiabank / Yape / Plin |
| `usuario` | String | Identificador del usuario (ej. "usuario1", "usuario2") |
| `categoria` | String | Categoría asignada por Claude o "Sin categorizar" |
| `categorized_by_ai` | Boolean | true si la categoría fue asignada por Claude API |
| `parsed_by_ai` | Boolean | true si el parseo lo realizó Claude API como fallback |
| `status` | String | "ok" / "parse_error" |
| `email_id` | String | ID del email en Gmail para deduplicación |
| `timestamp_ingesta` | String (ISO 8601) | Fecha-hora en que se procesó el email |

---

## Restricciones técnicas (alineadas a ADR-001)

| Restricción | Detalle |
|---|---|
| **Runtime** | Google Apps Script (JavaScript ES2020 subset) — sin Node.js ni módulos externos |
| **Autenticación Gmail** | Gmail API nativa de Apps Script — sin OAuth adicional |
| **Modelo de IA** | `claude-haiku-4-5` vía Claude API — elegido por costo/latencia |
| **Almacenamiento** | Google Sheets — sin base de datos externa |
| **Tiempo de ejecución** | Máximo 6 minutos por ejecución (límite de Apps Script free tier) |
| **Costo infraestructura** | $0/mes — todo dentro de free tiers de Google y Anthropic |
| **Usuarios v1** | Exactamente 2 cuentas Gmail — sin multi-tenancy |
| **Deduplicación** | Por `email_id` de Gmail — cada email se procesa exactamente una vez |
| **Emails por banco** | Parsers independientes por banco con regex; Claude API como fallback |
| **Frecuencia** | Trigger diario — no se requiere procesamiento en tiempo real |

---

## Fuera de alcance (v1)

- Integración con bancos distintos a BCP, Interbank, BBVA, Scotiabank, Yape, Plin
- Soporte para más de 2 cuentas Gmail
- Integración con clientes de correo distintos a Gmail (Outlook, Yahoo, etc.)
- Alertas o notificaciones proactivas de gasto
- Presupuestos, metas de ahorro o proyecciones
- App móvil o web propia
- Reportes exportables (PDF, Excel)
- Sincronización en tiempo real (< 1 hora)
- Integración con APIs bancarias oficiales
- Soporte multi-moneda (v1 asume todo en PEN)
- UI de administración para gestionar configuraciones
- Autenticación de usuarios (el acceso al Sheets es el control de acceso)
