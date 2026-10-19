# Pruebas — Ritmo V4.6

**Resultado final: 12/12 suites aprobadas, 0 suites fallidas.** Ejecutadas el 19/10/2026 en Node 24 y Chromium headless/Linux mediante Playwright. Se ejecutó una primera ronda, se corrigieron defectos y aserciones heredadas incompatibles con el pedido, y se repitió la ronda completa. La salida reproducible final está en `tests/LAST_RUN.log`.

**Google fue simulado. No se verificó una cuenta real, la configuración Cloud ni la instalación en un teléfono.** El resultado es una implementación comprobada en el entorno indicado, pendiente de aceptación real.

## Comando ejecutado

```bash
python3 tools/build-sw.py
RITMO_CHROMIUM=/ruta/al/chromium node tools/run-tests.cjs --browser
```

La variable apunta al Chromium disponible en este entorno. Con Chromium instalado por Playwright podés omitirla. Ver requisitos en README.

## Los 18 casos mínimos

| # | Caso | Resultado / evidencia |
|---|---|---|
| 1 | Diario no contamina Facultad | Aprobado: `domain-sync`; listas con títulos de tareas idénticos mantienen dominios distintos |
| 2 | Facultad no contamina Hábitos | Aprobado: `domain-sync` y UI Google |
| 3 | Historial mensual disponible | Aprobado: importación de completados de 65 días atrás tras confirmar pertenencia |
| 4 | No inventar historial | Aprobado: días sin evidencia conservan `null`; denominador conocido y rachas verificadas |
| 5 | Hábito bilateral | Aprobado con mocks: completar/desmarcar, corrección histórica, siguiente ocurrencia intacta y conflicto entre ocurrencias del mismo día |
| 6 | Tareas bilaterales | Aprobado con mocks: alta, nombre/notas/fecha/estado, campos locales intactos, borrado explícito |
| 7 | Parciales bilaterales | Aprobado con mocks: crear, cambiar título/fecha/horario, duración, día completo y varios días; temario preservado |
| 8 | Materias correctas | Aprobado: alias configurado y materia sin asignar; nunca el correo del calendario |
| 9 | Ignorar eventos personales | Aprobado: cumpleaños, reunión, vacaciones, fútbol/copa y títulos no académicos de la muestra |
| 10 | No duplicar | Aprobado: sincronización repetida, respuesta perdida POST/PATCH, marcadores, IDs Calendar, alta local pendiente revisada |
| 11 | Migración sin pérdidas | Aprobado: fixtures V4.4 y V4.5.2; ID, marca original, temario, timer/sesiones y backup exacto; cuarentena por origen |
| 12 | Conflictos simultáneos | Aprobado: merge por campo, conflicto mismo campo, conservar Google/Ritmo, 412 y edición durante petición |
| 13 | Offline/reconectar | Aprobado: cola persistente ante fallo de red, envío al reintentar, PWA abre/edita offline; UI sincroniza después de editar |
| 14 | Pendientes/completadas | Aprobado: Todas excluye completadas; Completadas excluye pendientes; apartadas fuera de estadísticas |
| 15 | Estadísticas | Aprobado: datos conocidos, días libres, corte por desconocido, corrección, semana/mes, cambio de día/año y medianoche Argentina |
| 16 | Pomodoro | Aprobado en navegador/reloj controlado: 45/15, pausa, reanudación, recarga, reinicio, sesión única, decisión explícita y conservación al borrar entidades |
| 17 | Iconos/PWA/rutas/caché | Aprobado: dimensiones, manifest, 25 hashes, JS sin errores de sintaxis, carga sin rutas rotas, offline y actualización incompleta rechazada |
| 18 | Móvil/diseño | Aprobado en Chromium: 7 vistas a 320/360/390/470 px, panel Google y textos largos; sin desborde horizontal ni IDs duplicados |

## Suites ejecutadas

