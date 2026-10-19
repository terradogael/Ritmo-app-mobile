# Migración segura a V4.6

## Antes de actualizar

Exportá JSON desde V4.5.2 y conservá su ZIP. Mantené el mismo origen de Netlify, navegador y perfil. No borres almacenamiento ni reinstales la PWA. La migración no envía solicitudes a Google: la sincronización permanece desactivada hasta confirmar fuentes.

## Esquemas y copias

V4.4 usa esquema 2; V4.5.x usa esquema 3; V4.6 usa esquema 4. Se soporta también la migración anterior desde esquema 1. La clave principal continúa siendo `ritmo.app.state`.

Antes de la primera escritura del esquema 4 se conserva **el texto JSON original exacto** en `ritmo.app.state.pre-v46`; no se sobrescribe en las escrituras posteriores. Cuenta permite descargarlo como respaldo previo a V4.6. La copia rotativa anterior sigue en `ritmo.app.state.backup`. Si no se puede guardar el respaldo o hay cambios de otra pestaña, se bloquea el guardado y se informa el problema.

La exportación JSON V4.6 incluye datos, enlaces, cola, conflictos, revisión y archivo. Nunca contiene tokens. Importar reemplaza el estado del navegador tras confirmación explícita; no mezcla dos respaldos. Exportá antes de importar.

| Parte | Tratamiento |
|---|---|
| Hábitos y tareas | Se mantienen sus IDs y campos; no se borran durante la migración |
| Historial | Cada marca anterior se conserva en `legacyDone`; las marcas sin procedencia suficiente quedan desconocidas, revisables |
| Temas/preparación | Se mantienen IDs, textos y estados |
| Timer y sesiones | Se conservan íntegros; las sesiones futuras se fechan en Argentina |
| `sync` anterior | Se conserva completo en `sync.legacy` |
| Enlaces antiguos | Se conservan cuenta, contenedor e ID remoto; quedan sin clasificar hasta seleccionar fuentes cuando corresponde |
| `habit.googleTask` / `exam.googleEvent` | Se incorporan al sistema común de enlaces; no se asume una base compatible si no puede comprobarse |
| Creación anterior incierta | Se busca su marcador antes de publicar; no se repite automáticamente |
| Materia igual a correo | Se conserva en `legacySubject`; se muestra «Materia por asignar» |

## Reparación de contaminación Diario → Facultad

1. Conectá la cuenta original y confirmá qué ID de lista corresponde a Diario y cuál a Facultad.
2. Los enlaces de tareas provenientes del ID de Diario se apartan de la lista académica y de sus estadísticas. El registro original continúa en `tasks` con `quarantined`, y se conserva una copia con procedencia en `sync.archive`.
3. Cuando una ocurrencia se incorpora a su hábito correcto, se mantiene el ID remoto y la tarea anterior conserva referencia `repairedToHabit`.
4. Los enlaces procedentes de Facultad vuelven a aparecer como académicos. Un mismo nombre en ambas listas no autoriza fusionarlos.
5. Los orígenes ajenos/ambiguos requieren revisión. Se puede confirmar una tarea como académica local o mantenerla apartada; nunca se limpia Google durante este proceso.
6. Ocurrencias históricas con nombres parecidos se revisan en grupo. Confirmar pertenencia agrega marcadores, no completa ni borra los registros.

Una tarea antigua **sin metadatos de origen** no se clasifica como hábito sólo por su nombre: permanece local. No es posible identificar automáticamente su procedencia con certeza. Conservá el respaldo y revisá ese caso antes de activar su publicación en Facultad.

## Confirmar historial antiguo

Las versiones anteriores rellenaban pendientes sin distinguir observación de ausencia de datos. No se pueden atribuir esas marcas a una acción humana con certeza. Cuenta → Google → Historial anterior muestra las marcas conservadas; confirmalas únicamente si las reconocés. Pasan a las estadísticas locales y no generan un envío masivo de historial. Una corrección posterior hecha por fecha sí usa el flujo normal de sincronización.

El historial verificable devuelto por Google se incorpora usando la fecha real de completado en Argentina. Lo no devuelto sigue desconocido. La programación actual nunca se usa para inventar incumplimientos pasados.

## Recuperación o vuelta atrás

Si V4.6 muestra un aviso de lectura/guardado, no borres datos: exportá el respaldo previo y conservá la copia actual. Para volver a V4.5.2, republicá su ZIP en el mismo origen e importá **el respaldo exportado desde V4.5.2 o el JSON previo a V4.6**. V4.5.2 no entiende el esquema 4. Restaurar el sitio por sí solo no convierte el almacenamiento hacia atrás. Los cambios posteriores a la copia deberán reconciliarse; no importes un respaldo antiguo sobre trabajo nuevo sin exportarlo antes.

## Alcance de las pruebas

Se ejecutó una migración desde una copia de datos del modelo V4.4 y desde un fixture sintético generado con los módulos reales de V4.5.2, con contaminación heredada y enlaces de los tres dominios. Se comprobó conservación de IDs, datos, temarios, timer/sesiones, origen y respaldo byte a byte. No se tuvo acceso al localStorage real de tu teléfono ni a su historial completo.
