# Auditoría de Ritmo V4.6

Fecha: 19/10/2026. Base: ZIP V4.5.2 recibido; HTML anterior usado sólo como referencia funcional. Alcance: revisión del código, pruebas de modelo y mocks REST/OAuth, Chromium automatizado, recursos y PWA. No se auditaron datos reales de Google ni un dispositivo físico.

## Hallazgos y correcciones

| Criticidad | Hallazgo / causa | Corrección y evidencia |
|---|---|---|
| Crítica | Había mecanismos de sincronización paralelos y asociaciones fuera del motor común | Un modelo con dominios, enlaces, base de conciliación y cola. `sync`, `domain-sync` y `migration` |
| Crítica | Datos de Diario importados como tareas académicas | Reparación por cuenta/lista/ID, cuarentena y archivo; mismo título en dos listas no se fusiona. Fixture V4.5.2 |
| Crítica | Ausencia histórica tratada como pendiente; historial remoto antiguo/oculto excluido | Lectura paginada con completadas y ocultas; desconocido explícito; originales preservados. `domain-sync`, `timer-metrics` |
| Alta | Inferir serie recurrente por nombre puede unir hábitos distintos | Coincidencias sólo como sugerencias en revisión; IDs de ocurrencia y marcadores tras confirmación. No se inventa un ID de serie de Google |
| Alta | Corrección histórica podía afectar otra ocurrencia | Fecha de evidencia por enlace; protección de correcciones manuales y resolución por ocurrencia si hay varias el mismo día |
| Alta | Reintentar un POST después de perder su respuesta puede duplicar | Fase durable antes del envío; recuperación por marcador; Calendar con ID propio; bloqueo si sigue incierto |
| Alta | Conflictos de edición podían sobrescribir datos | Comparación de tres versiones, ETag, captura de la edición local, resolución explícita. Tests de cambios simultáneos, 412 y edición durante petición |
| Alta | Un borrado remoto o una lista vacía podía inducir pérdida | Consulta individual de vínculos faltantes, revisión de borrados; no eliminar hábitos por borrado de una ocurrencia |
| Alta | Borrar mientras Google cambia y cancelar después dejaba sin copia visible | Tombstone con copia local; verificar ETag y restaurar la copia al cancelar mediante desvinculación |
| Alta | Materia tomada del nombre de calendario podía ser un correo | Alias/calendario configurado, materia sin asignar cuando no hay certeza, `legacySubject` preservado |
| Alta | Día completo podía convertirse en hora ficticia; se omitían recurrencias | Separación date/dateTime, fin exclusivo, duración/zona e ID de instancia recurrente; protección DST |
| Alta | Sólo probar un permiso anterior no cubre calendarios compartidos | Scope de eventos y selección de lectura/escritura; verificar rol también en vínculos existentes. Pendiente consentimiento real |
| Media | Filtro Todas y estadísticas mezclaban terminadas o tareas contaminadas | Fuente académica filtrada común; Todas pendientes y Completadas terminadas |
| Media | Normalización no contemplaba variantes académicas suficientes | Tildes/caja normalizadas; parcial/final/recup/exámenes/coloquio; exclusiones personales; pruebas de singular y plural |
| Media | Estado de conexión confundido con datos o sincronización terminada | Tokens sólo en memoria; cola separada; estado pendiente/error/conflicto; sin popup automático |
| Media | Interfaz exponía configuración técnica y demasiadas asociaciones | Panel reducido, Client ID en archivo, revisión comprensible; diagnóstico separado con `?dev=1` |
| Media | Referencias de nuevas tareas de estudio podían quedar huérfanas | Identidad de tema, prevención de segunda tarea y limpieza de referencias al eliminar tema/examen |
| Media | Actualizaciones podían conservar un shell antiguo o incompleto | Se preservó y revalidó el SW de hashes, espera explícita, bloqueo multipestaña y rechazo de actualización incompleta |
| Media | Adaptación móvil y barras de sistema | Se preservaron áreas seguras, colores por modo e iconos; 7 pantallas en 320/360/390/470 px y textos largos. Barras físicas pendientes |