| Suite | Resultado |
|---|---|
| `static.test.cjs` | Aprobada: sintaxis, rutas, manifest/iconos, hashes y preservación de 10 archivos visuales/configuración |
| `core.test.cjs` | Aprobada: CRUD, historial, guardado, cuota, corrupción, recuperación, importación inválida y objetos inseguros |
| `timer-metrics.test.cjs` | Aprobada: rachas/métricas, referencias, temporizador, descansos, migración esquema 1 y filtros |
| `migration.test.cjs` | Aprobada: datos previos y respaldo original exacto, clasificación por IDs, materia correo conservada sin mostrarla como materia |
| `auth.test.cjs` | Aprobada con mocks: permisos parciales, popup cerrado, expiración, 401, red, destinos permitidos, revocación y token privado |
| `sync.test.cjs` | Aprobada con mocks: reconciliación bilateral, conflictos, carreras, red, creación incierta, fechas/DST y paginación |
| `domain-sync.test.cjs` | Aprobada con mocks: dominios, historial, materias, recurrencia/ocurrencias, edición/borrado y cola |
| `edge-cases.test.cjs` | Aprobada: calendario pasa a lectura, borrado cambiado/cancelado, ocurrencia eliminada, alta incierta anterior, revisión y frontera de año/cuenta |
| `regression.test.cjs` | Aprobada: flujos locales, exportar/importar, demo aislada, navegación móvil y aviso multipestaña |
| `browser.test.cjs` | Aprobada: marcado silencioso, CRUD, tema → tarea sin duplicado, Pomodoro completo y fallo de almacenamiento |
| `google-browser.test.cjs` | Aprobada con GIS/REST simulados: fuentes, importación/edición automática, Calendar/materias, conflicto en UI, desconectar/denegar y caché privada excluida |
| `pwa.test.cjs` | Aprobada: offline después de cachear, timer offline, actualización explícita, bloqueo con otra pestaña, persistencia y rechazo de actualización incompleta |

## Comparación visual adicional

Se compararon capturas de las regiones superiores de 390×400 px de Inicio y Facultad contra V4.5.2: **idénticas píxel a píxel** en ambas escenas. Se inspeccionaron capturas y se comprobaron textos largos en pantallas de 320–470 px. Los 7 assets, `css/styles.css`, manifest y `js/google-config.js` coinciden byte a byte. Esto no implica equivalencia píxel a píxel de cada nueva pantalla de configuración, formulario o estado funcional.

## Fallos de la primera ronda y corrección

Las pruebas antiguas esperaban esquema 3, APIs internas de sincronización retiradas, 67% contando días desconocidos como fallidos y Todas incluyendo completadas. Se actualizaron para verificar el contrato V4.6, manteniendo las comprobaciones de persistencia, integridad y navegación. Las nuevas pruebas revelaron/cubrieron los ajustes de singular parcial, fecha de ocurrencias futuras, creación incierta, vínculo pendiente, múltiples ocurrencias, cancelación de borrado y rol de lectura. La última ejecución completa terminó sin fallos.

## No ejecutado / pendiente

- OAuth, consentimiento, proyecto Cloud, CORS/ETags y llamadas REST con una cuenta Google real.
- Historial efectivamente expuesto por tus listas y conservación de marcadores en recurrencias nativas reales.
- Migración del localStorage real del usuario: los fixtures son copias de prueba; el fixture V4.5.2 fue generado por sus módulos originales y contiene contaminación sintética.
- Instalación física, relanzamiento desde icono, barras de Android, notch/áreas seguras físicas y Safari/iOS.
- Despliegue real en Netlify y comportamiento de sus cabeceras/CSP con GIS real.
- Automatismos con la PWA cerrada (no implementados), alarmas en suspensión y carga extrema al máximo de límites locales.

Para cerrar aceptación: exportar datos, publicar en el mismo origen, hacer la prueba controlada de `GOOGLE_SETUP.md`, revisar grupos/materias y comprobar instalación/offline/actualización en Android e iPhone. No se promete recuperar historial que Google no devuelve.
