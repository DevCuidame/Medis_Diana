# Decisiones — Medis Diana

> Volver al índice: [CLAUDE.md](CLAUDE.md)

Registro de decisiones de diseño y arquitectura, con su justificación,
para no re-discutirlas ni revertirlas por accidente.

## Decisiones vigentes

### Agendamiento delegado a CuidameDoc
El agendamiento de citas clínicas **no** usa el backend propio del monorepo
(`apps/backend/`): se delega completamente a la API de CuidameDoc
(`https://doc-api.cuidame.tech/api`), donde Diana existe como
`professional_id = 12`. El backend propio queda para el resto del portal.

### DianaBookingCalendar como componente standalone
`DianaBookingCalendar.tsx` no depende del backend del monorepo ni de su capa de
datos; habla directo con CuidameDoc. Esto permite evolucionar el booking sin
tocar el backend propio. Detalles técnicos en [arquitectura.md](arquitectura.md).

### Reutilización de la plataforma medisdiana
El proyecto parte de una copia de la plataforma medisdiana (estudio de pole
dance) adaptada a clínica general, en lugar de construir desde cero. Esto
implica la migración pantalla por pantalla y las reglas de tematización de
[convenciones.md](convenciones.md) y el mapeo de [glosario.md](glosario.md).

### Servicios clínicos gestionados desde CuidameDoc
Los servicios que ofrece Diana se crean y editan en `doc.cuidame.tech` →
Mis Servicios (sidebar profesional), no en este repositorio. Si no hay
servicios configurados, el paso 0 del booking muestra un botón directo al
calendario.

### Inventario y Cotizaciones externas — API pública vs. protegida por key
- **`GET /inventory/search` es 100% público** (sin JWT ni API key) — es solo un catálogo de precios de solo-lectura, y CuidameDoc (que sí requiere que el usuario esté autenticado ahí) lo consume server-to-server vía un proxy propio, no directo desde el navegador de la doctora.
- **`POST /external-quotes` (escritura) sí está protegido**, pero con una API key compartida (`x-internal-api-key`) en vez de JWT de usuario — porque quien llama es el backend de CuidameDoc, no un usuario logueado de Medis. Comparación con `crypto.timingSafeEqual` (no `!==` directo) para evitar timing attacks, aunque el vector real de riesgo es bajo (llamada server-to-server, no expuesta a medición pública de latencia).
- **`inventory_items.is_active` en vez de borrado físico**: una cotización ya emitida referencia un ítem de inventario por `id` dentro de su columna `items` (JSONB) — si se borrara la fila física, ese historial quedaría con una referencia rota. El soft-delete evita ese problema sin necesitar una FK con `ON DELETE SET NULL` que perdería el nombre/precio real del ítem borrado.
- **`external_quotes.items` congela el precio al momento de cotizar** (no se recalcula contra el precio actual del ítem/plan) — una cotización ya emitida no debe cambiar de monto si alguien edita el catálogo después.
- **Confirmar/Rechazar en vez de Eliminar** para cotizaciones de prueba/erróneas: no existe endpoint `DELETE` para `external_quotes` — el flujo pendiente→confirmar/rechazar ya cubre "descartar una cotización que no aplica" (rechazar), y se prefirió no agregar un tercer camino (delete físico) sin necesidad real todavía.

### Sincronización de Servicios Medis → CuidameDoc — decisiones clave
- **`catalog.isActive` decide si un servicio debe existir en CuidameDoc, nunca `service_offers.status`** — este último nunca se guarda al crear (`ServiceOfferRepository.create()` no lo incluye en el INSERT), así que basarse en él habría dejado todo servicio nuevo sin sincronizar. Bug real preexistente, documentado en [errores-conocidos.md](errores-conocidos.md), no corregido a propósito (fuera del alcance de este feature).
- **"Actualizar" en CuidameDoc es siempre borrar + crear** — CuidameDoc no tiene endpoint de edición para `/booking/my-services`. Cada edición real dispara ese ciclo y deja un huérfano `is_active=true` en la tabla global `services` de CuidameDoc (`deleteProfessionalService` allá solo desactiva el vínculo profesional↔servicio, nunca el servicio en sí). Limitación aceptada — arreglarla de raíz requeriría un endpoint nuevo en `cuidame_doc_backend`, fuera de alcance.
- **La pestaña "Catálogo Médico" no se resucita** — existía antes, sincronizaba servicios sin precio, y se eliminó por accidente en un commit de otra sesión. Se decidió conectar el formulario RIPS actual (que ya tiene precio) en vez de traer de vuelta un segundo formulario duplicado.

## Historial de cambios

| Fecha | Cambio |
|-------|--------|
| 2026-08-05 | Sincronización de Servicios Medis → CuidameDoc: `ensureDocSync` (motor nuevo) crea/borra servicios en CuidameDoc al crear/editar/eliminar una oferta en el formulario admin, con precio real (antes solo quedaba en la base local de Medis). Backfill corrido una vez en producción. Detalle en [arquitectura.md](arquitectura.md#sincronización-de-servicios-medis--cuidamedoc-2026-08-05). |
| 2026-07-09 | Añadido paso 0 "Selección de servicio" antes del calendario. `clinical_service_id` incluido en ambos POSTs. Resumen de form y card de éxito muestran el servicio elegido. `goBack` actualizado para navegar `service←calendar←slots←form`. Barra de progreso ahora 5 puntos. |
| 2026-07-17 | Inventario con precio (backend real, antes localStorage) + Cotizaciones externas en Finanzas (`external_quotes`, flujo pendiente→confirmar/rechazar), para soportar la cotización del plan de tratamiento que arma CuidameDoc al cerrar una historia clínica. Detalle en [arquitectura.md](arquitectura.md#inventario-con-precio--panel-admin). |
