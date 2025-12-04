# Ingenit Print Agent (MVP)

Este agente es un stub MVP para desarrollo y pruebas locales. Funciona así:

- Hace polling a `SERVER_URL` en `/api/prints?next=true` para solicitar el siguiente trabajo en cola.
- Descarga el PDF desde `/api/prints/{id}/file`.
- Ejecuta `lp -d PRINTER_NAME <file>` para enviar la impresión (recomendado: Linux/macOS con CUPS instalado).
- Reporta el estado mediante `/api/prints/{id}/status`.

Variables de entorno principales:

- `SERVER_URL` (por defecto `http://localhost:3000`)
- `PRINTER_NAME` o `AGENT_PRINTER` (nombre de la impresora para `lp`)
- `POLL_INTERVAL` (ms, por defecto `5000`)

Ejecución rápida:

```bash
cd tools/print-agent
node agent.js
```

Notas:
- Este agente es intencionalmente simple. En producción deberías:
  - Añadir autenticación (API key) en las peticiones.
  - Ejecutarlo como servicio (systemd) o Docker container con restart policy.
  - Controlar logs y rotación.
