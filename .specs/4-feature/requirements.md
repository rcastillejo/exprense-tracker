# Requirements — Issue #4: Email Ingestion Pipeline

## Versión: v1.0
## Fecha: 2026-04-03
## Estado: Draft
## Issue: #4

---

## Contexto

Dos usuarios reciben notificaciones de gasto por Gmail desde 5 fuentes bancarias
(BCP, Interbank, BBVA, Scotiabank, Yape/Plin). El pipeline debe leer esos emails,
parsearlos y registrarlos en Google Sheets automáticamente cada día, sin intervención
manual. Stack tecnológico definido en ADR-001: Google Apps Script + Claude API.

---

## User Stories

### US-01 — Ingesta diaria automática de emails

**As a** usuario del sistema (pareja/familia),
**I want** que el pipeline lea mis emails de gasto de BCP, Interbank, BBVA, Scotiabank
y Yape/Plin automáticamente cada día,
**so that** no tenga que ingresar ningún gasto manualmente.

#### Criterios de aceptación

```
GIVEN que existen emails de notificación de gasto no procesados en Gmail
WHEN el trigger diario de Apps Script se ejecuta
THEN el sistema lee los emails de los últimos 24 horas de ambas cuentas Gmail
  AND extrae: fecha, monto, comercio/destinatario, banco, usuario
  AND registra cada gasto como una fila nueva en Google Sheets
  AND marca los emails como procesados para no duplicar registros
```

```
GIVEN que no existen emails de gasto nuevos en las últimas 24 horas
WHEN el trigger diario se ejecuta
THEN el sistema completa la ejecución sin errores
  AND no crea filas duplicadas en Sheets
```

---

### US-02 — Soporte para BCP

**As a** usuario con cuenta BCP,
**I want** que los emails de "Confirmación de operación" de BCP sean parseados correctamente,
**so that** mis gastos con tarjeta BCP queden registrados automáticamente.

#### Criterios de aceptación

```
GIVEN un email de BCP con notificación de consumo con tarjeta
WHEN el parser de BCP procesa el email
THEN extrae correctamente:
  - fecha y hora de la transacción
  - monto en soles (S/) o dólares (USD)
  - nombre del comercio
  - últimos 4 dígitos de la tarjeta (opcional, para referencia)
  AND registra banco = "BCP"
```

```
GIVEN un email de BCP con formato no reconocido
WHEN el parser de BCP no puede extraer datos con regex
THEN el sistema invoca Claude API como fallback para extraer los campos
  AND si Claude tampoco puede parsear, registra el email en una hoja de "Errores" con el asunto y fecha
```

---

### US-03 — Soporte para Interbank

**As a** usuario con cuenta Interbank,
**I want** que los emails de alerta de consumo de Interbank sean parseados correctamente,
**so that** mis gastos con Interbank queden registrados sin intervención manual.

#### Criterios de aceptación

```
GIVEN un email de Interbank con alerta de consumo
WHEN el parser de Interbank procesa el email
THEN extrae correctamente:
  - fecha y hora de la transacción
  - monto en soles o dólares
  - nombre del establecimiento
  AND registra banco = "Interbank"
```

```
GIVEN un email de Interbank con formato no reconocido
WHEN el parser de Interbank no puede extraer datos
THEN el sistema usa Claude API como fallback
  AND si falla, registra en hoja "Errores"
```

---

### US-04 — Soporte para BBVA

**As a** usuario con cuenta BBVA,
**I want** que los emails de alerta de operación de BBVA sean parseados correctamente,
**so that** mis gastos con BBVA queden registrados automáticamente.

#### Criterios de aceptación

```
GIVEN un email de BBVA con notificación de cargo o consumo
WHEN el parser de BBVA procesa el email
THEN extrae correctamente:
  - fecha y hora de la operación
  - monto (soles o dólares)
  - descripción del comercio
  AND registra banco = "BBVA"
```

```
GIVEN un email de BBVA con formato no reconocido
WHEN el parser de BBVA no puede extraer datos
THEN el sistema usa Claude API como fallback
  AND si falla, registra en hoja "Errores"
```

---

### US-05 — Soporte para Scotiabank

**As a** usuario con cuenta Scotiabank,
**I want** que los emails de notificación de Scotiabank sean parseados correctamente,
**so that** mis gastos con Scotiabank queden registrados sin trabajo manual.

