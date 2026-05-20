# Guía de uso — Workflow SDD (Spec Driven Development)

## Versión: v1.0
## Fecha: 2026-04-12

---

## ¿Qué es el workflow SDD?

El workflow SDD permite al product owner dirigir el desarrollo de una nueva feature a través de tres fases estructuradas, con un agente de IA (Claude) ejecutando cada fase y esperando aprobación explícita antes de avanzar.

```
Issue → Requirements → Design → Implementación → PR listo para merge
```

Cada fase produce un artefacto en `.specs/<issue-id>-feature/` que puede revisarse directamente en GitHub.

---

## Requisitos previos

- Acceso de escritura al repositorio `rcastillejo/exprense-tracker`
- Capacidad de crear issues y comentar en GitHub

---

## Flujo completo paso a paso

### Fase 1 — Crear el issue

1. Ve a **Issues → New issue** en el repositorio
2. Escribe una descripción clara del problema o feature que necesitas
3. Incluye criterios de aceptación en lenguaje natural (qué debe hacer, qué no debe hacer)
4. Asigna el issue a cualquier colaborador (o a ti mismo) para activar el workflow
5. El agente generará automáticamente `.specs/<N>-feature/requirements.md` y abrirá un **Draft PR**

**Resultado esperado:** Un Draft PR aparece en el repositorio con el archivo `requirements.md` generado.

---

### Fase 1 — Revisar requirements.md

1. Abre el Draft PR (lo encontrarás en **Pull requests** con el título `feat: SDD cycle for issue #N`)
2. Revisa el archivo `.specs/<N>-feature/requirements.md` en la pestaña **Files changed**
3. Verifica que las user stories y criterios GIVEN/WHEN/THEN reflejen lo que necesitas

**Si necesitas correcciones:**
```
@claude [descripción de las correcciones]
```
Comenta esto **en el PR** (no en el issue). El agente actualizará el documento y notificará cuando esté listo.

**Si el documento está correcto:**
Avanza a la siguiente fase con el comando de aprobación (ver abajo).

---

### Aprobación de Requirements → Design

Comenta esto **en el issue** (no en el PR):
```
@claude-approve-requirements
```

El agente:
1. Marca `requirements.md` como `Approved`
2. Genera `.specs/<N>-feature/design.md` con arquitectura y decisiones técnicas
3. Notifica en el issue que el diseño está listo

---

### Fase 2 — Revisar design.md

1. Abre el mismo Draft PR
2. Revisa el archivo `.specs/<N>-feature/design.md`
3. Verifica la arquitectura propuesta, decisiones técnicas e impacto en el codebase

**Si necesitas correcciones:**
```
@claude [descripción de las correcciones al design]
```
Comenta esto **en el PR**.

**Si el documento está correcto:**
Avanza a la fase de implementación.

---

### Aprobación de Design → Implementación

Comenta esto **en el issue** (no en el PR):
```
@claude-approve-design
```

El agente:
1. Marca `design.md` como `Approved`
2. Genera `.specs/<N>-feature/tasks.md` con el plan de implementación
3. Implementa el código según el design aprobado
4. Convierte el Draft PR a **Ready for Review**
5. Notifica cuando la implementación está completa

---

### Fase 3 — Revisar e implementación

1. El PR ya no es Draft — aparece como listo para review
2. Revisa los cambios en la pestaña **Files changed**
3. Verifica que el código cumple con los criterios del `requirements.md`
4. Si todo está correcto, haz **Merge** manualmente

---

## Referencia rápida de comandos

| Comando | Dónde escribirlo | Efecto |
|---|---|---|
| `@claude [feedback]` | Comentario en el **PR** | Corrige el artefacto actual sin avanzar de fase |
| `@claude-approve-requirements` | Comentario en el **issue** | Aprueba requirements y genera design |
| `@claude-approve-design` | Comentario en el **issue** | Aprueba design e inicia implementación |

---

## Dónde encontrar los artefactos

| Artefacto | Ubicación en el repo |
|---|---|
| Requirements | `.specs/<N>-feature/requirements.md` |
| Design técnico | `.specs/<N>-feature/design.md` |
| Plan de tareas | `.specs/<N>-feature/tasks.md` |
| Código implementado | Según estructura definida en `design.md` |

---

## Reglas importantes

1. **Los comandos de aprobación van en el issue**, no en el PR
2. **Las correcciones van en el PR**, no en el issue — esto asegura que el agente tenga contexto del documento actual
3. **El agente no avanza automáticamente** — toda transición requiere un comando explícito tuyo
4. **No merges manuales de la rama** `sdd/issue-N` — el workflow gestiona todos los commits; solo haces merge del PR final cuando todo esté revisado

---

## Resolución de problemas

### El Draft PR no aparece después de crear el issue

- Verifica que el issue esté **asignado** a un colaborador (el trigger es `issues.assigned`)
- Revisa los logs en **Actions** → **SDD Feature Workflow** para ver si hay errores

### El agente no responde a mi comentario en el PR

- Asegúrate de que el comentario esté en el **PR correcto** (el que tiene la rama `sdd/issue-N`)
- Verifica que estás usando `@claude` (no `@Claude` ni otra variación)
- Revisa los logs en **Actions** → busca el run más reciente

### Quiero cancelar el ciclo SDD

- Cierra el Draft PR manualmente
- Cierra el issue o elimina el label/asignación
- La rama `sdd/issue-N` puede eliminarse manualmente desde GitHub si lo deseas
