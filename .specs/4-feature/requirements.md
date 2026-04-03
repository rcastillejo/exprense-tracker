# Requirements — Email Ingestion Pipeline
## Issue: #4
## Feature: BCP, Interbank, BBVA, Scotiabank, Diners, Yape/Plin
## Status: Draft
## Date: 2026-04-03

---

## User Stories & Acceptance Criteria

---

### US-01: Ingesta diaria automática de emails de gasto

**As a** usuario del hogar (C o C),
**I want** que mis emails de notificación de gasto sean leídos automáticamente cada día,
**so that** no tenga que ingresar ningún dato manualmente para ver mis gastos.

#### Criterios de aceptación

**Scenario 1: Ejecución diaria sin intervención**
```
GIVEN que el trigger diario de Apps Script se activa
WHEN han llegado emails nuevos de BCP, Interbank, BBVA, Scotiabank o Yape/Plin
  desde la última ejecución
THEN el script lee todos esos emails
  AND los procesa sin acción del usuario
  AND registra en Google Sheets los gastos encontrados
```

**Scenario 2: No hay emails nuevos**
```
GIVEN que el trigger diario se activa
WHEN no hay emails nuevos de ningún banco desde la última ejecución
THEN el script termina sin error
  AND no genera registros duplicados
```

**Scenario 3: Cobertura de ambos usuarios**
```
GIVEN que el trigger diario se activa
WHEN el Usuario 1 tiene emails de BCP e Interbank
  AND el Usuario 2 tiene emails de BBVA y Yape
THEN se registran los gastos de ambos usuarios en la misma hoja
  AND cada registro identifica a qué usuario pertenece
```

---

### US-02: Parseo correcto de emails por banco

**As a** usuario del hogar,
**I want** que el sistema extraiga automáticamente fecha, monto y comercio de cada email,
**so that** el registro en Sheets sea preciso sin edición manual.

#### Criterios de aceptación

**Scenario 1: Email de BCP parseado correctamente**
```
GIVEN que llega un email de notificación de consumo de BCP
WHEN el parser de BCP procesa el email
THEN extrae: fecha (DD/MM/YYYY), monto (número decimal), comercio (string)
  AND el banco queda registrado como "BCP"
```

**Scenario 2: Email de Interbank parseado correctamente**
```
GIVEN que llega un email de notificación de consumo de Interbank
WHEN el parser de Interbank procesa el email
THEN extrae: fecha, monto, comercio
  AND el banco queda registrado como "Interbank"
```

**Scenario 3: Email de BBVA parseado correctamente**
```
GIVEN que llega un email de notificación de consumo de BBVA
WHEN el parser de BBVA procesa el email
THEN extrae: fecha, monto, comercio
  AND el banco queda registrado como "BBVA"
```

**Scenario 4: Email de Scotiabank parseado correctamente**
```
GIVEN que llega un email de notificación de consumo de Scotiabank
WHEN el parser de Scotiabank procesa el email
THEN extrae: fecha, monto, comercio
  AND el banco queda registrado como "Scotiabank"
```

**Scenario 5: Email de Yape o Plin parseado correctamente**
```
GIVEN que llega un email de notificación de pago de Yape o Plin
WHEN el parser de Yape/Plin procesa el email
THEN extrae: fecha, monto, destinatario o concepto
  AND el banco queda registrado como "Yape" o "Plin" según corresponda
```

**Scenario 6: Email con formato no reconocido**
```
GIVEN que llega un email de un banco conocido
WHEN el parser por regex no puede extraer los datos con confianza
THEN el registro queda en estado "pendiente de revisión"
  AND se delega a Claude API como fallback de extracción
  AND si Claude tampoco puede parsearlo, el registro se omite con log de error
```

---

### US-03: Categorización automática de gastos vía Claude API

**As a** usuario del hogar,
**I want** que cada gasto quede categorizado automáticamente (comida, transporte, etc.),
**so that** pueda analizar en qué rubros gasto sin clasificar manualmente.

#### Criterios de aceptación

**Scenario 1: Categorización exitosa**
```
GIVEN que un gasto fue parseado con monto, fecha y comercio
WHEN se envía a Claude API para categorización
THEN Claude retorna una categoría del catálogo predefinido
  AND el gasto queda registrado con esa categoría en Sheets
```

**Scenario 2: Categorías predefinidas respetadas**
```
GIVEN el catálogo de categorías definido en el sistema
WHEN Claude categoriza un gasto
THEN la categoría asignada pertenece al catálogo
  AND no se crean categorías arbitrarias fuera del catálogo
```

**Scenario 3: Fallo de Claude API**
```
GIVEN que la llamada a Claude API falla (timeout, rate limit, error 5xx)
WHEN el sistema maneja el error
THEN el gasto se registra con categoría "Sin categorizar"
  AND el pipeline no se interrumpe para los demás gastos
```

