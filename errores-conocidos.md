# Errores conocidos — Medis Diana

> Volver al índice: [CLAUDE.md](CLAUDE.md)

Registro de bugs conocidos, limitaciones y comportamientos sorprendentes,
para no re-diagnosticarlos desde cero.

## Formato de cada entrada

```
### [fecha] Título corto
- **Síntoma:** qué se observa.
- **Causa:** qué lo produce (si se conoce).
- **Estado:** abierto / mitigado / resuelto (con fecha).
- **Workaround:** cómo evitarlo mientras tanto.
```

## Errores y limitaciones actuales

### [2026-08-05] `ServiceOfferRepository.create()` nunca guarda `status` — todo servicio nuevo nace en `draft`
- **Síntoma:** un servicio recién creado desde "Nuevo Servicio" aparece como "Inactivo" en el dashboard aunque el formulario diga "El servicio estará visible y disponible" — hay que darle manualmente al toggle "Activo/Inactivo" de la tarjeta.
- **Causa:** el `INSERT INTO service_offers` en `ServiceOfferRepository.create()` (`apps/backend/src/repositories/services.repository.ts`) no incluye la columna `status` en su lista de columnas, así que siempre cae en el default de la tabla (`'draft'`), sin importar el valor de `isActive` del formulario.
- **Estado:** abierto, dejado así a propósito. Descubierto durante el feature de sincronización con CuidameDoc (2026-08-05) — se decidió explícitamente NO corregirlo ahí para no ampliar el alcance; la sincronización con CuidameDoc se diseñó para depender solo de `catalog.isActive` (que sí se guarda bien al crear), precisamente para no depender de este campo roto.

### [2026-08-05] Dos usuarios de sistema (`julie`/`julia`) con PM2 propio en la VM — el deploy puede "completarse" sin actualizar el proceso real
- **Síntoma:** `deploy-Dianamedic.ps1 -Target back` termina con "DESPLIEGUE COMPLETADO" y el PM2 del usuario `julia` en estado `online`, pero el código nuevo no se refleja en la API real — el proceso que de verdad sirve tráfico sigue con el código viejo.
- **Causa:** la VM tiene tres demonios PM2 independientes bajo tres usuarios distintos (`julie`, `julia`, `jabril`), cada uno con su propia copia registrada de `medisdiana-backend`/`medisXime-backend`/`acaripole-backend` apuntando al mismo puerto. El deploy script gestiona el PM2 de `julia`, pero el que realmente sirve tráfico en producción (para las tres apps, no solo Medis) es el de `julie` — probablemente un typo de cuenta de hace tiempo que nunca se limpió. El de `julia` pierde la carrera por el puerto y queda crash-loopeando en `errored`.
- **Estado:** abierto, sin limpiar (se resolvió manualmente reiniciando `sudo -u julie pm2 restart medisdiana-backend` para este deploy puntual, sin tocar la causa raíz). Pendiente decidir si consolidar todo bajo un solo usuario o dejarlo documentado como "el real es julie" para futuros deploys.
- **Workaround:** después de cualquier `-Target back`, verificar contra la API real (no solo el mensaje del script) y, si no refleja el cambio, `sudo -u julie pm2 restart <app>` en la VM.

### [2026-08-05] `DIANA_INTERNAL_API_KEY` nunca se configuró en producción — toda cotización de CuidameDoc se perdía en silencio
- **Síntoma:** al cerrar una historia clínica en CuidameDoc con una cotización (medicamentos + procedimientos + servicio), la HC se cerraba con éxito y mostraba confirmación normal, pero la cotización nunca aparecía en Medis ("Cotizaciones de pacientes" en Planes y Membresías, ni en Finanzas) — sin ningún error visible en ninguno de los dos sistemas.
- **Causa:** el middleware `requireInternalApiKey` (`apps/backend/src/middleware/internal-api-key.middleware.ts`) protege `POST /external-quotes` comparando el header `x-internal-api-key` contra `env.DIANA_INTERNAL_API_KEY`. Esa variable nunca se configuró en el `.env` de producción (`/var/www/medisdiana/apps/backend/.env`), así que `env.DIANA_INTERNAL_API_KEY` era `''` y el middleware rechazaba con 401 *cualquier* petición, sin importar la clave enviada — confirmado reproduciendo el 401 con la clave real antes del fix, y con 201 después. Del lado de `cuidame_doc_backend`, `submitExternalQuote` (`medical-records.service.ts`) hacía el `fetch` pero nunca revisaba `response.ok`, así que ese 401 pasaba completamente desapercibido: sin log, sin error, sin ningún rastro.
- **Estado:** resuelto (2026-08-05). Se agregó `DIANA_INTERNAL_API_KEY` al `.env` de producción (mismo valor que ya tenía guardado `cuidame_doc_backend` en `professional_integrations.internal_api_key` para el profesional 12) y se reinició `medisdiana-backend` bajo `julie` (el PM2 que realmente sirve tráfico, ver la entrada de arriba). Verificado con una petición real: 401 → 201. La cotización específica que se perdió durante el incidente (HC-1783823379251, $208.000) se reenvió manualmente una vez confirmado el fix. Del lado de `cuidame_doc_backend`, se agregó el chequeo de `response.ok` con log a `submitExternalQuote` para que un fallo futuro de este tipo quede registrado en vez de desaparecer — ese fix (commit `ad4e387`) quedó confirmado en producción el 2026-08-06 (verificado con `grep response.ok` sobre el `dist/` desplegado y `pm2 describe doc` con `status=online`).
- **Workaround (si vuelve a pasar tras un futuro re-deploy que pise el `.env`):** verificar que `DIANA_INTERNAL_API_KEY` siga presente en `/var/www/medisdiana/apps/backend/.env` — el deploy script no lo gestiona ni lo persiste, así que un `.env` nuevo/regenerado puede perderlo otra vez.

## Comportamientos a tener en cuenta (no son bugs)

- Si Diana no tiene servicios configurados en CuidameDoc, el paso 0 del
  booking no falla: muestra un botón directo para ir al calendario y los POST
  envían `clinical_service_id: undefined`.
