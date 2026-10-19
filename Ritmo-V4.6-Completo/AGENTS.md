# AGENTS.md — Ritmo | Reglas permanentes de desarrollo

> Versión de estas instrucciones: 1.0 · Base actual: Ritmo V4.4
> Este archivo establece reglas de trabajo para asistentes que modifiquen el proyecto.
> Leer también `README.md`, `CHANGELOG.md` y el código real antes de implementar.
> Si una instrucción contradice el código o las pruebas, informar el conflicto; no inventar funcionalidades.

## 1. Producto y objetivo

**Ritmo** es una aplicación web mobile-first de organización personal con dos experiencias:
- **Hábitos (día):** hábitos programados, seguimiento por fecha, huellas semanales, rachas y estadísticas.
- **Facultad (noche):** tareas por materia, parciales/finales y temas de estudio, Pomodoro y progreso académico.

La prioridad es una aplicación **usable, estable, fácil de mantener y fiel a V4.3**, no acumular funciones sin terminar.

## 2. Fuentes de verdad y prioridades

1. **Datos del usuario y su seguridad:** nunca perderlos ni sobrescribirlos silenciosamente.
2. **Diseño visual aprobado V4.3:** conservar escenas, Atom, paletas, tipografía, tarjetas, navegación, gradientes y composición.
3. **Código y pruebas de la última versión aprobada:** base para cualquier cambio, sin empezar de cero.
4. **`README.md` y `CHANGELOG.md` de esa versión:** comportamiento documentado y limitaciones.
5. **`RITMO_DESIGN_SYSTEM.md`**, cuando se adjunte: guía visual adicional. Ante diferencias, la interfaz V4.3 aprobada tiene prioridad.
6. **Pedido actual del usuario:** determina qué implementar; si contradice una regla crítica de datos o diseño, consultar.

No asumir que una función funciona solo porque figura en el changelog. Verificarla cuando sea posible.

## 3. Identidad visual innegociable

- **Modo Hábitos:** cálido, crema/terracota/verde; habitación soleada y Atom.
- **Modo Facultad:** azul noche/cian; habitación nocturna y Atom con birrete.
- **Atom:** labrador crema/blanco, nariz rosada moteada, orejas caídas, collar verde. No reemplazar las imágenes originales.
- Conservar el logo de átomo (no Saturno), fondos y degradados, dock inferior, iconos y jerarquía visual.
- Mantener el enfoque mobile-first y las áreas seguras de móviles.
- No rediseñar ni alterar `css/styles.css` o `assets/` sin necesidad justificada y aprobación si el cambio es visible.
- Añadir CSS mínimo y localizado, preferentemente en `css/local.css`; no sobreescribir reglas globales indiscriminadamente.
- Respetar los estados vacíos y la accesibilidad: etiquetas, foco visible, contraste y objetivos táctiles adecuados.

## 4. Estructura actual V4.4 (comprobar en el ZIP recibido)

- `index.html`: entrada, plantillas, símbolos SVG y carga ordenada.
- `css/styles.css`: diseño original V4.3.
- `css/local.css`: ajustes locales.
- `js/app.js`: vistas, navegación, eventos y formularios.
- `js/core.js`: modelo, entidades, fechas, validaciones, historial y migraciones.
- `js/storage.js`: persistencia, copias y conflictos.
- `js/metrics.js`: métricas, rachas y estadísticas.
- `js/timer.js`: estados del Pomodoro.
- `js/demo.js`: demo aislada de los datos personales.
- `assets/`: imágenes, logos e iconos originales.
- `manifest.webmanifest`: manifiesto existente; **no equivale a una PWA offline**.
- `tests/`: pruebas de lógica y navegador.

Mantener el proyecto modular. No volver a un HTML gigante ni introducir frameworks o servicios sin motivo.

## 5. Comportamiento funcional que no debe romperse

### Hábitos
- Crear, editar, archivar/restaurar, eliminar con confirmación.
- Completar y desmarcar **con un toque y sin toast, confirmación ni botón «Deshacer»**.
- Guardar marcas por fecha y conservar historial al cambiar programación o editar hábitos.
- Huellas: 0% `#DCC5AE`; >0% y <50% `#E5A982`; 50%-<100% `#BD7147`; 100% `#53664A` con check blanco.
- Días futuros o sin hábitos aplicables: neutrales.
- Rachas y porcentajes calculados, nunca simulados como datos personales.

### Facultad
- Tareas: CRUD, materias, vencimiento, campos opcionales, filtros «Todas»/«Completadas» y ordenamientos.
- Completar/desmarcar tareas **sin toast**; el segundo toque revierte el estado.
- Parciales y temas: CRUD, fechas y estados `Pendiente`, `Estudiando`, `Repasado`; progreso real.
- Eliminar entidades con confirmación y sin referencias activas huérfanas; preservar historial de sesiones.

### Pomodoro
- 45 minutos de enfoque y 15 de descanso; iniciar, pausar, reanudar y reiniciar.
- Asociar sesiones a tarea, tema de parcial o modo libre.
- No completar tareas ni temas automáticamente.
- Persistir el estado y calcular el tiempo por marcas temporales al regresar.
- Evitar duplicar sesiones; no prometer ejecución continua, alarmas o notificaciones cuando el sistema suspende la app.

### Demo
- Los ejemplos no deben contaminar ni reemplazar los datos reales.

## 6. Datos y migraciones: máxima precaución

