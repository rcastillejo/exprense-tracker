# Guía de uso — Spec Driven Development (SDD) Workflow

## ¿Qué es el workflow SDD?

El workflow Spec Driven Development (SDD) es una metodología de desarrollo orientada a agentes que cubre el ciclo completo de software: **requerimientos → diseño → implementación → PR → merge**. El agente de IA (Claude) ejecuta cada fase a partir de especificaciones estructuradas, y el product owner aprueba explícitamente cada transición.

---

## Ciclo completo de desarrollo

```
1. Product owner crea un issue en GitHub
         │
         ▼
2. Menciona @claude en el issue
         │
         ▼
3. Agente genera requirements.md
   (espera aprobación)
         │
    @claude-approve-requirements
         │
         ▼
4. Agente genera design.md
   (espera aprobación)
         │
    @claude-approve-design
         │
         ▼
5. Agente implementa el código
   y abre un Pull Request
         │
         ▼
6. Product owner revisa y hace merge
```

---

## Paso a paso

### 1. Crear el issue

Crea un issue en GitHub con:
- **Título:** descripción corta de la feature o bug
- **Descripción:** contexto del problema, comportamiento esperado, criterios de éxito
- **Criterios de aceptación** (opcional pero recomendado): lista de condiciones que debe cumplir la solución

**Ejemplo de issue bien formado:**

```
Título: Agregar categoría "Educación" al pipeline de gastos

Descripción:
Actualmente el sistema solo soporta las categorías definidas en ADR-001.
Necesitamos agregar "Educación" para clasificar gastos de colegio y cursos.

Criterios de aceptación:
- El sistema acepta gastos con categoría "Educación"
- Los reportes mensuales incluyen el total de la categoría "Educación"
- Los gastos sin categoría se rechazan con mensaje de error claro
```

### 2. Activar el agente

Comenta en el issue mencionando `@claude` con la instrucción deseada. Para iniciar el ciclo SDD completo:

```
@claude genera los requerimientos para esta feature
```

El agente se activa via GitHub Actions y comienza a trabajar en una rama dedicada `sdd/issue-<N>-<fecha>`.

### 3. Revisar requirements.md

El agente genera el archivo `.specs/<N>-feature/requirements.md` en la rama `sdd/issue-<N>-*` y comenta en el issue con el enlace.

**Qué revisar en requirements.md:**
- ¿Las user stories capturan correctamente lo que pediste?
- ¿Los criterios GIVEN/WHEN/THEN son verificables?
- ¿El scope está bien delimitado (fuera de alcance)?
- ¿Las restricciones técnicas son correctas?

**Si necesitas cambios:** comenta en el issue con las correcciones. El agente actualizará el documento.

**Si estás de acuerdo:** comenta exactamente:
```
@claude-approve-requirements
```

### 4. Revisar design.md

El agente genera `.specs/<N>-feature/design.md` y notifica en el issue.

**Qué revisar en design.md:**
- ¿La arquitectura propuesta es coherente con el stack tecnológico?
- ¿Las decisiones técnicas (DT-XXX) están justificadas?
- ¿El impacto en el codebase existente está bien identificado?
- ¿Los diagramas reflejan el flujo correcto?

**Si necesitas cambios:** comenta en el issue con las correcciones.

**Si estás de acuerdo:** comenta exactamente:
```
@claude-approve-design
```

### 5. Revisar la implementación

El agente:
1. Genera `.specs/<N>-feature/tasks.md` con las tareas de implementación
2. Implementa el código según el design aprobado
3. Abre un Pull Request vinculado al issue

**Qué revisar en el PR:**
- El código implementa lo especificado en requirements.md y design.md
- Los tests pasan (si existen)
- El PR tiene referencia al issue (`Resuelve #N`)

**Si todo está correcto:** aprueba y haz merge del PR manualmente desde GitHub.

---

## Comandos disponibles

| Comando | Cuándo usarlo | Efecto |
|---|---|---|
| `@claude` | En cualquier comentario de issue | Activa el agente; sigue las instrucciones del comentario |
| `@claude-approve-requirements` | Después de revisar requirements.md | El agente genera design.md |
| `@claude-approve-design` | Después de revisar design.md | El agente implementa el código y abre un PR |

---

## Dónde encontrar los artefactos generados

Todos los artefactos del ciclo SDD viven en la rama `sdd/issue-<N>-<fecha>`:

```
.specs/<N>-feature/
├── requirements.md    # User stories y criterios de aceptación
├── design.md          # Arquitectura y decisiones técnicas
└── tasks.md           # Tareas de implementación (generado al aprobar design)
```

Para verlos:
1. Ve a la pestaña **Code** del repositorio
2. Selecciona la rama `sdd/issue-<N>-*` en el dropdown de ramas
3. Navega al directorio `.specs/<N>-feature/`

---

## Flujo de feedback

El agente no avanza automáticamente — cada fase espera tu aprobación explícita:

```
┌─────────────────────┐
│  requirements.md    │◄── Agente genera
│  generado           │
└─────────┬───────────┘
          │
    ¿Correcto?
     /       \
   No         Sí
   │           │
   ▼           ▼
Comenta    @claude-approve-requirements
correcciones    │
   │            ▼
   └──► Agente actualiza
```

---

## Restricciones del workflow v1

- El product owner debe tener **acceso de escritura** al repositorio para que sus comentarios activen el workflow
- Un ciclo SDD por issue — no hay soporte para múltiples features en paralelo sobre el mismo issue
- Las **aprobaciones son manuales** — no hay aprobación automática por tiempo ni por criterio
- El **merge es siempre manual** — el agente abre el PR pero no hace merge

---

## Preguntas frecuentes

**¿Puedo saltarme una fase?**
No. El workflow SDD requiere requirements.md aprobado para generar design.md, y design.md aprobado para implementar. Esta secuencia garantiza que el código generado tenga justificación documentada.

**¿Qué pasa si el agente detecta un gap en el design durante la implementación?**
El agente documenta el gap en el comentario del PR y propone una corrección. No continúa implementando hasta recibir confirmación.

**¿Puedo modificar directamente los archivos .md del spec?**
Sí. Los specs son archivos de texto en Git — puedes editarlos directamente. El agente leerá la versión más reciente del archivo en la rama.

**¿El ciclo SDD aplica a todos los issues?**
El workflow `sdd-feature.yml` se activa en todos los issues nuevos. Si el issue es pequeño y no necesita el ciclo completo, puedes usar `@claude` directamente con instrucciones específicas (sin pasar por la secuencia requirements → design → impl).

---

## Referencia rápida

```bash
# Ver las specs de un issue
git checkout sdd/issue-N-*
ls .specs/N-feature/

# Validar estructura de specs
./scripts/validate-specs.sh N

# Ver historial del ciclo SDD
git log --oneline sdd/issue-N-*
```
