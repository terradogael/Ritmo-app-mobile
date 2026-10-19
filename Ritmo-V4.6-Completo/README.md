# Ritmo V4.6

Implementación lista para revisión y publicación de prueba. **No está validada con la cuenta Google real ni instalada en un teléfono físico.** Los resultados comprobados están en `TEST_REPORT.md`. Base visual y funcional: V4.5.2; no se usó el HTML antiguo como diseño.

## Ejecutar

Descomprimí el ZIP y abrí la carpeta que contiene `index.html`. No necesita compilación, servidor de aplicación ni dependencias de producción.

```bash
python3 -m http.server 8000
```

Abrí `http://localhost:8000/index.html`. También sirve VS Code + Live Server. Abrir con doble clic (`file://`) no permite validar OAuth ni PWA. En producción usá HTTPS.

## Actualizar Netlify sin perder datos

1. En la versión actual, **Cuenta → Exportar JSON**. Conservá también el ZIP anterior.
2. Descomprimí esta entrega. En **el mismo sitio de Netlify**, subí la carpeta cuyo nivel superior contiene `index.html`, `sw.js`, `manifest.webmanifest`, `_headers`, `js`, `css` y `assets`. No crees otro dominio para sustituir el actual.
3. Subí todos los archivos juntos. Desactivá transformaciones de HTML/JS/CSS del alojamiento: el service worker verifica sus hashes. No hay comando de build; el directorio de publicación es la raíz de esta carpeta.
4. Abrí Ritmo con conexión. En Cuenta buscá actualizaciones; cerrá las otras pestañas y aplicá la versión disponible. No borres los datos del sitio ni desinstales para actualizar.
5. Verificá hábitos, tareas, temarios y sesiones antes de activar Google. El esquema 3 migra al 4 y se conserva el JSON original previo. Procedimiento y vuelta atrás: `MIGRATION.md`.
6. Conectá Google, confirmá listas/calendarios y revisá los grupos pendientes. Calendar requiere renovar el permiso para acceder también a calendarios compartidos con permiso de escritura; ver `GOOGLE_SETUP.md`.

El almacenamiento pertenece al **origen** (protocolo, dominio y puerto) y al navegador/dispositivo. Cambiar de origen o teléfono requiere exportación/importación. Google no transporta iconos, temarios, configuración, historial propio completo ni sesiones Pomodoro.

## Fuentes y uso

| Sección | Fuente remota | Datos propios que se conservan |
|---|---|---|
| Hábitos | Lista elegida para Diario | Iconos, emoji, programación, archivo e historial por fecha |
| Facultad | Lista elegida para Facultad, distinta de Diario | Materia, minutos estimados y asociación con temas |
| Parciales/finales | Calendarios seleccionados | Materia asignada, temas, preparación y progreso |

Cuenta → Google permite conectar cada servicio, elegir fuentes, sincronizar y desconectar. No pide Client ID: el público recibido permanece en `js/google-config.js`. Activar las fuentes autoriza publicar los hábitos/tareas locales no vinculados en sus listas y los exámenes nuevos en el calendario de destino elegido. No se publican hábitos ni tareas en Calendar. Sin calendario de destino, los exámenes nuevos quedan locales.

La cuenta y los IDs de cada origen y elemento definen la identidad. Los nombres «Diario» y «Facultad» sólo sugieren una selección; se confirma y guarda su ID. Los registros de otra cuenta se conservan, pero no se envían con la cuenta actual. Los calendarios de lectura se pueden importar y no se modifican.

**Todas** muestra pendientes; **Completadas**, terminadas. Desde un tema podés crear una única tarea de estudio vinculada. El Pomodoro mantiene 45/15, pausa, reanudación, reinicio y decisión explícita al terminar: nunca completa una tarea automáticamente. Sus estadísticas cuentan bloques de enfoque de 45 minutos terminados; no atribuyen tiempo a descansos ni a bloques cancelados.

## Historial de hábitos y sus límites

Se consultan todas las páginas disponibles, incluidas tareas completadas y ocultas. La fecha de completado se interpreta en `America/Argentina/Buenos_Aires`. Los registros pueden ampliar el historial meses o años hacia atrás; no se reconstruyen días a partir de porcentajes mensuales.

Google Tasks no expone un identificador de serie de recurrencia en el recurso Task. Las coincidencias de título se presentan como **grupos para revisar**, nunca se unen silenciosamente. Confirmá a qué hábito corresponden. Ritmo conserva los IDs de cada ocurrencia y agrega un marcador a sus notas. Una nueva ocurrencia con ese marcador puede reconocerse; si Google no lo conserva, requiere revisión. Ritmo no configura reglas de recurrencia nativas de Tasks.

El historial faltante es **desconocido**, distinto de pendiente. Los porcentajes usan observaciones conocidas; una racha sólo atraviesa días programados verificados. El día actual todavía pendiente no corta la racha previa. Al editar la programación, los registros anteriores se conservan. Los registros antiguos sin procedencia suficiente se guardan también como `legacyDone`: podés confirmarlos desde Cuenta → Google → Historial anterior. Esa confirmación sirve a las estadísticas locales, sin enviar todas las marcas antiguas a Google.

