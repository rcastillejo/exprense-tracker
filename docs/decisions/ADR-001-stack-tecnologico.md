# ADR-001: Stack tecnológico para ingesta y visualización de gastos por email

## Status: Accepted
## Date: 2026-04-01
## Deciders: Ricardo (Tech Lead / Fundador)

---

## Context

Finanzas C&C necesita consolidar gastos de 2 usuarios que reciben notificaciones
por Gmail desde BCP, Interbank, BBVA, Scotiabank y Yape/Plin. Cada banco usa un
formato de email distinto. No existe API bancaria peruana disponible públicamente.

El sistema debe:
- Operar con costo $0/mes en infraestructura
- Entregarse en semanas, no meses
- No requerir conocimiento técnico para usarlo
- Cubrir exactamente 2 usuarios en v1

Ver contexto completo en: `docs/problem-statement.md`

---

## Options considered

### Opción A — Google Apps Script + Google Sheets ✅ ELEGIDA

**Descripción:** Pipeline completo usando Gmail API nativa de Apps Script,
parsers por banco en JavaScript, Claude API para categorización, y Google
Sheets como almacenamiento y dashboard.

| Criterio | Peso | Score | Ponderado |
|---|---|---|---|
| Time to market | 30% | 5 | 1.50 |
| Costo operativo | 25% | 5 | 1.25 |
| Escalabilidad | 20% | 2 | 0.40 |
| Ecosistema Gmail | 15% | 5 | 0.75 |
| Riesgo técnico | 10% | 5 | 0.50 |
| **Total** | | | **4.35** |

**Pros:**
- Acceso nativo a Gmail sin OAuth adicional
- Costo $0 (free tier cubre 2 usuarios holgadamente)
- Setup en días
- Ricardo tiene experiencia previa con esta stack

**Contras:**
- Escalabilidad limitada (>10 usuarios requiere migración)
- Sin UI propia — depende de Sheets como frontend
- Límite 6min/ejecución en Apps Script

---

### Opción B — n8n / Make (no-code)

| Criterio | Peso | Score | Ponderado |
|---|---|---|---|
| Time to market | 30% | 5 | 1.50 |
| Costo operativo | 25% | 2 | 0.50 |
| Escalabilidad | 20% | 3 | 0.60 |
| Ecosistema Gmail | 15% | 4 | 0.60 |
| Riesgo técnico | 10% | 4 | 0.40 |
| **Total** | | | **3.60** |

**Descartada por:** Costo mensual $20-50, lock-in en plataforma no-code,
menor flexibilidad para parsers de bancos peruanos.

---

### Opción C — Firebase + Cloud Functions

| Criterio | Peso | Score | Ponderado |
|---|---|---|---|
| Time to market | 30% | 3 | 0.90 |
| Costo operativo | 25% | 4 | 1.00 |
| Escalabilidad | 20% | 5 | 1.00 |
| Ecosistema Gmail | 15% | 3 | 0.45 |
| Riesgo técnico | 10% | 3 | 0.30 |
| **Total** | | | **3.65** |

**Descartada por:** Overhead de setup innecesario para 2 usuarios,
costo variable impredecible, curva de aprendizaje mayor.

---

### Opción D — Next.js + Supabase

| Criterio | Peso | Score | Ponderado |
|---|---|---|---|
| Time to market | 30% | 3 | 0.90 |
| Costo operativo | 25% | 3 | 0.75 |
| Escalabilidad | 20% | 5 | 1.00 |
| Ecosistema Gmail | 15% | 3 | 0.45 |
| Riesgo técnico | 10% | 3 | 0.30 |
| **Total** | | | **3.40** |

**Descartada por:** Overkill para 2 usuarios, requiere hosting,
tiempo de setup de semanas.

---

## Decision

**Google Apps Script + Google Sheets** como stack completo de v1.

### Componentes

| Componente | Tecnología | Rol |
|---|---|---|
| Ingesta de email | Gmail API (Apps Script nativa) | Leer emails por remitente/banco |
| Parsers | Apps Script (JavaScript) + Regex | Extraer monto, fecha, comercio por banco |
| Categorización | Claude API (claude-haiku-4-5) | Clasificar gastos ambiguos |
| Almacenamiento | Google Sheets | Base de datos de gastos |
| Dashboard | Google Sheets + fórmulas | Vista consolidada mensual |
| Trigger | Apps Script time-driven trigger | Ejecución diaria automática |

### Arquitectura overview

```
Gmail Usuario 1 ──┐
                  ├──► Apps Script (trigger diario)
Gmail Usuario 2 ──┘         │
                             ├──► Parser BCP       ──┐
                             ├──► Parser Interbank  ──┤
                             ├──► Parser BBVA       ──┼──► Claude API
                             ├──► Parser Scotiabank ──┤   (categorización)
                             └──► Parser Yape/Plin  ──┘         │
                                                                 ▼
                                                      Google Sheets
                                                      (storage + dashboard)
```

---

## Consequences

### Facilita ✅
- Setup completo en menos de 1 semana
- Costo operativo $0 indefinidamente para 2 usuarios
- No requiere infraestructura externa ni servidores
- Dashboard inmediato con Sheets sin desarrollo adicional
- Acceso a Gmail de ambos usuarios sin configuración OAuth compleja

### Complica ⚠️
- Escalar a más de 10 usuarios requiere migrar a Cloud Functions
- Sin UI propia: el frontend es Google Sheets
- Límites de Apps Script: 6 min/ejecución, ~100 emails/día por usuario
- Depuración más limitada que un entorno Node.js estándar

### Deuda técnica aceptada conscientemente
- Parsers de email por banco son frágiles: si el banco cambia el formato
  del email, el parser se rompe y requiere actualización manual.
- Mitigación: Claude API como fallback para emails no parseados por regex.

---

## Migration trigger

Migrar a Firebase + Next.js (o equivalente) cuando se cumpla alguna de estas condiciones:

| Condición | Indicador |
|---|---|
| Usuarios activos > 10 | Apps Script free tier insuficiente |
| Necesidad de UI móvil propia | Sheets no es suficiente como frontend |
| Procesamiento diario > 500 emails | Límites de tiempo de ejecución |
| Requerimiento de tiempo real | Trigger diario no es suficiente |

---

## Referencias

- Problem Statement: `docs/problem-statement.md`
- Gmail API en Apps Script: https://developers.google.com/apps-script/reference/gmail
- Claude API pricing: https://www.anthropic.com/pricing