**Scenario 4: Categorías del catálogo**
El catálogo inicial de categorías incluye:
- Alimentación
- Transporte
- Salud
- Entretenimiento
- Servicios (luz, agua, internet, etc.)
- Hogar
- Educación
- Ropa y accesorios
- Transferencias
- Otros

---

### US-04: Vista consolidada de gastos en Google Sheets

**As a** usuario del hogar,
**I want** ver todos los gastos de ambos usuarios en una sola hoja de Sheets,
**so that** pueda analizar el gasto total del hogar en menos de 30 segundos.

#### Criterios de aceptación

**Scenario 1: Estructura de la hoja de gastos**
```
GIVEN que el pipeline registra un gasto
WHEN escribe en Google Sheets
THEN la fila contiene exactamente: fecha, monto, comercio, banco, usuario, categoría
  AND el formato de fecha es DD/MM/YYYY
  AND el monto es numérico (no string con símbolo)
```

**Scenario 2: Vista consolidada de ambos usuarios**
```
GIVEN que Usuario 1 tiene gastos y Usuario 2 tiene gastos
WHEN se accede a la hoja principal
THEN se ven los gastos de ambos usuarios en la misma hoja
  AND cada fila identifica al usuario con su nombre o alias
```

**Scenario 3: Sin duplicados**
```
GIVEN que un email ya fue procesado en una ejecución anterior
WHEN el trigger vuelve a ejecutarse
THEN el gasto NO se registra dos veces
  AND el sistema identifica emails ya procesados por su ID único de Gmail
```

**Scenario 4: Tiempo de acceso al resumen**
```
GIVEN que los gastos del mes están registrados en Sheets
WHEN el usuario abre la hoja del dashboard
THEN puede ver el total de gastos del mes en menos de 30 segundos
  AND sin necesidad de calcular nada manualmente
```

---

### US-05: Resiliencia y observabilidad del pipeline

**As a** operador del sistema (Ricardo),
**I want** que el pipeline registre errores y avance aunque falle un banco,
**so that** un parser roto no bloquee el procesamiento de los otros bancos.

#### Criterios de aceptación

**Scenario 1: Fallo aislado de un parser**
```
GIVEN que el parser de un banco lanza una excepción
WHEN el pipeline ejecuta el procesamiento diario
THEN los demás parsers continúan ejecutándose
  AND el error queda registrado en un log o hoja de errores
  AND los gastos de los otros bancos se registran normalmente
```

**Scenario 2: Log de ejecución**
```
GIVEN que el pipeline completa una ejecución
WHEN termina (exitosa o con errores parciales)
THEN queda un registro de: fecha de ejecución, cantidad de emails procesados,
  cantidad de gastos registrados, errores encontrados
```

---

## Restricciones técnicas (alineadas a ADR-001)

| Restricción | Detalle |
|---|---|
| **Plataforma** | Google Apps Script únicamente. Sin servidores externos, sin Docker, sin Cloud Functions. |
| **Lenguaje** | JavaScript (Apps Script runtime). Sin TypeScript en v1. |
| **Email API** | Gmail API nativa de Apps Script (`GmailApp`). Sin OAuth adicional. |
| **Almacenamiento** | Google Sheets como única base de datos (`SpreadsheetApp`). |
| **Categorización** | Claude API modelo `claude-haiku-4-5` (costo mínimo). |
| **Trigger** | Time-driven trigger de Apps Script. Frecuencia: 1 vez por día. |
| **Usuarios** | Exactamente 2 cuentas Gmail en v1. Sin multi-tenancy. |
| **Costo** | $0/mes en infraestructura. Solo costo variable de Claude API (mínimo). |
| **Tiempo de ejecución** | El script completo debe terminar en menos de 6 minutos (límite de Apps Script). |
| **Emails por ejecución** | Diseñado para procesar hasta ~100 emails por usuario por día. |
| **Deduplicación** | Usar el ID único de Gmail (`message.getId()`) para evitar registros duplicados. |

---

## Fuera de alcance (v1)

- Integración con bancos no listados (Falabella, Ripley, BanBif, etc.)
- Soporte para cuentas de correo que no sean Gmail
- Procesamiento de emails de estados de cuenta (solo notificaciones de consumo)
- Alertas o notificaciones push cuando se registra un gasto
- Predicción de gastos o detección de anomalías
- Sincronización con más de 2 cuentas Gmail
- UI propia (app web o móvil) — Google Sheets es el frontend en v1
- Presupuestos, metas de ahorro o comparativas históricas automáticas
- Exportación de reportes en PDF o Excel
- Soporte para más de 2 usuarios (multi-tenancy)
- Ejecución en tiempo real (el trigger diario es suficiente para v1)
- Edición o corrección de gastos desde el pipeline (solo inserción)