Una corrección manual sólo apunta a la ocurrencia de esa fecha. Si hay varias, se conserva la corrección y se pide elegir por conflicto. Nunca se completa automáticamente la siguiente ocurrencia. Una nueva marca completada sin ocurrencia vinculada puede crear un registro fechado independiente; no se configura una serie recurrente.

## Sincronización, conflictos y eliminaciones

Los cambios locales y la cola se guardan primero. Mientras la app está abierta y tiene autorización vigente, se sincroniza tras conectar, cambios (agrupados durante 3 segundos), recuperar red, volver a la app y cada 2 minutos en primer plano. Hay espera creciente ante errores y un bloqueo entre pestañas. Reabrir o recargar pierde el token en memoria: el estado queda pendiente hasta tocar Conectar; no se abre un popup automáticamente. No hay sincronización con la app cerrada.

Se comparan tres versiones: última confirmada, local y remota. Cambios en campos diferentes pueden combinarse; cambios incompatibles requieren **Conservar Ritmo**, **Conservar Google** o desvincular. Las correcciones manuales de hábitos se protegen. Una edición durante una petición y un cambio de ETag también detienen la sustitución.

- Borrar sólo en Ritmo conserva Google y desvincula para no reimportar lo mismo.
- Borrar también en Google requiere el botón explícito en tareas/exámenes. La operación queda pendiente offline. Si Google cambió entretanto, se vuelve a pedir decisión. Cancelar un borrado pendiente mediante desvinculación recupera la copia local.
- Un borrado remoto conserva la copia local y abre revisión. Borrar una ocurrencia remota de hábito nunca elimina el hábito completo ni su historial.
- Una respuesta vacía no provoca borrados. Se consultan los enlaces conocidos individualmente si no aparecen en el listado.
- Una creación de resultado incierto no se repite ciegamente: primero se recupera por marcador o ID. Si no se puede confirmar, queda bloqueada para revisión. No crees otra copia manualmente antes de revisar Google.

Tasks sincroniza título, notas/descripcion, vencimiento de fecha y estado. No tiene equivalentes para todos los campos locales. Subtareas, tareas asignadas y campos que excedan los límites actuales de Ritmo se conservan en Google y se muestran para revisión (hábito: 80 caracteres; tarea: 100; descripción: 2000). Tasks no conserva una hora de vencimiento.

Calendar descubre eventos académicos dentro de ±730 días, con todas las páginas del intervalo; los enlaces existentes fuera del intervalo se consultan por ID. Reconoce parcial/final/recuperatorio/recup/recuperación/examen/coloquio y descarta términos personales conocidos. Es una heurística: revisá casos ambiguos. Los alias y calendarios configurados asignan materias; si no hay coincidencia fiable se usa «Materia por asignar», jamás un correo. Se mantiene el título original. Se distinguen día completo (fin exclusivo), horario, duración y zona IANA. Las instancias recurrentes se vinculan por ID individual; no se edita la regla de toda la serie. Horas ambiguas/inexistentes por cambio estacional requieren revisión.

## Instalar y usar offline

Primero abrí la app con conexión y esperá que Cuenta indique recursos disponibles sin conexión.

- Android: Chrome → menú → **Instalar aplicación** o **Añadir a pantalla principal**.
- iPhone: Safari → Compartir → **Añadir a pantalla de inicio** → Añadir.

Después de la carga correcta, las vistas, imágenes y ediciones locales funcionan sin red. La autorización y Google requieren conexión. El service worker sólo cachea recursos estáticos locales verificados; nunca tokens ni respuestas de Google. Una actualización incompleta se rechaza y conserva la anterior. La aplicación de una nueva versión es explícita y requiere cerrar otras pestañas.

Se preservan el icono cristalino, manifest, `viewport-fit=cover`, áreas seguras y colores por modo. La apariencia exacta de las barras de Android/iOS depende del sistema y navegador; no se puede garantizar desde una PWA. Una futura envoltura Capacitor permitiría trabajar con estilo de barras, insets y dibujo debajo del sistema, pero requiere proyecto nativo, revisar OAuth y migración del almacenamiento. Android reciente impone restricciones edge-to-edge incluso a apps nativas: no se promete un color forzado por plugin. **No se hizo esa migración.** Referencia: [Capacitor Status Bar](https://capacitorjs.com/docs/apis/status-bar).

## Desarrollo y pruebas

```bash
python3 tools/build-sw.py
node tools/run-tests.cjs
```

Para navegador necesitás Node, Playwright y Chromium como herramientas de desarrollo (no son dependencias de la app):

```bash
npm install --no-save playwright
npx playwright install chromium
node tools/run-tests.cjs --browser
```

Si usás un Chromium propio, indicá su ruta con `RITMO_CHROMIUM`. Las pruebas levantan servidores locales y deben ejecutarse en serie. Regenerá `sw.js` **después de cualquier cambio en HTML, JS, CSS, manifest o assets**. No lo regeneres en el alojamiento sobre archivos diferentes a los publicados.

Arquitectura: `core`/`metrics`/`timer` para datos locales; `storage` para persistencia; `sync-model` para enlaces, cola y migración; `google-domain-sync` para clasificación y reparación; `sync-engine` para reconciliación; `google-auth`/`google-api` para Google; `google-ui` para controles y disparadores. `?dev=1` habilita exportar un diagnóstico técnico local: contiene datos privados y no debe compartirse públicamente. Documentación anterior, sólo de referencia: `docs/historico/`.
