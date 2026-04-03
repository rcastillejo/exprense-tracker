# Problem Statement — Finanzas C&C

## Versión: v1.0
## Fecha: 2026-04-01
## Estado: Accepted

---

## Problema

Dos usuarios reciben notificaciones de gasto por email desde 5 fuentes distintas
(BCP, Interbank, BBVA, Scotiabank, Yape/Plin), cada una con formato de email
diferente. No existe una vista consolidada que permita analizar los gastos
mensuales del hogar sin trabajo manual de copia, revisión y clasificación.

---

## Usuario

- **Cantidad:** 2 personas (pareja / familia)
- **Bancos activos:** BCP, Interbank, BBVA, Scotiabank, Yape, Plin
- **Proveedor de correo:** Gmail (ambos usuarios)
- **Perfil técnico:** No requieren conocimientos técnicos para usar el sistema

---

## Outcome medible

> Ver el consolidado de gastos del mes de ambos usuarios, categorizados,
> en menos de 30 segundos — sin ingresar ningún dato manualmente.

### Métricas de éxito v1:
| Métrica | Objetivo |
|---|---|
| Tiempo para ver resumen mensual | < 30 segundos |
| Gastos registrados manualmente | 0 |
| Bancos integrados | 5 / 5 |
| Usuarios cubiertos | 2 / 2 |
| Costo operativo mensual | $0 |

---

## Restricciones inamovibles

| Restricción | Motivo |
|---|---|
| Sin API bancaria peruana | No existe integración oficial disponible; el email es la única fuente |
| Ambos usuarios en Gmail | La integración debe ser vía Gmail API o Google Apps Script |
| Presupuesto $0/mes en infraestructura | Fase de validación; no se justifica costo fijo aún |
| Solo 2 usuarios en v1 | No se requiere multi-tenancy ni autenticación compleja |
| Sin app móvil en v1 | Google Sheets como frontend es suficiente para validar |

---

## Fuera de alcance (v1)

- Integración con otros proveedores de correo (Outlook, Yahoo)
- Predicción o alertas de gastos
- Sincronización con más de 2 cuentas Gmail
- App móvil o web propia
- Presupuestos y metas de ahorro
- Reportes exportables (PDF, Excel)

---

## Trigger de revisión

Revisar este Problem Statement cuando:
- Se agregue un tercer usuario
- Se requiera integración con correo no-Gmail
- El costo de oportunidad del tiempo manual supere $20/mes