#### Criterios de aceptación

```
GIVEN un email de Scotiabank con notificación de consumo
WHEN el parser de Scotiabank procesa el email
THEN extrae correctamente:
  - fecha y hora de la transacción
  - monto (soles o dólares)
  - nombre del comercio o descripción
  AND registra banco = "Scotiabank"
```

```
GIVEN un email de Scotiabank con formato no reconocido
WHEN el parser no puede extraer datos
THEN el sistema usa Claude API como fallback
  AND si falla, registra en hoja "Errores"
```

---

### US-06 — Soporte para Yape y Plin

**As a** usuario que realiza pagos por Yape o Plin,
**I want** que los emails de confirmación de Yape/Plin sean parseados correctamente,
**so that** mis transferencias y pagos digitales queden registrados automáticamente.

#### Criterios de aceptación

```
GIVEN un email de confirmación de pago de Yape o Plin
WHEN el parser de Yape/Plin procesa el email
THEN extrae correctamente:
  - fecha y hora del pago
  - monto en soles
  - nombre del destinatario (persona o comercio)
  - tipo: Yape o Plin
  AND registra banco = "Yape" o banco = "Plin" según corresponda
```

```
GIVEN un email de Yape/Plin con formato no reconocido
WHEN el parser no puede extraer datos
THEN el sistema usa Claude API como fallback
  AND si falla, registra en hoja "Errores"
```

---

### US-07 — Vista consolidada de ambos usuarios

**As a** miembro de la pareja/familia,
**I want** ver los gastos de ambos usuarios en una sola hoja de Google Sheets,
**so that** pueda analizar el gasto total del hogar sin combinar datos manualmente.

#### Criterios de aceptación

```
GIVEN que el pipeline ha procesado emails de ambas cuentas Gmail
WHEN abro la hoja "Gastos" en Google Sheets
THEN veo todas las filas con la columna "Usuario" identificando a cada persona
  AND puedo filtrar por usuario, banco, fecha o categoría
  AND el orden es cronológico descendente (más reciente primero)
```

```
GIVEN que ambos usuarios tienen gastos del mismo día
WHEN reviso la hoja consolidada
THEN aparecen filas de ambos usuarios mezcladas cronológicamente
  AND cada fila tiene: fecha, monto, comercio, banco, usuario, categoría
```

---

### US-08 — Categorización automática de gastos

**As a** usuario,
**I want** que cada gasto sea categorizado automáticamente (comida, transporte, entretenimiento, etc.),
**so that** pueda entender en qué rubros se va el dinero sin clasificar manualmente.

#### Criterios de aceptación

```
GIVEN un gasto registrado con comercio conocido (ej. "Wong", "Uber", "Netflix")
WHEN el sistema invoca Claude API para categorizar
THEN asigna una categoría de la lista predefinida:
  Alimentación | Transporte | Entretenimiento | Salud | Educación |
  Hogar | Ropa | Tecnología | Restaurantes | Otros
  AND la categoría queda en la columna "Categoría" de Sheets
```

```
GIVEN un gasto con comercio ambiguo
WHEN Claude API no puede determinar la categoría con confianza
THEN asigna categoría = "Otros"
  AND nunca deja la celda de categoría vacía
```

---

### US-09 — Ejecución diaria sin intervención manual

**As a** usuario,
**I want** que el pipeline se ejecute automáticamente cada día,
**so that** no tenga que recordar ejecutar ningún script ni hacer nada manualmente.

#### Criterios de aceptación

```
GIVEN que el trigger de Apps Script está configurado
WHEN llega la hora programada (ej. 7:00 AM hora de Lima)
THEN el pipeline se ejecuta automáticamente
  AND procesa emails de las últimas 24 horas
  AND termina en menos de 6 minutos (límite de Apps Script)
```

```
GIVEN que el pipeline falla durante la ejecución
WHEN ocurre un error inesperado
THEN el sistema registra el error con timestamp y detalle en hoja "Log"
  AND no pierde datos ya procesados
  AND la siguiente ejecución del trigger retoma desde cero (sin depender de estado previo)
```

---

### US-10 — Deduplicación de registros

**As a** usuario,
**I want** que el mismo email de gasto no se registre dos veces en Sheets,
**so that** los totales y análisis sean siempre correctos.

#### Criterios de aceptación

