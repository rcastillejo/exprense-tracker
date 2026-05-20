# CLAUDE.md — Instrucciones para el agente Claude

## Contexto del proyecto

Ver `docs/problem-statement.md` para el problema de negocio.
Ver `docs/decisions/ADR-001-stack-tecnologico.md` para el stack tecnológico.

**Resumen:** Finanzas C&C es un pipeline que consolida gastos de 2 usuarios desde Gmail (BCP, Interbank, BBVA, Scotiabank, Yape/Plin) hacia Google Sheets. Sin costo de infraestructura. Sin app móvil en v1.

---

## Stack tecnológico

| Componente | Tecnología |
|---|---|
| Implementación | Google Apps Script (JavaScript) |
| Almacenamiento | Google Sheets |
| Ingesta | Gmail API (nativa de Apps Script) |
| Categorización IA | Claude API (claude-haiku-4-5) |
| Modelo de workflow | claude-sonnet-4-6 (o superior) |
| CI/CD | GitHub Actions + claude-code-action@v1 |

**Restricción crítica:** No instalar dependencias externas. No hay `package.json`. No hay Node.js runtime en producción.

---

## Workflow SDD (Spec Driven Development)

Al trabajar en un issue con ciclo SDD, el orden de lectura es obligatorio:

1. Lee `.specs/<issue-id>-feature/requirements.md` antes de cualquier acción
2. Lee `.specs/<issue-id>-feature/design.md` antes de implementar
3. No implementes nada que no esté especificado en el `design.md` aprobado
4. Si detectas un gap en el design durante la implementación:
   - Documéntalo con `gh pr comment` en el PR del ciclo SDD
   - No continúes con la implementación hasta recibir confirmación explícita

### Estructura de specs esperada

```
.specs/
└── <issue-id>-feature/
    ├── requirements.md    # Status: Draft → Revised → Approved
    ├── design.md          # Status: Draft → Revised → Approved
    └── tasks.md           # Generado en fase de implementación
```

### Comandos del workflow

| Comando | Dónde | Acción |
|---|---|---|
| `@claude [feedback]` | Comentario en el **PR** (Draft PR del ciclo) | Corrección en la fase actual, sin avanzar de fase |
| `@claude-approve-requirements` | Comentario en el **issue** | Avanza a fase de design |
| `@claude-approve-design` | Comentario en el **issue** | Avanza a fase de implementación |

---

## Convenciones de commits

- **Prefijo obligatorio:** `feat` | `fix` | `docs` | `chore` | `test`
- **Referencia al issue:** `#N` al final del mensaje
- **Formato:** `<tipo>: <descripción concisa> for issue #N`
- **Ejemplo:** `feat: add BCP email parser for issue #7`

---

## Convenciones de código (Google Apps Script)

- Idioma del código: inglés (variables, funciones, comentarios técnicos)
- Idioma de specs y docs: español
- Nombres de función: camelCase
- Constantes: UPPER_SNAKE_CASE
- Cada parser de banco en archivo separado: `src/parsers/<banco>Parser.js`
- Tests en: `src/tests/<módulo>Test.js`

---

## Restricciones del agente

- No crear ramas adicionales a la asignada por el workflow
- No hacer push a `main` directamente
- No modificar `.github/workflows/` sin instrucción explícita
- No instalar dependencias externas (sin `npm install`, sin `pip install`)
- No avanzar de fase sin aprobación explícita del product owner
- No hacer push si tests existentes fallan — reportar primero

---

## Archivos de solo lectura (no modificar sin instrucción explícita)

- `docs/problem-statement.md`
- `docs/decisions/ADR-001-stack-tecnologico.md`
- `.specs/<N>-feature/requirements.md` (solo actualizar `Status:` cuando se aprueba)
- `.specs/<N>-feature/design.md` (solo actualizar `Status:` cuando se aprueba)
