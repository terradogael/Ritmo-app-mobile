# Activación de Google — V4.5.1

1. Abrí Google Cloud → Google Auth Platform → Clients y copiá el **Client ID** de tipo **Aplicación web** (termina en `.apps.googleusercontent.com`).
2. Confirmá que en **Authorized JavaScript origins** figure el origen HTTPS exacto de Ritmo (por ejemplo `https://tu-sitio.netlify.app`, sin ruta ni barra final).
3. Configurá Audience = External / Testing y añadí tu cuenta como test user. Asegurate de habilitar Google Tasks API y Google Calendar API.
4. **Listo:** el Client ID público ya está incorporado en `js/google-config.js`. No tenés que introducirlo en Ritmo. **Nunca** pegues un Client secret.
5. **Listo:** el service worker ya fue regenerado con la configuración actual. Solo repetí `python tools/build-sw.py` si volvés a modificar archivos de la app.
6. Publicá **toda** la carpeta en Netlify, en el **mismo sitio y dominio** que ya usabas, y activá la actualización PWA.
7. Abrí Ritmo → Cuenta → Conectar y sincronizar → Conectar Google Tasks / Conectar Google Calendar. Elegí tu cuenta y autorizá. Las listas y calendarios se consultarán automáticamente; si no aparecen, tocá «Actualizar listas y calendarios».
8. Elegí una lista y un calendario, guardá y recién entonces sincronizá. Empezá con datos de prueba y respaldo JSON.

La sincronización sigue siendo **manual**, no automática en segundo plano. Los tokens permanecen en memoria y al reiniciar es necesario volver a conectar. La API de Calendar lista solamente calendarios propios por diseño. Si Tasks devuelve cero listas con la cuenta correcta, revisá el mensaje de error, los permisos y la cuenta elegida.
