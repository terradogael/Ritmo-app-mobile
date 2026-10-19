# Verificación V4.5.1

## Ejecutadas y aprobadas
- `node --check` en todos los archivos JavaScript.
- `node tests/core.test.cjs`
- `node tests/timer-metrics.test.cjs`
- `node tests/migration.test.cjs`
- `node tests/sync.test.cjs`
- `node tests/auth.test.cjs`
- Service worker regenerado con hashes de los recursos actuales.

## Pendientes
- Pruebas Playwright de interfaz/PWA: no disponibles por falta del paquete `playwright` en el entorno.
- OAuth con cuenta real: requiere Client ID y configuración del usuario.
- Prueba de barras del sistema Android, ícono maskable e instalación: requiere dispositivo real.

## Advertencias
- El color y transparencia de las barras Android no están totalmente bajo control de la PWA.
- No afirmar que Google Tasks ya detecta listas reales hasta hacer la prueba autorizada.
