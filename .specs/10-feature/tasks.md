# Tasks — Spec Driven Development (SDD) Workflow

## Issue: #10 — Spike: adoptar spec driven development
## Version: v1.0
## Date: 2026-04-12
## Status: In Progress

---

## Resumen de implementación

Este archivo documenta las tareas de implementación del workflow SDD Alt 2 (DT-003), derivadas de `.specs/10-feature/design.md` aprobado.

---

## Tareas completadas

### [x] T-01 — Implementar `sdd-feature.yml` con Alt 2 (DT-003)

**Descripción:** Crear el workflow de GitHub Actions con tres jobs (`sdd-requirements`, `sdd-design`, `sdd-implement`) usando rama determinística `sdd/issue-<N>` y Draft PR automático.

**Artefactos:**
- `.github/workflows/sdd-feature.yml` ✅

**Criterios:**
- [x] Rama determinística `sdd/issue-N` (sin timestamp) con idempotencia via `git ls-remote --exit-code`
- [x] Draft PR automático al finalizar `sdd-requirements` con verificación `PR_EXISTS`
- [x] `sdd-design` e `sdd-implement` hacen checkout de `sdd/issue-N` existente
- [x] `branch_prefix` eliminado en los tres jobs
- [x] `--allowedTools` explícitos en los tres jobs
- [x] Paso 0 en `sdd-design`: marcar `requirements.md` como Approved
- [x] Paso 0 en `sdd-implement`: marcar `design.md` como Approved
- [x] Conversión Draft PR → Ready for Review al finalizar `sdd-implement`
- [x] Mensajes de commit referencian `#N`
- [x] Instrucción "no crees una rama nueva" en los tres prompts

**Commits:** `8cac0d5`, `ff05362`, `81f3c0b`

---

### [x] T-02 — Actualizar `.specs/10-feature/design.md`

**Descripción:** Actualizar el design.md para reflejar la implementación Alt 2 / DT-003.

**Criterios:**
- [x] DT-003 actualizado con justificación del modelo Draft PR
- [x] Diagrama ASCII actualizado: `sdd/issue-N` sin wildcard
- [x] Diagrama Mermaid reescrito para reflejar Alt 2
- [x] Consideraciones de seguridad: rama creada por workflow, no por agente
- [x] DT-005: aclaración de que `branch_prefix` no se usa en Alt 2

**Commits:** `8cac0d5`, `ff05362`, `81f3c0b`

---

### [x] T-03 — Actualizar `.specs/10-feature/requirements.md`

**Descripción:** Alinear requirements.md con la implementación real.

**Criterios:**
- [x] US-01 S2: feedback via Draft PR, no issue
- [x] US-06 S1: trigger es `issues.opened/assigned`, Draft PR automático, `gh pr ready` al finalizar
- [x] Flujo de trabajo agéntico (resumen) refleja el modelo Alt 2

**Commits:** `ff05362`, `81f3c0b`

---

### [x] T-04 — Crear `CLAUDE.md`

**Descripción:** Instrucciones persistentes para el agente: stack, convenciones, restricciones, flujo SDD.

**Artefactos:**
- `CLAUDE.md` ✅

**Criterios:**
- [x] Stack tecnológico documentado
- [x] Flujo SDD documentado (comandos, fases, orden de lectura)
- [x] Convenciones de commits
- [x] Convenciones de código (GAS)
- [x] Restricciones del agente
- [x] Archivos de solo lectura identificados

---

### [x] T-05 — Crear `docs/sdd-workflow-guide.md`

**Descripción:** Guía de uso del workflow SDD para el product owner.

**Artefactos:**
- `docs/sdd-workflow-guide.md` ✅

**Criterios:**
- [x] Flujo completo paso a paso documentado
- [x] Referencia rápida de comandos
- [x] Ubicación de artefactos
- [x] Reglas importantes
- [x] Resolución de problemas comunes

---

## Tareas pendientes (trabajo futuro)

### [ ] T-06 — Actualizar `claude-review.yml` (US-05 S2)

