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

## Comportamientos a tener en cuenta (no son bugs)

- Si Diana no tiene servicios configurados en CuidameDoc, el paso 0 del
  booking no falla: muestra un botón directo para ir al calendario y los POST
  envían `clinical_service_id: undefined`.
