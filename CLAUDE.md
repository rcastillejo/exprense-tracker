# CLAUDE.md — Instrucciones para el agente Claude

## Contexto del proyecto

- Problema de negocio: `docs/problem-statement.md`
- Stack tecnológico y restricciones: `docs/decisions/ADR-001-stack-tecnologico.md`

**Resumen:** Finanzas C&C es un sistema de gestión de gastos familiares implementado en Google Apps Script + Google Sheets. El desarrollo sigue el workflow Spec Driven Development (SDD) con compuertas de aprobación explícitas entre fases.

---

## Stack tecnológico

| Componente | Tecnología |
|---|---|
| Implementación | Google Apps Script (JavaScript) |
| Almacenamiento | Google Sheets |
| CI/CD | GitHub Actions + `anthropics/claude-code-action@v1` |
| Modelo de IA | `claude-sonnet-4-6` (o superior) |
| Formato de specs | Markdown (`.md`) en `.specs/<N>-feature/` |

---

## Workflow SDD — Instrucciones por fase

### Antes de cualquier acción

1. Lee `docs/problem-statement.md` para entender el contexto del negocio
2. Lee `docs/decisions/ADR-001-stack-tecnologico.md` para restricciones del stack
3. Identifica el número del issue activo (N) desde el contexto del workflow

### Fase 1 — Requirements

Al generar `requirements.md`:
- Crea el archivo en `.specs/<N>-feature/requirements.md`
- Incluye: user stories (As a / I want / so that), criterios GIVEN/WHEN/THEN, restricciones técnicas, sección fuera de alcance
- Marca el status como `Draft` al crear, `Approved` cuando el product owner apruebe
- Termina el comentario indicando: `Responder con @claude-approve-requirements para continuar`

### Fase 2 — Design

Al generar `design.md` (requiere `@claude-approve-requirements`):
- Lee `.specs/<N>-feature/requirements.md` antes de escribir una sola línea
- Crea el archivo en `.specs/<N>-feature/design.md`
- Incluye: arquitectura propuesta, diagrama de secuencia Mermaid, decisiones técnicas (DT-XXX), impacto en codebase existente
- No propongas tecnologías fuera del stack de ADR-001 sin justificarlo como nueva decisión técnica
- Termina el comentario indicando: `Responder con @claude-approve-design para continuar`

### Fase 3 — Implementación

Al implementar (requiere `@claude-approve-design`):
- Lee `.specs/<N>-feature/requirements.md` Y `.specs/<N>-feature/design.md` antes de escribir código
- Genera primero `.specs/<N>-feature/tasks.md` con tareas secuenciadas y dependencias
- Implementa solo lo especificado en `design.md` — sin agregar funcionalidades no solicitadas
- Si detectas un gap en el design durante la implementación: documéntalo en el comentario del PR, propón corrección, no continúes sin confirmación
- Abre un PR al finalizar con referencia al issue `#N` en el body

---

## Convenciones de commits

```
<tipo>: <descripción corta> (#N)

Tipos: feat | fix | docs | chore | test | refactor
```

Ejemplos:
- `feat: agregar validación de categorías de gasto (#7)`
- `docs: generar requirements para workflow SDD (#10)`
- `fix: corregir cálculo de totales mensuales (#5)`

Cuando el trigger user lo indica, incluir:
```
Co-authored-by: <usuario> <usuario@users.noreply.github.com>
```

---

## Restricciones del agente

- **No hacer push a `main` directamente** — todo código va via PR
- **No crear branches adicionales** al asignado por el workflow (`sdd/issue-<N>-<date>`)
- **No modificar `.github/workflows/`** sin instrucción explícita del product owner
- **No instalar dependencias externas** — no hay `package.json` ni sistema de paquetes
- **No avanzar de fase automáticamente** — cada transición requiere comando explícito del product owner
- **No implementar nada fuera del scope** definido en `design.md` de la fase actual

---

## Estructura de directorios de specs

```
.specs/
└── <issue-id>-feature/
    ├── requirements.md    # Fase 1: User stories + GIVEN/WHEN/THEN (status: Draft/Revised/Approved)
    ├── design.md          # Fase 2: Arquitectura + decisiones técnicas (status: Draft/Approved)
    └── tasks.md           # Fase 3: Tareas de implementación (generado al iniciar implementación)
```

**Nomenclatura:** `<issue-id>` es el número del issue de GitHub (ej: `10-feature` para el issue #10)

---

## Trazabilidad requerida

Cada artefacto del workflow SDD debe referenciar su origen:
- `requirements.md` → referencia el issue #N en el encabezado
- `design.md` → referencia el `requirements.md` aprobado
- `tasks.md` → referencia el `design.md` aprobado
- Commits → incluyen `(#N)` en el mensaje
- PR → incluye `Resuelve #N` en el body