**Descripción:** Agregar verificación de `.specs/<issue-id>-feature/` y bloqueo de merge si no existe.

**Prioridad:** Alta

**Bloqueante:** Requiere permisos de workflow en el token (`workflows` scope). El GitHub App de `claude-code-action` no tiene este permiso por defecto.

**Criterios:**
- [ ] Job `spec-review` extrae número de issue del título/body del PR
- [ ] Verifica existencia de `.specs/<issue-id>-feature/`
- [ ] Si no existe: comentario bloqueante en PR + job falla (exit code != 0)
- [ ] Branch protection en `main` requiere `spec-review` como status check

**Activación:** Configurar branch protection rule en GitHub → Settings → Branches → `main` → Require status checks → `spec-review`

---

### [ ] T-07 — Agregar `Bash(gh pr comment:*)` en `sdd-implement` (US-03 S2)

**Descripción:** Habilitar al agente para documentar gaps de design en comentarios del PR (no solo del issue).

**Prioridad:** Alta

**Bloqueante:** Requiere permisos de workflow.

**Cambios requeridos en `sdd-feature.yml`:**
```yaml
# job sdd-implement, claude_args:
--allowedTools "Bash(git add:*),Bash(git commit:*),Bash(git push:*),Bash(git checkout:*),Read,Write,Edit,Bash(gh issue comment:*),Bash(gh pr comment:*)"
```
```
# Agregar al prompt de sdd-implement:
Si durante la implementación detectas que el design.md tiene un gap o error que impide
implementar un módulo como fue diseñado:
1. Documenta el gap con `gh pr comment --body "..."` en el PR del ciclo SDD
2. No continúes con la implementación de ese módulo hasta recibir confirmación (US-03 Scenario 2)
```

---

### [ ] T-08 — Cubrir US-04 S1/S2 en prompts de `sdd-implement`

**Descripción:** Agregar instrucciones en el prompt de `sdd-implement` para referenciar IDs de scenario en tests y bloquear push si tests existentes fallan.

**Prioridad:** Media

**Bloqueante:** Requiere permisos de workflow.

**Cambios en prompt de `sdd-implement`:**
```
- Los nombres de los tests deben referenciar el ID del scenario (ej. "US-01 Scenario 1")
- Antes de hacer commit, ejecuta los tests existentes; si alguno falla, repórtalo sin hacer push
```

---

### [ ] T-09 — Actualizar estado del PR body en `sdd-design` y `sdd-implement`

**Descripción:** Actualizar el cuerpo del Draft PR para reflejar el estado actual del ciclo (REQUIREMENTS IN REVIEW → DESIGN IN REVIEW → IMPLEMENTATION IN PROGRESS).

**Prioridad:** Baja

**Bloqueante:** Requiere permisos de workflow.

---

### [ ] T-10 — Homogenizar `fetch-depth` en fases 2 y 3

**Descripción:** Cambiar `fetch-depth: 1` a `fetch-depth: 0` en `sdd-design` y `sdd-implement` para consistencia con `sdd-requirements`.

**Prioridad:** Baja

**Bloqueante:** Requiere permisos de workflow.

---

## Trazabilidad

| Tarea | User Story | Status |
|---|---|---|
| T-01 | US-01 S1, US-06 S1/S2, DT-003 | ✅ Completada |
| T-02 | DT-003, DT-005 | ✅ Completada |
| T-03 | US-01 S2, US-06 S1 | ✅ Completada |
| T-04 | DT-006 | ✅ Completada |
| T-05 | US-06 S1 (guía de uso) | ✅ Completada |
| T-06 | US-05 S2 | ⏳ Pendiente (requiere permisos workflow) |
| T-07 | US-03 S2 | ⏳ Pendiente (requiere permisos workflow) |
| T-08 | US-04 S1/S2 | ⏳ Pendiente (requiere permisos workflow) |
| T-09 | — | ⏳ Pendiente (requiere permisos workflow) |
| T-10 | — | ⏳ Pendiente (requiere permisos workflow) |
