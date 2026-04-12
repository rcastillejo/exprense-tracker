# Tasks — Spec Driven Development (SDD) Workflow

## Issue: #10 — Spike: adoptar spec driven development
## Version: v1.0
## Date: 2026-04-12
## Status: In Progress

---

## Dependencias entre tareas

```
TASK-01 (CLAUDE.md)
    │
    ├──► TASK-02 (sdd-workflow-guide.md)   [depende de TASK-01 para referencias]
    │
    └──► TASK-03 (validate-specs.sh)        [independiente]

TASK-04 (claude-review.yml)                [manual — requiere permiso de workflow]
    └── depende de TASK-01 (CLAUDE.md existente)
```

---

## TASK-01 — Crear CLAUDE.md

**Dependencias:** ninguna
**Prioridad:** Alta
**Archivos afectados:** `CLAUDE.md` (crear)

### Descripción

Crear el archivo `CLAUDE.md` en la raíz del repositorio con las instrucciones globales para el agente Claude. Este archivo es cargado automáticamente por `claude-code-action` como contexto del sistema en cada ejecución del workflow.

### Criterios de aceptación (US-06, DT-006)

- [ ] El archivo existe en la raíz del repositorio
- [ ] Incluye referencia al stack tecnológico (Google Apps Script + GitHub Actions)
- [ ] Incluye instrucciones del workflow SDD (qué leer antes de actuar, cómo referir issues)
- [ ] Incluye convenciones de commits (prefijo feat|fix|docs|chore|test + referencia #N)
- [ ] Incluye restricciones explícitas (no push a main, no modificar workflows sin instrucción)

---

## TASK-02 — Crear docs/sdd-workflow-guide.md

**Dependencias:** TASK-01 (referencia CLAUDE.md en la guía)
**Prioridad:** Alta
**Archivos afectados:** `docs/sdd-workflow-guide.md` (crear)

### Descripción

Crear la guía de uso del workflow SDD dirigida al product owner. Debe explicar el ciclo completo: cómo crear un issue, qué comandos usar, qué esperar en cada fase, y cómo interpretar los artefactos generados.

### Criterios de aceptación (US-05, US-06)

- [ ] El archivo existe en `docs/`
- [ ] Describe el ciclo completo: issue → requirements → design → implementación → PR → merge
- [ ] Lista los comandos disponibles: `@claude`, `@claude-approve-requirements`, `@claude-approve-design`
- [ ] Explica qué genera el agente en cada fase y dónde encontrarlo
- [ ] Incluye ejemplo de issue bien formado
- [ ] Incluye instrucciones para revisar specs en la rama `sdd/issue-N-*`
- [ ] Explica la estructura de directorios `.specs/<N>-feature/`

---

## TASK-03 — Crear scripts/validate-specs.sh

**Dependencias:** ninguna
**Prioridad:** Media
**Archivos afectados:** `scripts/validate-specs.sh` (crear)

### Descripción

Script de validación que verifica que los archivos de spec tienen la estructura requerida. Actúa como "test unitario" del workflow SDD, verificando que requirements.md y design.md tienen las secciones obligatorias antes de que el agente avance a la siguiente fase.

### Criterios de aceptación (US-04)

- [ ] El script existe y es ejecutable
- [ ] Valida que `requirements.md` tiene las secciones: User Stories, Criterios de aceptación, Restricciones técnicas, Fuera de alcance
- [ ] Valida que `design.md` tiene las secciones: Arquitectura, Decisiones técnicas, Impacto en codebase
- [ ] Valida que cada scenario en requirements.md tiene los bloques GIVEN/WHEN/THEN
- [ ] Retorna código de salida 0 si todas las validaciones pasan, 1 si alguna falla
- [ ] Imprime mensajes claros sobre qué validación falló y en qué archivo
- [ ] Acepta el número de issue como argumento: `./scripts/validate-specs.sh 10`

---

## TASK-04 — Actualizar claude-review.yml (manual)

**Dependencias:** TASK-01
**Prioridad:** Alta
**Archivos afectados:** `.github/workflows/claude-review.yml` (actualizar)

> ⚠️ **Esta tarea no puede ser ejecutada por el agente.** Los archivos en `.github/workflows/` requieren permisos especiales que el agente no tiene en este repositorio.

### Descripción

Actualizar el prompt del job `spec-review` en `claude-review.yml` para que falle con `exit 1` si el directorio `.specs/<issue-id>-feature/` no existe en el repositorio al revisar un PR.

### Cambio requerido (aplicar manualmente)

Agregar al inicio del `prompt:` en el job `spec-review`:

```yaml
prompt: |
  IMPORTANTE: Antes de revisar el código, verifica la existencia de specs.
  
  1. Extrae el número de issue desde el título del PR (formato "#N" o "issue-N")
  2. Verifica si existe el directorio .specs/{issue-number}-feature/
  3. Si NO existe el directorio:
     - Publica un comentario en el PR:
       "❌ Especificación faltante: No se encontró `.specs/{issue-number}-feature/`. 
        El workflow SDD requiere que existan las specs antes de aprobar código.
        Crea el directorio y los archivos requirements.md + design.md antes de continuar."
     - Ejecuta: exit 1
  4. Si SÍ existe, continúa con la revisión normal...
  [resto del prompt actual]
```

### Pre-requisito adicional (configurar en GitHub)

Activar branch protection en `main` con required status check `spec-review`:
- GitHub → Settings → Branches → Branch protection rules
- Rama: `main`
- Activar: "Require status checks to pass before merging"
- Agregar check: `spec-review`

---

## Resumen de entregables

| Task | Archivo | Tipo | Estado |
|---|---|---|---|
| TASK-01 | `CLAUDE.md` | Crear | ✅ Completado |
| TASK-02 | `docs/sdd-workflow-guide.md` | Crear | ✅ Completado |
| TASK-03 | `scripts/validate-specs.sh` | Crear | ✅ Completado |
| TASK-04 | `.github/workflows/claude-review.yml` | Manual | ⏳ Pendiente (manual) |
