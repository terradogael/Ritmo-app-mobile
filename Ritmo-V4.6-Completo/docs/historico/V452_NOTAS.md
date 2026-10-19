# Ritmo V4.5.2 — guía de validación

## Qué cambió
- Nuevo botón **Sincronizar Diario, Facultad y parciales**, en Cuenta → Google y sincronización.
- «Diario» se convierte en hábitos; «Facultad» en tareas; calendarios editables aportan eventos titulados Parcial, Final, Recuperatorio, Recup o Examen.
- Las tareas en **Todas** ahora son solamente las pendientes. **Completadas** tiene las finalizadas.
- Se conservan los enlaces de sincronización anteriores, sin borrar ni trasladar datos automáticamente.
- Cambios cromáticos de barra superior e inferior y ajustes de zonas seguras. Android limita el color de las barras y puede exigir reconstruir la instalación o una app nativa para el efecto exacto.

## Advertencias de seguridad y limitaciones
- **Exportá tu JSON actual antes de probar.** Una versión anterior importó erróneamente elementos de «Diario» en «Tareas». Estas entradas antiguas no se borran ni se identifican sin ambigüedad para eliminarlas automáticamente. Revisalas manualmente tras un respaldo.
- La sincronización es **por botón**, no automática en segundo plano. Ritmo no recibe avisos push de Google.
- Los hábitos importados quedan programados para todos los días. Google Tasks no ofrece directamente la misma representación de horarios/rachas que Ritmo; no se convierten automáticamente historiales de ocurrencias anteriores.
- No se importan ocurrencias completadas antiguas no vinculadas como hábitos nuevos, para evitar cientos de duplicados; sí se concilian hábitos ya vinculados.
- Modificar fecha/hora de un parcial importado puede actualizar su evento remoto al sincronizar; **crear un parcial exclusivamente en Ritmo no crea todavía un evento nuevo de Google Calendar**. Los eventos recurrentes no se importan como parciales para evitar asociaciones ambiguas. Eliminaciones en cualquier lado NO se propagan.
- Para usar el botón único debés haber autorizado **Tasks y Calendar** en la sesión actual.
- Google Calendar solamente presenta los calendarios editables disponibles para las autorizaciones de la aplicación. Otros calendarios de solo lectura se dejan fuera de la sincronización bidireccional.
- Ante cambios simultáneos de un mismo registro, la rutina prioriza evitar sobrescrituras e informa un contador de conflictos; algunos conflictos requieren resolución manual o soporte de programación.
- `theme-color`, manifest y CSS no garantizan transparencia ni integración perfecta de la barra del sistema o gestos en todos los Android/Samsung. Para un acabado 100% edge-to-edge puede hacer falta empaquetar con una capa Android nativa.

## Procedimiento de prueba
1. Conservá `Ritmo-V4.5.1` y exportá un JSON antes de instalar V4.5.2. Si tenés dudas, probá en otro navegador o perfil.
2. Subí **la carpeta completa** a Netlify y actualizá la PWA. Cerrá pestañas anteriores de Ritmo.
3. Cuenta → conectar Tasks y Calendar → **Sincronizar Diario, Facultad y parciales**.
4. Verificá que aparezcan Meditar/Leer/Caminar en Hábitos, y sólo las tareas de Facultad en el listado de pendientes.
5. Comprobá que «Parcial» y «Recuperatorio» aparecen entre parciales y que cumpleaños no aparece.
6. Cambiá el estado de una tarea y un hábito de prueba desde Google, luego tocá Sincronizar en Ritmo. Invertí la dirección en elementos de prueba.
7. Comprobá los colores de barras con la app instalada, después de cerrar y reabrir completamente.

## Ejecución de pruebas automatizadas
Desde la raíz del proyecto, teniendo Node:
```
node tests/core.test.cjs
node tests/timer-metrics.test.cjs
node tests/migration.test.cjs
node tests/auth.test.cjs
node tests/sync.test.cjs
node tests/domain-sync.test.cjs
```
Las pruebas basadas en navegador y PWA requieren Playwright y Chromium disponibles; los mocks no verifican una cuenta Google real.
