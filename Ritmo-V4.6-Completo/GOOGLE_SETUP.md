# Google — configuración V4.6

El Client ID público de V4.5.2 se conservó **sin cambios** en `js/google-config.js`. No hay Client secret, contraseña ni API key que agregar a Ritmo. No se verificó la conexión con tu cuenta real; las pruebas usaron mocks.

## Si ya usabas Google en V4.5.2

1. Conservá el mismo sitio/origen y cliente OAuth.
2. En Google Cloud, revisá que sigan habilitadas Google Tasks API y Google Calendar API.
3. En Google Auth Platform → Data Access, incorporá `https://www.googleapis.com/auth/calendar.events`. Sustituye el uso anterior de `calendar.events.owned` para admitir calendarios secundarios/compartidos con permiso de escritura. La app solicita Calendar sólo al tocar su botón.
4. Publicá V4.6 y, desde Cuenta → Google, conectá Tasks y renová Calendar. Si conservás la aplicación OAuth en pruebas, tu cuenta debe figurar como usuario de prueba.
5. Confirmá **Diario** para Hábitos y **Facultad** para tareas; tienen que ser listas distintas. Elegí calendarios de lectura y, si querés crear exámenes, un destino con escritura. Marcá Activar sincronización automática y guardá.
6. En Configurar materias, agregá nombres y alias; por ejemplo «Introducción a la Algoritmia», alias `progra 1, algoritmia`. Se puede asociar además un calendario dedicado a una materia.
7. Revisá grupos de recurrencias y datos migrados. La identidad se guarda por cuenta e IDs, no por título.

Los permisos de Google abarcan más que las fuentes seleccionadas. La selección de listas y calendarios es una restricción de Ritmo, no un permiso OAuth limitado a esos IDs.

## Crear configuración desde cero, sólo si hace falta

1. Entrá en [Google Cloud Console](https://console.cloud.google.com/), creá o seleccioná tu proyecto.
2. APIs y servicios → Biblioteca: habilitá **Google Tasks API** y **Google Calendar API**.
3. Google Auth Platform → Branding: nombre Ritmo, correo de soporte y contacto del desarrollador. Completá los enlaces/dominios que la consola solicite para tu uso.
4. Audience: para cuenta personal, External. Mientras probás, Testing y tu cuenta en Test users. La distribución pública puede requerir verificación de Google.
5. Data Access: configurá los permisos de la tabla.
6. Clients → Create client → **Web application**.
7. Authorized JavaScript origins: registrá el origen exacto, sin ruta. Por ejemplo `http://localhost`, `http://localhost:8000` y tu **dominio HTTPS real** de Netlify. Agregá el puerto de Live Server si lo usás. `localhost` y `127.0.0.1` son orígenes distintos y almacenamientos distintos.
8. Este flujo GIS token client usa popup; no requiere un endpoint propio de redirect ni intercambio de códigos en servidor. No inventes un URI de redirección.
9. Copiá sólo el Client ID público a `js/google-config.js`, si reemplazás el cliente recibido. Ejecutá `python3 tools/build-sw.py` y publicá el proyecto completo. No lo pegues en el chat.

| Permiso solicitado | Finalidad |
|---|---|
| `openid`, `email` | Identidad estable `sub` y correo de la cuenta conectada |
| `https://www.googleapis.com/auth/tasks` | Leer, crear, actualizar y borrar tareas tras confirmación; Tasks no ofrece escritura por lista individual |
| `https://www.googleapis.com/auth/calendar.calendarlist.readonly` | Mostrar y seleccionar calendarios |
| `https://www.googleapis.com/auth/calendar.events` | Leer y editar eventos en calendarios autorizados para la cuenta; Ritmo restringe la escritura a sus vínculos y a destinos con permiso |

## Verificación real que tenés que realizar

Antes, exportá el JSON. Elegí listas y calendario de prueba, aunque sus nombres sean otros; no pruebes borrados con datos valiosos.

1. Creá un hábito en Diario y una tarea en Facultad. Sincronizá: deben aparecer en secciones distintas. Repetí: no debe haber copias.
2. Completá/desmarcá cada uno desde Ritmo y Google. Revisá el resultado luego de sincronizar. Probá una ocurrencia nativa recurrente: verificá si Google conserva el marcador y qué historial entrega. Confirmá grupos ambiguos antes de incorporarlos.
3. Creá un «Parcial progra 1» en Calendar. Configurá el alias, verificá materia y hora. Probá también día completo, un calendario secundario y una instancia recurrente.
4. Creá y editá un examen desde Ritmo. Verificá que llegue una sola vez al destino, con zona/duración correctas; el temario debe permanecer local.
5. Editá el mismo campo en los dos lados antes de sincronizar. Comprobá el conflicto y elegí conscientemente una versión.
6. Desconectá la red, editá, recuperá conexión con la sesión todavía vigente y verificá la cola. Si recargaste o venció el token, tocá Conectar.
7. Borrá un elemento descartable en Google: Ritmo debe conservar su copia para revisión. Probá separadamente Eliminar sólo de Ritmo y Eliminar también en Google.
8. Desconectá Google y comprobá que tus datos sigan presentes.

## Sesión y solución de errores

- GIS mantiene el token sólo en memoria. Recargar, desconectar, importar un respaldo o entrar a la demo cancela la sesión local. No hay refresh token persistente, contraseña ni renovación automática mediante popup.
- Desconectar intenta revocar en Google y siempre limpia el token local. Si no se confirmó la revocación, también podés quitar el permiso en [Conexiones de tu cuenta](https://myaccount.google.com/connections).
- `origin_mismatch`: verificá protocolo, host, puerto y cliente OAuth; no agregues `/index.html` al origen.
- Permiso denegado o 403: revisá usuario de prueba, APIs, scope, rol del calendario y políticas Workspace. Ritmo conserva los cambios locales.
- 401/sesión expirada: volvé a conectar mediante el botón. Popup bloqueado: permitilo para el sitio y evitá navegadores embebidos.
- 429/red: espera creciente; reintentá luego. Una creación de respuesta incierta queda retenida para evitar duplicados. Revisá Google antes de desvincular o crear una copia manual.

Referencias oficiales consultadas el 19/10/2026: [GIS token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [Client ID y orígenes](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid), [Task](https://developers.google.com/tasks/reference/rest/v1/tasks), [instancias recurrentes Calendar](https://developers.google.com/workspace/calendar/api/guides/recurringevents). Las pruebas simuladas no verifican la configuración de tu proyecto Cloud ni el comportamiento de tu cuenta.
