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

### [2026-08-06] Citas reales de CuidameDoc invisibles en el calendario de "Programación" (Invalid Date)
- **Síntoma:** en `/admin/services` (Programación), el encabezado mostraba correctamente "11 sesiones programadas" para Diana Medina, pero el panel "Esta Semana" decía "Sin citas esta semana" aunque hubiera una cita real esa semana (confirmado directo en la BD de `cuidame_doc_backend`) — y muy probablemente tampoco se veían puntos de cita en la grilla del calendario, aunque eso no se verificó visualmente.
- **Causa:** `AdminClasses.tsx` (`loadOffers()`) construye `scheduledAt` como `` `${fecha}T${appt.appointment_time}:00` `` — pero `appt.appointment_time` ya llega como `"HH:MM:SS"` desde CuidameDoc (columna `time` de TypeORM), no `"HH:MM"`. El `:00` extra (copiado del flujo de creación de citas, donde el valor sí viene de un `<input type="time">` sin segundos) produce un datetime inválido tipo `"2026-08-09T08:30:00:00"` — `new Date(...)` devuelve `Invalid Date`, y `isSameDay`/`offersForDay` nunca ubican esa cita en ningún día real. El contador (`offers.length`) sigue siendo correcto porque no depende de parsear la fecha.
- **Estado:** resuelto (2026-08-06). Fix: tomar solo los primeros 5 caracteres (`HH:MM`) de `appointment_time` antes de agregar `:00`, robusto sin importar si el valor trae segundos o no.

### [2026-08-10] Reintentar un aprovisionamiento fallido en CuidameDoc no tiene un camino real
- **Síntoma:** si al crear un profesional en Medis el aprovisionamiento automático en CuidameDoc falla (ver [arquitectura.md](arquitectura.md#aprovisionamiento-automático-de-doctores-en-cuidamedoc--vínculo-cabeza-trabajador-2026-08-10)), el admin ve el toast de advertencia — pero "repetir la acción más adelante" (como dice el spec original) significa volver a enviar el formulario "Nueva Cuenta" con el mismo email, y eso choca con el guard `El email ya está registrado.` (409) de `ProfessionalService.create`, porque el profesional ya quedó creado localmente en el primer intento.
- **Causa:** no existe ningún endpoint ni acción de "solo reintentar el enlace a CuidameDoc" para un profesional que ya existe en Medis con `doc_professional_id: NULL` — el aprovisionamiento solo se dispara una vez, en el momento de creación.
- **Estado:** abierto, a propósito — encontrado durante la revisión final de rama (2026-08-10), pero construir el remedio (¿botón "reintentar" en el panel? ¿editar y reintentar? ¿cambiar el texto del spec para decir que no hay reintento?) es una decisión de producto, no un bug de código, y quedó fuera del alcance de esa implementación.
- **Workaround:** hoy, si esto pasa, el profesional puede auto-registrarse directamente en CuidameDoc (`doc.cuidame.tech`) con el mismo email/password — quedará como profesional independiente (`head_professional_id: NULL`) en vez de enlazado a la cabeza, hasta que se decida el remedio real.

### [2026-08-10] Borrar una sede con historial fallaba en silencio (500 crudo de Postgres, sin mensaje visible)
- **Síntoma:** al eliminar una sede desde "Sedes y Consultorios" que ya tiene consultorios o servicios asociados, el modal de confirmación simplemente se cerraba — sin error visible, sin explicación — y la sede seguía apareciendo en la lista como si nada hubiera pasado.
- **Causa:** dos bugs apilados. (1) `deleteLocation` (`apps/backend/src/controllers/location.controller.ts`) dejaba pasar el error de Postgres tal cual a un 500 genérico cuando el `DELETE FROM locations` violaba la FK `service_offers_room_id_fkey`/`service_offers_location_id_fkey` (`rooms.location_id` tiene `ON DELETE CASCADE`, pero `service_offers.room_id`/`service_offers.location_id` son `ON DELETE RESTRICT` — Postgres rechaza correctamente el borrado, pero el mensaje era ilegible para un admin). (2) `SedesDashboard.tsx` (`handleDelete`) nunca revisaba `res.ok`/`json.success` del fetch — cerraba el modal y recargaba la lista sin importar si el DELETE había fallado.
- **Estado:** resuelto (2026-08-10). El controller ahora detecta el código de error de Postgres para FK (`23503`) y devuelve 409 con `"No se puede eliminar esta sede: tiene consultorios o servicios asociados. Desactívala en su lugar."`; el frontend muestra ese mensaje dentro del modal en vez de cerrarlo. Verificado con una petición real contra la BD de producción: 500 crudo → 409 con mensaje claro.
- **Nota:** `EspaciosDashboard.tsx` (`handleDelete` de consultorios) tiene el mismo patrón de no revisar `res.ok` — no reportado por el usuario, no tocado en este fix, pendiente si vuelve a aparecer.

### [2026-08-10] El selector "Espacio" del formulario de servicios mostraba consultorios de todas las sedes mezclados
- **Síntoma:** al crear un servicio y elegir una Sede, el desplegable "Espacio" no se filtraba correctamente — aparecían (o no aparecían) consultorios que no correspondían a la sede seleccionada.
- **Causa:** `FormularioServicio.tsx` llamaba `GET /api/rooms?locationId=X`, pero esa ruta está enlazada a `getAllRooms` (`services.controller.ts`), que ignora por completo el query string y devuelve `RoomRepository.findAll()` — todos los consultorios de todas las sedes, sin filtrar. Ya existía la ruta correcta, `GET /locations/:locationId/rooms` → `getRoomsByLocation` → `RoomRepository.findByLocation()`, pero el formulario nunca la llamaba.
- **Estado:** resuelto (2026-08-10). Se cambió la URL en `FormularioServicio.tsx` a `GET /locations/:locationId/rooms`. Verificado contra la BD real: antes devolvía los 4 consultorios de las 2 sedes sin importar cuál se eligiera; después, cada sede devuelve solo los suyos.
- **Comportamiento a tener en cuenta (no es bug):** `findByLocation` solo devuelve consultorios con `is_active = TRUE` (mismo criterio que el resto del endpoint "público"). Si todos los consultorios de una sede están inactivos, el selector queda vacío para esa sede — hay que reactivar al menos uno desde "Infraestructura → Espacios" antes de poder crear un servicio ahí.

## Comportamientos a tener en cuenta (no son bugs)

- Si Diana no tiene servicios configurados en CuidameDoc, el paso 0 del
  booking no falla: muestra un botón directo para ir al calendario y los POST
  envían `clinical_service_id: undefined`.
