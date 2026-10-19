# Changelog

## V4.6 — 19/10/2026

Reconstrucción funcional sobre V4.5.2. Lista para revisión; conexión Google real e instalación física pendientes.

### Funcionalidades y correcciones

- Dominios separados: Diario → hábitos, Facultad → tareas, Calendar → exámenes.
- Unificación de enlaces y motor; identidad por cuenta, servicio, contenedor e ID remoto.
- Cola durable, sincronización automática mientras la app está autorizada/abierta y alternativa manual.
- Conciliación por campos, ETag, conflictos visibles, protección de ediciones durante peticiones y recuperación de creaciones inciertas.
- Migración a esquema 4 con respaldo original exacto; reparación de contaminación por procedencia, sin borrar en Google.
- Historial disponible paginado, fechas de Argentina, desconocido separado de pendiente y estadísticas basadas en evidencia.
- Revisión agrupada de recurrencias y correcciones por ocurrencia, sin modificar la siguiente tarea.
- Detección académica, materias configurables y correo descartado como materia; día completo, zona, duración e instancias recurrentes.
- Borrado local separado del borrado remoto explícito; cambios remotos durante un borrado requieren otra decisión.
- Cuenta simplificada, Client ID público conservado en archivo y asociaciones técnicas fuera de la UI normal.
- Todas muestra pendientes; Completadas sólo terminadas. Datos apartados no cuentan como académicos.
- Crear una tarea de estudio desde un tema; prevención de duplicados y limpieza de referencias.
- Pomodoro 45/15 y flujos locales conservados; fecha de sesiones en Argentina.
- PWA/actualización/offline revalidados y SW regenerado con los nuevos módulos.

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `js/core.js` | Esquema, migración, historial, filtros, exámenes y referencias |
| `js/storage.js` | Respaldo previo a V4.6 sin sobrescritura; recuperación segura |
| `js/metrics.js` | Denominadores conocidos, rachas y días sin datos |
| `js/timer.js` | Fecha local de las sesiones |
| `js/sync-model.js` | Modelo común de dominios, enlaces, cola, revisión y conflictos |
| `js/google-domain-sync.js` | Descubrimiento y reparación por identidad |
| `js/sync-engine.js` | Reconciliación, recuperación, eliminación y carreras |
| `js/google-api.js` | Calendarios de lectura/escritura y DELETE condicionado |
| `js/google-auth.js` | Scope Calendar para calendarios con acceso autorizado |
| `js/google-ui.js` | Panel simplificado, fuentes, revisión y sincronización automática |
| `js/app.js` | Integración con cola, desconocidos, formularios y tarea desde tema |
| `css/local.css` | Ajustes funcionales mínimos para desconocidos, revisión y texto largo |
| `index.html` | Versión y orden de módulos |
| `sw.js` | Hashes regenerados |
| `tests/*` | Pruebas adaptadas al nuevo contrato y escenarios nuevos |

Nuevos: `tests/edge-cases.test.cjs`, `tests/static.test.cjs`, fixtures V4.5.2/hashes visuales, `tools/run-tests.cjs`, `MIGRATION.md`, `AUDITORIA.md`. Actualizados README, GOOGLE_SETUP y TEST_REPORT. Documentos V4.5.1/V4.5.2 trasladados a `docs/historico/` como referencia.

Sin cambios: las 7 imágenes/logos/iconos de `assets/`, `css/styles.css`, manifest, Client ID/configuración pública, `_headers` y módulo PWA. Las capturas de las escenas diurna y nocturna resultaron idénticas a V4.5.2 en la región comparada.

### Pruebas y limitaciones

Se ejecutaron y repitieron pruebas de modelo, migración, OAuth/REST simulado, flujos de navegador y PWA. Ver resultados finales y los 18 casos mínimos en `TEST_REPORT.md`. No se hicieron llamadas a la cuenta Google real. Historial recurrente incompleto/no identificable, clasificación textual Calendar, almacenamiento por origen, instalación física y restricciones del sistema están documentados en README/AUDITORIA.