```
GIVEN que un email ya fue procesado en una ejecución anterior
WHEN el pipeline vuelve a leer la bandeja de entrada
THEN no crea una fila duplicada en Sheets para ese email
  AND usa el Message-ID del email o un hash del contenido como identificador único
```

---

## Restricciones técnicas (alineadas al ADR-001)

| Restricción | Detalle |
|---|---|
| Lenguaje | Google Apps Script (JavaScript ES5/ES6 compatible con GAS) |
| Ingesta de email | Gmail API nativa de Apps Script (`GmailApp`) — sin OAuth externo |
| Almacenamiento | Google Sheets (`SpreadsheetApp`) — sin base de datos externa |
| Categorización | Claude API con modelo `claude-haiku-4-5` — mínimo costo por token |
| Trigger | Time-driven trigger de Apps Script — frecuencia diaria |
| Límite de ejecución | Máximo 6 minutos por ejecución de Apps Script |
| Costo infraestructura | $0/mes — solo costo variable de Claude API por tokens usados |
| Cuentas Gmail | Exactamente 2 cuentas (una por usuario) — sin multi-tenancy |
| Resiliencia de parsers | Regex como método primario; Claude API como fallback obligatorio |
| Deduplicación | Requerida — usar Message-ID de Gmail como clave única |

---

## Estructura de datos en Google Sheets

### Hoja principal: "Gastos"

| Columna | Tipo | Descripción |
|---|---|---|
| Fecha | Date | Fecha de la transacción (no del email) |
| Hora | Time | Hora de la transacción (si disponible) |
| Monto | Number | Importe del gasto |
| Moneda | String | "PEN" o "USD" |
| Comercio | String | Nombre del comercio o destinatario |
| Banco | String | BCP / Interbank / BBVA / Scotiabank / Yape / Plin |
| Usuario | String | Nombre o email del usuario |
| Categoría | String | Categoría asignada por Claude |
| Message-ID | String | ID único del email (para deduplicación) |
| Procesado_en | Timestamp | Cuando fue procesado por el pipeline |

### Hoja secundaria: "Errores"

| Columna | Tipo | Descripción |
|---|---|---|
| Fecha | Timestamp | Cuando ocurrió el error |
| Banco | String | Banco del email que falló |
| Usuario | String | Cuenta Gmail de origen |
| Asunto | String | Subject del email |
| Error | String | Descripción del error |
| Message-ID | String | ID del email problemático |

### Hoja secundaria: "Log"

| Columna | Tipo | Descripción |
|---|---|---|
| Timestamp | Timestamp | Inicio de ejecución |
| Emails_leidos | Number | Total de emails encontrados |
| Gastos_registrados | Number | Filas nuevas agregadas |
| Errores | Number | Emails que fallaron |
| Duracion_seg | Number | Tiempo de ejecución en segundos |

---

## Fuera de alcance (v1)

- Integración con otros proveedores de correo (Outlook, Yahoo, Hotmail)
- Más de 2 cuentas Gmail simultáneas
- Predicción o alertas de gastos futuros
- Notificaciones push o por email al usuario cuando hay nuevos gastos
- App móvil o web propia — Google Sheets es el único frontend
- Presupuestos, metas de ahorro o límites de gasto
- Reportes exportables (PDF, Excel)
- Integración con APIs bancarias (no existen públicamente en Perú)
- Soporte para transferencias interbancarias que no generen email de notificación
- Gastos en efectivo (sin trazabilidad digital)
- Reversiones o anulaciones de transacciones (manejo manual)
- Soporte para más de 5 bancos/billeteras digitales en v1

---

## Definición de Done

- [ ] Pipeline lee emails de 2 cuentas Gmail en una sola ejecución
- [ ] Los 5 bancos/billeteras tienen parser implementado (regex + fallback Claude)
- [ ] Cada gasto se registra con los 10 campos definidos en la estructura de datos
- [ ] Deduplicación funciona correctamente (no hay filas duplicadas tras 2 ejecuciones)
- [ ] Categorización automática asigna categoría a 100% de los gastos
- [ ] Trigger diario configurado y funcionando sin intervención manual
- [ ] Ejecución completa en < 6 minutos con volumen normal (≤ 50 emails/día)
- [ ] Hoja "Errores" captura emails no parseables sin interrumpir el pipeline
- [ ] Hoja "Log" registra cada ejecución con métricas básicas
