# Requirements — Spec Driven Development (SDD) Workflow

## Issue: #10 — Spike: adoptar spec driven development
## Version: v1.0
## Date: 2026-04-11
## Status: Approved

---

## Contexto

Ver [`docs/problem-statement.md`](../../docs/problem-statement.md) y [`docs/decisions/ADR-001-stack-tecnologico.md`](../../docs/decisions/ADR-001-stack-tecnologico.md).

El proyecto Finanzas C&C necesita una metodología de trabajo orientada a agentes que cubra el ciclo completo de desarrollo de software: requerimientos, análisis y diseño, implementación, ejecución, pruebas y monitoreo. La metodología debe permitir que agentes de IA (Claude) interpreten specs estructuradas y ejecuten cada fase del ciclo con mínima intervención manual.

### Tendencias del mercado evaluadas

El mercado de desarrollo asistido por IA está convergiendo hacia **Spec Driven Development (SDD)** como metodología estándar para workflows agénticos:

| Tendencia | Descripción | Relevancia para este proyecto |
|---|---|---|
| **Spec-first AI coding** | GitHub Copilot Workspace, Cursor, Devin — todos requieren specs/issues como input antes de generar código | Valida el enfoque: el agente necesita specs para operar |
| **BDD como lenguaje universal** | Gherkin (GIVEN/WHEN/THEN) es el formato más adoptado para specs legibles por humanos y máquinas | Base para los criterios de aceptación en este proyecto |
| **Claude Code Action** | GitHub Actions que ejecutan Claude como agente CI/CD sobre issues y PRs | Stack tecnológico ya adoptado en este repositorio |
| **Agentic SDLC** | Empresas como Anthropic, OpenAI y Google están definiendo frameworks de ciclos de vida completos con agentes en cada fase | Marco de referencia para el flujo requirements → design → impl → test |
| **Spec como contrato** | Los specs en `.specs/` actúan como contrato entre el product owner y el agente, reemplazando el backlog tradicional | Patrón implementado en este repositorio con `.specs/4-feature/` |

---

## User Stories

### US-01 — Captura de requerimientos estructurada

**As a** product owner del proyecto,
**I want** definir los requerimientos de una nueva feature en un archivo `requirements.md` estandarizado,
**so that** el agente de IA pueda interpretar el alcance y generar el diseño técnico sin ambigüedad.

#### Criterios de aceptación

**Scenario 1 — requirements.md generado para un issue nuevo**
```
GIVEN que existe un issue en GitHub con descripción del problema o feature
  AND el issue tiene criterios de aceptación en lenguaje natural
WHEN el agente recibe la instrucción de generar requirements.md
THEN se crea el archivo en `.specs/<issue-id>-feature/requirements.md`
  AND el archivo contiene user stories en formato "As a / I want / so that"
  AND cada user story tiene criterios de aceptación en formato GIVEN/WHEN/THEN
  AND el archivo incluye restricciones técnicas alineadas al ADR vigente
  AND el archivo incluye una sección "Fuera de alcance"
```

**Scenario 2 — requirements.md rechazado por el product owner**
```
GIVEN que el agente ha generado un requirements.md
  AND el product owner revisa el documento en el Draft PR y detecta ambigüedades o errores
WHEN el product owner comenta en el PR del ciclo SDD con @claude + correcciones
THEN el agente actualiza el requirements.md incorporando el feedback
  AND genera una nueva versión sin crear un archivo duplicado
  AND el status del archivo pasa a "Revised"
```

**Scenario 3 — requirements.md aprobado**
```
GIVEN que el agente ha generado un requirements.md
  AND el product owner responde con "@claude-approve-requirements"
WHEN el agente recibe la aprobación
THEN el agente genera el archivo design.md en el mismo directorio
  AND el status de requirements.md pasa a "Approved"
  AND se notifica en el issue que el diseño está listo para revisión
```

---

### US-02 — Diseño técnico derivado de requerimientos

**As a** developer del proyecto,
**I want** que el agente genere un `design.md` basado en el `requirements.md` aprobado,
**so that** la implementación tenga una arquitectura definida antes de escribir código.

#### Criterios de aceptación

