#!/usr/bin/env bash
# validate-specs.sh — Valida la estructura de los archivos de spec del workflow SDD
#
# Uso: ./scripts/validate-specs.sh <issue-number>
# Ejemplo: ./scripts/validate-specs.sh 10
#
# Retorna:
#   0 — todas las validaciones pasaron
#   1 — al menos una validación falló

set -euo pipefail

# ── Colores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ── Argumentos ───────────────────────────────────────────────────────────────
if [[ $# -ne 1 ]]; then
  echo "Uso: $0 <issue-number>"
  echo "Ejemplo: $0 10"
  exit 1
fi

ISSUE_NUMBER="$1"
SPECS_DIR=".specs/${ISSUE_NUMBER}-feature"
ERRORS=0
CHECKS=0

# ── Helpers ──────────────────────────────────────────────────────────────────
pass() {
  echo -e "  ${GREEN}✓${NC} $1"
  CHECKS=$((CHECKS + 1))
}

fail() {
  echo -e "  ${RED}✗${NC} $1"
  ERRORS=$((ERRORS + 1))
  CHECKS=$((CHECKS + 1))
}

warn() {
  echo -e "  ${YELLOW}⚠${NC} $1"
}

check_section() {
  local file="$1"
  local section="$2"
  local description="$3"
  if grep -q "$section" "$file" 2>/dev/null; then
    pass "$description"
  else
    fail "$description — sección '${section}' no encontrada en $(basename "$file")"
  fi
}

# ── Inicio ───────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Validando specs para issue #${ISSUE_NUMBER}"
echo "  Directorio: ${SPECS_DIR}"
echo "═══════════════════════════════════════════════════════════════"

# ── Verificar existencia del directorio ──────────────────────────────────────
echo ""
echo "[ Directorio de specs ]"
if [[ -d "$SPECS_DIR" ]]; then
  pass "Directorio ${SPECS_DIR} existe"
else
  fail "Directorio ${SPECS_DIR} no existe"
  echo ""
  echo -e "${RED}Error fatal: no se puede continuar sin el directorio de specs.${NC}"
  echo "Crea el directorio con: mkdir -p ${SPECS_DIR}"
  exit 1
fi

# ════════════════════════════════════════════════════════════════════════════
# VALIDAR requirements.md
# ════════════════════════════════════════════════════════════════════════════
REQUIREMENTS="${SPECS_DIR}/requirements.md"

echo ""
echo "[ requirements.md ]"

if [[ ! -f "$REQUIREMENTS" ]]; then
  fail "requirements.md no existe en ${SPECS_DIR}"
else
  pass "requirements.md existe"

  # Secciones obligatorias
  check_section "$REQUIREMENTS" "## User Stories\|### US-" \
    "Sección de User Stories presente"

  check_section "$REQUIREMENTS" "Criterios de aceptación\|## Criterios" \
    "Sección de Criterios de aceptación presente"

  check_section "$REQUIREMENTS" "Restricciones técnicas\|## Restricciones" \
    "Sección de Restricciones técnicas presente"

  check_section "$REQUIREMENTS" "Fuera de alcance\|## Fuera de alcance" \
    "Sección Fuera de alcance presente"

  # Validar estructura GIVEN/WHEN/THEN
  if grep -q "GIVEN" "$REQUIREMENTS" 2>/dev/null; then
    GIVEN_COUNT=$(grep -c "^GIVEN\|^  GIVEN\|^\`\`\`" "$REQUIREMENTS" || true)
    WHEN_COUNT=$(grep -c "^WHEN\|^  WHEN" "$REQUIREMENTS" || true)
    THEN_COUNT=$(grep -c "^THEN\|^  THEN" "$REQUIREMENTS" || true)

    if [[ $WHEN_COUNT -gt 0 ]] && [[ $THEN_COUNT -gt 0 ]]; then
      pass "Criterios GIVEN/WHEN/THEN presentes (≥1 scenario detectado)"
    else
      fail "Faltan bloques WHEN o THEN en los criterios de aceptación"
    fi
  else
    fail "No se encontraron criterios GIVEN/WHEN/THEN en requirements.md"
  fi

  # Validar referencia al issue
  if grep -q "#${ISSUE_NUMBER}\|issue.*${ISSUE_NUMBER}\|Issue.*${ISSUE_NUMBER}" "$REQUIREMENTS" 2>/dev/null; then
    pass "Referencia al issue #${ISSUE_NUMBER} presente"
  else
    warn "No se encontró referencia explícita al issue #${ISSUE_NUMBER} — recomendado para trazabilidad"
  fi

  # Validar status
  if grep -q "Status:" "$REQUIREMENTS" 2>/dev/null; then
    STATUS=$(grep "Status:" "$REQUIREMENTS" | head -1)
    pass "Campo Status presente: ${STATUS}"
  else
    warn "Campo '## Status' no encontrado — recomendado incluir Draft/Approved"
  fi
fi

# ════════════════════════════════════════════════════════════════════════════
# VALIDAR design.md
# ════════════════════════════════════════════════════════════════════════════
DESIGN="${SPECS_DIR}/design.md"

echo ""
echo "[ design.md ]"

if [[ ! -f "$DESIGN" ]]; then
  warn "design.md no existe aún en ${SPECS_DIR} — requerido para la fase de implementación"
else
  pass "design.md existe"

  # Secciones obligatorias
  check_section "$DESIGN" "## Arquitectura\|### Arquitectura\|## Arquitectura propuesta" \
    "Sección de Arquitectura presente"

  check_section "$DESIGN" "Decisiones técnicas\|## Decisiones\|### DT-" \
    "Sección de Decisiones técnicas presente"

  check_section "$DESIGN" "Impacto en codebase\|## Impacto\|### Cambios requeridos" \
    "Sección de Impacto en codebase presente"

  # Validar diagrama (Mermaid o ASCII)
  if grep -q "mermaid\|sequenceDiagram\|graph\|┌\|│\|└" "$DESIGN" 2>/dev/null; then
    pass "Diagrama de arquitectura o secuencia presente"
  else
    warn "No se detectó diagrama (Mermaid o ASCII) — recomendado para comunicar la arquitectura"
  fi

  # Validar status
  if grep -q "Status:" "$DESIGN" 2>/dev/null; then
    STATUS=$(grep "Status:" "$DESIGN" | head -1)
    pass "Campo Status presente: ${STATUS}"
  else
    warn "Campo Status no encontrado — recomendado incluir Draft/Approved"
  fi
fi

# ════════════════════════════════════════════════════════════════════════════
# VALIDAR tasks.md (opcional — solo si existe)
# ════════════════════════════════════════════════════════════════════════════
TASKS="${SPECS_DIR}/tasks.md"

echo ""
echo "[ tasks.md ]"

if [[ ! -f "$TASKS" ]]; then
  warn "tasks.md no existe — se genera automáticamente al aprobar design.md"
else
  pass "tasks.md existe"
  check_section "$TASKS" "TASK-\|## TASK" "Tareas de implementación (TASK-NN) presentes"
  check_section "$TASKS" "Dependencias\|## Dependencias" "Sección de Dependencias presente"
fi

# ════════════════════════════════════════════════════════════════════════════
# RESUMEN
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Resumen: ${CHECKS} verificaciones, ${ERRORS} errores"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [[ $ERRORS -gt 0 ]]; then
  echo -e "${RED}❌ Validación fallida — corrige los errores antes de continuar con la siguiente fase.${NC}"
  echo ""
  exit 1
else
  echo -e "${GREEN}✅ Todas las validaciones pasaron — specs listos para la siguiente fase.${NC}"
  echo ""
  exit 0
fi