- V4.4 utiliza `localStorage`, clave **`ritmo.app.state`**, esquema **2**. Antes de cambiarlo, inspeccionar `js/core.js` y `js/storage.js`.
- Mantener IDs estables, integridad referencial, fechas locales coherentes y manejo de errores de guardado.
- Cualquier cambio de esquema exige migración versionada, prueba con datos previos y posibilidad de recuperación.
- No limpiar storage, resetear datos, importar con reemplazo o borrar registros sin consentimiento explícito.
- Conservar exportación/importación JSON y respaldos. Probar casos inválidos y conflictos de pestañas.
- El almacenamiento depende del origen (protocolo, host y puerto): no prometer que los datos viajan solos entre Live Server, dominio y dispositivo.
- Antes de implementar sincronización, definir mapeos, duplicados, conflictos, borrados y funcionamiento offline. Preferir preservación de datos sobre sincronización agresiva.

## 7. Próximas etapas y límites

**Base aprobada:** V4.3 visual → V4.4 funcional local.

**Próxima etapa candidata:** V4.5, según el pedido vigente: estabilización móvil, accesibilidad, PWA instalable/offline y/o integración Google Tasks/Calendar. **No asumir que todo está autorizado a la vez:** seguir el alcance explícito del mensaje actual.

Para Google:
- OAuth adecuado a cliente web, scopes mínimos, sin secretos en frontend ni tokens en logs.
- La configuración de Google Cloud y autorización real requieren intervención del usuario.
- Diferenciar pruebas simuladas de conexión real; no inventar resultados.
- No sincronizar ni borrar datos automáticamente sin política segura y consentimiento.

Para PWA:
- Manifest, iconos, service worker y estrategia de actualización segura.
- HTTPS en producción (localhost para desarrollo).
- No cachear datos privados o respuestas autenticadas de forma insegura.
- Probar instalación y offline en dispositivo real cuando sea posible.

Animaciones nuevas de Atom y rediseños: fuera de alcance salvo pedido explícito.

## 8. Flujo de trabajo eficiente (ahorro de uso)

1. Leer **este AGENTS.md**, el pedido actual y solo los archivos pertinentes.
2. Revisar `README.md` y `CHANGELOG.md` antes de modificar.
3. Inspeccionar la implementación existente; reutilizar funciones y pruebas.
4. Planificar internamente, sin emitir informes extensos ni pedir aprobaciones menores.
5. Modificar únicamente los archivos necesarios; conservar recursos sin cambios.
6. Ejecutar pruebas pertinentes, corregir y **repetir las pruebas críticas**.
7. Crear entrega completa y resumir brevemente lo hecho y lo pendiente.

No pegar código fuente entero en la conversación ni recontar la historia del proyecto. Agrupar cambios relacionados en una entrega. Evitar reconstrucciones innecesarias. Consultar solo ante decisiones que afecten datos, permisos, arquitectura importante o diseño aprobado.

**Importante:** reducir texto y lecturas innecesarias ayuda a la eficiencia, pero no garantiza un ahorro proporcional del límite de uso.

## 9. Pruebas y criterios de aceptación

Como mínimo, cuando el cambio afecte la función:
- Sintaxis y carga de todos los JS/CSS/recursos; sin errores de consola.
- Navegación y comportamiento en Hábitos y Facultad.
- CRUD, filtros, estados, cálculos, persistencia tras recarga.
- Completado reversible **sin toast** para hábitos y tareas.
- Pomodoro: pausa, reanudación, recuperación, sesión única y no completar automáticamente.
- Exportación/importación y migraciones sin pérdida.
- Responsividad en 320, 360, 390 y 470 px; sin desbordes horizontales.
- Si hay cambios PWA: cache, actualización, offline e instalación.
- Si hay cambios Google: mocks y errores de red; prueba real solo con autorización/configuración disponibles.

Pruebas existentes desde la raíz:
- `node tests/core.test.cjs`
- `node tests/timer-metrics.test.cjs`
- `node tests/browser.test.cjs` (requiere Chromium/Playwright; ver `README.md`).

Informar por separado: **aprobado**, **fallido** y **no ejecutado**. No presentar una prueba no ejecutada como superada. Una ejecución automatizada no reemplaza la validación en un celular físico.

## 10. Entrega de cada versión

Entregar siempre:
1. **ZIP completo independiente**, por ejemplo `Ritmo-V4.5-Completo.zip`, listo para abrir con VS Code + Live Server. No obligar a fusionar archivos manualmente.
2. `CHANGELOG.md` actualizado: funciones, archivos modificados, correcciones y pendientes.
3. `README.md` actualizado: ejecución, pruebas y limitaciones.
4. Informe **breve** de pruebas ejecutadas, resultados y verificaciones manuales pendientes. Puede ir en `TEST_REPORT.md` para cambios grandes.
5. Guía de configuración adicional solo si es necesaria (por ejemplo `GOOGLE_SETUP.md`).

Preservar la versión anterior como respaldo. Nunca afirmar «100% probado» si no se verificó realmente. Si algo queda incompleto, documentarlo y entregar una versión coherente.

## 11. Definición de terminado

Una entrega está lista para revisión del usuario cuando:
- Ejecuta sin errores bloqueantes en el entorno probado.
- Mantiene el diseño aprobado y las funciones existentes.
- Persiste datos correctamente y no destruye los previos.
- Incluye pruebas repetibles y declara sus límites.
- Se entrega como ZIP completo con documentación concisa.

**Regla final:** proteger diseño y datos, producir código comprobable, ahorrar intercambios y no prometer capacidades que todavía no existen.