**Scenario 1 — design.md generado exitosamente**
```
GIVEN que existe un requirements.md con status "Approved"
  AND el agente tiene acceso a los ADRs y al problem statement
WHEN el agente recibe la instrucción de generar design.md
THEN se crea `.specs/<issue-id>-feature/design.md`
  AND el archivo contiene la arquitectura propuesta en texto y/o diagramas ASCII
  AND las decisiones técnicas están alineadas al stack definido en ADR-001
  AND el archivo incluye la estructura de archivos propuesta
  AND el archivo incluye el impacto en el codebase existente
```

**Scenario 2 — design.md con restricciones de plataforma**
```
GIVEN que el diseño propuesto requiere tecnologías fuera del stack de ADR-001
WHEN el agente genera design.md
THEN el agente documenta la desviación del ADR como una nueva decisión técnica (DT-XXX)
  AND justifica por qué el stack existente no es suficiente para esta feature
  AND propone un migration trigger si aplica
```

---

### US-03 — Implementación guiada por specs

**As a** developer del proyecto,
**I want** que el agente implemente el código a partir del `design.md` aprobado,
**so that** el código generado sea consistente con las specs y los criterios de aceptación.

#### Criterios de aceptación

**Scenario 1 — Implementación iniciada desde design.md**
```
GIVEN que existe un design.md con status "Approved"
  AND el agente tiene acceso al repositorio y a las herramientas de edición
WHEN el agente recibe la instrucción de implementar
THEN el agente crea los archivos definidos en la sección "Estructura de archivos" del design.md
  AND cada archivo implementa exactamente lo especificado en su módulo correspondiente
  AND el código no introduce dependencias no contempladas en el design.md
```

**Scenario 2 — Desvío de specs durante implementación**
```
GIVEN que durante la implementación el agente detecta que el design.md tiene un gap o error
WHEN el agente no puede implementar un módulo como fue diseñado
THEN el agente documenta el gap en un comentario del PR
  AND propone una corrección al design.md
  AND no continúa con la implementación hasta recibir confirmación
```

---

### US-04 — Verificación automática contra criterios de aceptación

**As a** developer del proyecto,
**I want** que el agente genere o valide tests alineados con los criterios GIVEN/WHEN/THEN del requirements.md,
**so that** cada user story tenga cobertura verificable y no se rompan features existentes.

#### Criterios de aceptación

**Scenario 1 — Tests derivados de criterios de aceptación**
```
GIVEN que existe un requirements.md con criterios GIVEN/WHEN/THEN
  AND existe una implementación en el codebase
WHEN el agente genera o valida los tests
THEN cada scenario del requirements.md tiene al menos un test correspondiente
  AND el nombre del test referencia el ID del scenario (ej. "US-01 Scenario 1")
  AND los tests pasan con la implementación generada
```

**Scenario 2 — Regresión detectada**
```
GIVEN que el agente implementa una nueva feature
  AND existen tests de features anteriores
WHEN el agente ejecuta los tests
THEN si algún test existente falla, el agente lo reporta antes de hacer commit
  AND no hace push hasta que la regresión esté resuelta o documentada
```

---

### US-05 — Trazabilidad entre issue, spec e implementación

**As a** product owner del proyecto,
**I want** poder navegar desde un issue de GitHub hasta el código implementado pasando por la spec,
**so that** pueda auditar qué se implementó, por qué y cómo.

#### Criterios de aceptación

**Scenario 1 — Trazabilidad completa**
```
GIVEN que existe un issue #N con su correspondiente .specs/<N>-feature/
WHEN reviso el directorio .specs/<N>-feature/
THEN encuentro requirements.md con referencia al issue original
  AND encuentro design.md con referencia al requirements.md
  AND el PR de implementación referencia el issue #N en su descripción
  AND los commits del PR tienen mensaje que referencia el issue #N
```

**Scenario 2 — Directorio de specs faltante**
```
GIVEN que existe un PR que implementa una feature
  AND no existe el directorio .specs/ correspondiente al issue
WHEN el agente revisa el PR
THEN el agente bloquea el merge y solicita la creación de las specs
  AND indica el path esperado del directorio de specs
```

---

### US-06 — Flujo de trabajo completo con aprobaciones

**As a** product owner del proyecto,
**I want** controlar las transiciones entre fases del ciclo de desarrollo mediante comandos explícitos,
**so that** ninguna fase avance sin mi revisión y aprobación.