## Matriz del HTML anterior

| Comportamiento útil | Decisión V4.6 |
|---|---|
| Pomodoro 45/15, pausa y reanudación | Mantener la máquina de estados modular y persistente; recuperación por tiempo absoluto |
| Elegir tarea y decidir si terminarla al final | Mantener decisión explícita y sesiones únicas, sin completar automáticamente |
| Parciales y temarios | Conservar IDs y preparación local; ampliar integración Calendar |
| Crear tareas desde temas | Incorporar con referencia estable y prevención de duplicado |
| Historial de hábitos | Usar evidencia fechada y revisión; no inferir marcas a partir de un total mensual |
| Agrupar por parecido de títulos / lista de 100 tareas | No copiar: identidad remota y paginación completa |
| Limpiar registros remotos anteriores | No copiar: reparación local sin borrados de limpieza |
| Diseño del HTML anterior | No reutilizar: se conserva V4.5.2 |

## Correcciones detectadas durante las pruebas de V4.6

Se corrigieron: singular «parcial», fecha de una ocurrencia futura pendiente, alta local aún no enviada al asignar un remoto existente, recuperación de creación anterior incierta, cancelación de borrado con copia local, dos ocurrencias el mismo día, cambio de calendario a lectura, errores de almacenamiento corrupto y referencias de tareas creadas desde temas. Se actualizaron las aserciones heredadas que suponían que un día no observado era incumplido o que Todas incluía completadas; las nuevas aserciones verifican expresamente desconocido y pendientes.

## Riesgos y límites restantes

- **Verificación real pendiente:** Google Cloud, consentimiento, ETags efectivos, datos recurrentes devueltos por la cuenta, instalación Android/iPhone y comportamiento de suspensión. No se declara V4.6 completamente aceptada.
- **Recurrencias Tasks:** no existe serie expuesta en el recurso consultado; si los marcadores no se conservan, se necesita confirmación del grupo. La API no asegura todo el historial anterior ni permite configurar la regla de recurrencia desde este cliente.
- **Clasificación Calendar:** la detección textual es heurística. Calendarios seleccionados, exclusiones y materias configuradas reducen falsos positivos, pero requieren revisión. Intervalo de descubrimiento ±730 días; no toda la vida del calendario.
- **Datos antiguos sin procedencia:** no puede repararse con certeza una contaminación que perdió toda asociación de origen. Se preserva; no se adivina por título.
- **Almacenamiento:** localStorage depende de cuota y origen. Respaldo y cola se guardan con comprobaciones, pero la limpieza del navegador o pérdida del dispositivo exige una exportación externa para recuperar campos locales. El respaldo exacto anterior ocupa espacio adicional.
- **Escala:** paginación con máximo local de 25.000 resultados por colección, 5.000 hábitos/exámenes, 20.000 tareas y 50.000 sesiones. No se ejecutó una prueba de carga al máximo. Sincronizar un historial muy grande puede requerir tiempo y espacio; falla conservando el estado anterior si no puede guardar.
- **Compatibilidad:** las pruebas de navegador fueron Chromium/Linux. Google sincroniza con Web Locks; si faltan, se detiene para no habilitar carreras entre pestañas. Safari/iPhone y barras Android deben verificarse en hardware.
- **Tiempo de estudio:** se contabilizan bloques terminados; no se inventa enfoque por el tiempo de ausencia ni se suman bloques cancelados. No se garantiza ejecución continua ni alarmas cuando el sistema suspende la PWA.

Referencias: [Task](https://developers.google.com/tasks/reference/rest/v1/tasks), [GIS token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [recurrencias Calendar](https://developers.google.com/workspace/calendar/api/guides/recurringevents), [restricciones Status Bar/Capacitor](https://capacitorjs.com/docs/apis/status-bar).