#### Criterios de aceptación

**Scenario 1 — Flujo completo sin interrupciones**
```
GIVEN que el product owner crea un issue con descripción y criterios
WHEN el issue es creado o asignado en GitHub
THEN el agente genera requirements.md en rama sdd/issue-N y espera aprobación
  AND un Draft PR se abre automáticamente (sdd/issue-N → main) al finalizar requirements
  AND al recibir "@claude-approve-requirements" en el issue, genera design.md y espera aprobación
  AND al recibir "@claude-approve-design" en el issue, inicia la implementación
  AND al completar la implementación, el Draft PR pasa a Ready for Review
  AND el product owner revisa el PR y hace merge manualmente
```

**Scenario 2 — Fase rechazada**
```
GIVEN que el product owner revisa un documento generado por el agente
  AND detecta errores o cambios necesarios
WHEN el product owner comenta con correcciones (sin usar el comando de aprobación)
THEN el agente actualiza el documento según el feedback
  AND vuelve a notificar que el documento está listo para revisión
  AND no avanza a la siguiente fase automáticamente
```

---

## Estructura de directorios de specs

```
.specs/
└── <issue-id>-feature/
    ├── requirements.md    # User stories + criterios GIVEN/WHEN/THEN
    └── design.md          # Arquitectura + decisiones técnicas + estructura de archivos
```

### Convenciones de nomenclatura

| Campo | Formato | Ejemplo |
|---|---|---|
| Directorio | `<issue-id>-feature` | `10-feature` |
| Issue ID | Número del issue de GitHub | `10` |
| Status de documentos | `Draft` → `Revised` → `Approved` | `Draft` |
| IDs de User Story | `US-NN` (dos dígitos) | `US-01` |
| IDs de Scenario | `Scenario N` dentro de cada US | `Scenario 1` |

---

## Restricciones técnicas (alineadas a ADR-001)

| Restricción | Detalle |
|---|---|
| **Agente de IA** | Claude (claude-sonnet-4-6 o superior) via GitHub Actions (claude-code-action) |
| **Formato de specs** | Markdown — sin herramientas externas de gestión de requerimientos |
| **Almacenamiento de specs** | Repositorio Git — las specs son código, versionadas junto al proyecto |
| **Stack de implementación** | Google Apps Script (JavaScript) — sin cambiar el stack de ADR-001 para features v1 |
| **Interfaz de comandos** | Comentarios en GitHub Issues/PRs — sin UI adicional para el workflow agéntico |
| **Costo del workflow** | $0/mes adicionales — el workflow usa el free tier de GitHub Actions y Claude API ya disponible |
| **Modelo de aprobación** | Aprobación explícita requerida entre fases — el agente no avanza automáticamente |

---

## Flujo de trabajo agéntico (resumen)

```
Issue creado/asignado (GitHub)
       │
       ▼
GA crea rama sdd/issue-N + Agente genera requirements.md
       │
       ├──► Draft PR abierto automáticamente (sdd/issue-N → main)
       │
       ▼
Product owner revisa en Draft PR
       │                    │
       │◄── @claude en PR ──┘  (correcciones)
       │
  @claude-approve-requirements (en issue)
       │
       ▼
Agente marca requirements Approved + genera design.md
       │
       ▼
Product owner revisa en Draft PR
       │                    │
       │◄── @claude en PR ──┘  (correcciones)
       │
  @claude-approve-design (en issue)
       │
       ▼
Agente marca design Approved + implementa código
       │
       ▼
Draft PR → Ready for Review ──► Product owner hace merge
```

---

## Fuera de alcance (v1 del workflow SDD)

- Integración con herramientas de gestión de proyectos externas (Jira, Linear, Notion)
- Generación automática de tests unitarios como parte del workflow (se documenta como mejora futura)
- Métricas de velocidad del equipo o estimaciones automáticas
- Flujo de onboarding para múltiples desarrolladores (v1 asume un solo product owner / developer)
- Comandos de rollback agéntico (revertir una fase ya aprobada)
- Soporte para monorepos con múltiples stacks tecnológicos
- Notificaciones fuera de GitHub (Slack, email) sobre el estado del workflow
- Aprobaciones automáticas basadas en reglas (toda aprobación es manual y explícita en v1)
