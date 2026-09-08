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

### Aprovisionamiento automático de doctores + vínculo cabeza-trabajador — decisiones clave
- **Self-FK nullable (`head_professional_id`) en vez de una tabla `clinics`/`organizations` separada** — dado que "cada doctor ve solo lo suyo" clínicamente (decidido explícitamente con el usuario) y el único uso actual es guardar el dato, una columna auto-referenciada en `professionals` es la forma mínima que ya modela la jerarquía. Si en el futuro un doctor necesita pertenecer a más de una cabeza (many-to-many), migra a una tabla `professional_team_members` — cambio aditivo y mecánico desde este punto, no hay que pre-construirlo ahora (YAGNI).
- **Activación inmediata (sin correo de verificación) para las cuentas de trabajadores** — a diferencia del auto-registro público de CuidameDoc (`POST /auth/register`, que deja `verified: false`/`status: pending`), la cabeza que da de alta a un trabajador ya es de confianza dentro del sistema, así que la cuenta nace `active`/`verified: true` de una vez — el punto de la feature es que el trabajador pueda entrar de inmediato con las mismas credenciales.
- **Vínculo puramente organizacional, sin comportamiento todavía** — no hay consolidación de Finanzas/cotizaciones entre cabeza y trabajadores, ni límites de plan, ni visibilidad cruzada de HC/pacientes. Decidido explícitamente con el usuario: "por ahora solo es que tanto en doc como en diana se sepa que son trabajadores profesionales de [la cabeza]". Cualquier uso funcional del vínculo es trabajo futuro documentado, no implícito.
- **La "cabeza" nunca se hardcodea** — es, en cada deployment de Medis, quien sea que autentique `docAuth.ts` con sus propias credenciales de `.env`. Diana (`professional_id 12`) es la cabeza del deployment actual; el mismo mecanismo sirve sin cambios de código para Ximena (`professional_id 2`) o cualquier cliente futuro del plan — decisión explícita para no repetir este trabajo por cada clínica nueva.
- **Falla de aprovisionamiento en CuidameDoc nunca bloquea ni revierte la creación local** — mismo principio ya establecido en `ensureDocSync` (sincronización de servicios). El admin ve un toast de advertencia si falla; el profesional queda creado en Medis igual, sin `doc_professional_id`. El reintento es manual, no automático — y, se descubrió después de mergear, en la práctica tampoco funciona limpio hoy (ver [errores-conocidos.md](errores-conocidos.md)), pendiente de decisión de producto.
- **Endpoint de CuidameDoc (`POST /professionals/team-members`) abierto a cualquier profesional autenticado, no solo a un rol "dueño de clínica"** — CuidameDoc no tiene ese rol hoy (`restrictTo` ahí es un no-op). Aceptado tal cual porque coincide con el resto de `professional.routes.ts`, pero implica que cualquier profesional (incluyendo un trabajador recién creado) puede dar de alta más trabajadores debajo de sí — sin límite de profundidad ni control de ciclos. No es un problema para el caso de uso actual (Diana/Ximena, cabezas fijas), pero queda anotado como algo a revisar antes de vender el plan a más clínicas.

### Sincronización de Servicios Medis → CuidameDoc — decisiones clave
- **`catalog.isActive` decide si un servicio debe existir en CuidameDoc, nunca `service_offers.status`** — este último nunca se guarda al crear (`ServiceOfferRepository.create()` no lo incluye en el INSERT), así que basarse en él habría dejado todo servicio nuevo sin sincronizar. Bug real preexistente, documentado en [errores-conocidos.md](errores-conocidos.md), no corregido a propósito (fuera del alcance de este feature).
- **"Actualizar" en CuidameDoc es siempre borrar + crear** — CuidameDoc no tiene endpoint de edición para `/booking/my-services`. Cada edición real dispara ese ciclo y deja un huérfano `is_active=true` en la tabla global `services` de CuidameDoc (`deleteProfessionalService` allá solo desactiva el vínculo profesional↔servicio, nunca el servicio en sí). Limitación aceptada — arreglarla de raíz requeriría un endpoint nuevo en `cuidame_doc_backend`, fuera de alcance.
- **La pestaña "Catálogo Médico" no se resucita** — existía antes, sincronizaba servicios sin precio, y se eliminó por accidente en un commit de otra sesión. Se decidió conectar el formulario RIPS actual (que ya tiene precio) en vez de traer de vuelta un segundo formulario duplicado.

### Precios escalonados de control — decisiones clave
- **Regla fija de 2 niveles, no N niveles configurables** — 1er control siempre gratis, 2do en adelante siempre `control_price`. Se descartó deliberadamente un esquema de "N niveles con precio propio cada uno" por YAGNI — Diana solo pidió esos dos casos.
- **El conteo de "qué control es este" se reinicia por historia clínica**, nunca acumula de por vida del paciente — decisión explícita del dueño del producto: cada motivo de consulta nuevo empieza su propio ciclo de seguimiento.
- **La cotización de una HC se reutiliza tal cual para "Planes y Membresías"**, en vez de crear un concepto nuevo de "plan de un solo uso" en la tabla `memberships` — `external_quotes` ya identificaba al paciente por nombre/email plano (sin `user_id` de Medis) y ya tenía confirmar/rechazar, cumpliendo la restricción explícita de que **no debe existir ningún concepto de "cuenta de paciente" en Medis**. Solo hizo falta exponer el panel también en Planes, no un modelo de datos nuevo.

## Historial de cambios

| Fecha | Cambio |
|-------|--------|
| 2026-08-20 | Contenido real: retrato de Diana en "Sobre la Doctora", 3 fotos reales del consultorio reemplazan la galería de stock "Pole Dance" en el admin (Sedes → Inspiración de Espacios), WhatsApp/email reales en el Footer. Sync Medis → CuidameDoc extendido: desactivar/borrar un profesional o usuario ahora desactiva su cuenta en CuidameDoc también; reasignar una oferta de servicio a otro médico ahora dispara re-sync (antes solo un cambio en el catálogo o la duración lo disparaba); backfill de una sola vez (`resync-doc-professionals.ts`) corrido en producción para los 7 servicios que ya estaban sincronizados antes de este fix. Fix de subida de imágenes (avatar de perfil / imagen de servicio) — tres capas rotas a la vez, detalle en [errores-conocidos.md](errores-conocidos.md). |
| 2026-08-10 | Fix de login: un profesional con éxito en el backend propio de Medis (`role: PROFESSIONAL`) ahora hace el mismo handoff SSO hacia CuidameDoc que ya existía como fallback, en vez de navegar al panel interno "Portal Profesional" (vacío/legado). Además, aprovisionamiento automático: al crear un profesional en Medis, se crea su cuenta en CuidameDoc con las mismas credenciales, ya activa, enlazada como trabajador de la cabeza del sitio vía `head_professional_id` (nuevo, self-FK en `professionals`). Revisión final de rama encontró y corrigió un bug real que habría dejado el endpoint no funcional (`gender` por defecto excedía el ancho de columna), más validación de campos/duplicados faltante, un `await` sin try/catch que podía convertir una creación exitosa en 500, y un toast de advertencia visualmente indistinguible de uno de éxito. Detalle completo en [arquitectura.md](arquitectura.md#aprovisionamiento-automático-de-doctores-en-cuidamedoc--vínculo-cabeza-trabajador-2026-08-10) y [errores-conocidos.md](errores-conocidos.md). |
| 2026-08-05 | Precios escalonados de control: `service_catalog.control_price` (nullable) + campo en el formulario de servicio; 1er control gratis / 2do en adelante con precio fijo, calculado automáticamente en Seguimiento de CuidameDoc (`countPriorOccurrences`/`computeFollowUpPrice`). Panel "Cotizaciones CuidameDoc" extraído a componente compartido y montado también en Planes y Membresías (antes solo en Finanzas). Revisión final de rama encontró y corrigió 2 bugs críticos que dejaban `controlPrice` sin llegar nunca a la API y bloqueaban el guardado de cualquier servicio con el campo vacío. Investigación posterior de un reporte de "la cotización no llega a Planes" encontró y corrigió un incidente de infraestructura no relacionado (`DIANA_INTERNAL_API_KEY` faltante en producción). Detalle en [arquitectura.md](arquitectura.md#precios-escalonados-de-control-2026-08-05) y [errores-conocidos.md](errores-conocidos.md). |
| 2026-08-05 | Sincronización de Servicios Medis → CuidameDoc: `ensureDocSync` (motor nuevo) crea/borra servicios en CuidameDoc al crear/editar/eliminar una oferta en el formulario admin, con precio real (antes solo quedaba en la base local de Medis). Backfill corrido una vez en producción. Detalle en [arquitectura.md](arquitectura.md#sincronización-de-servicios-medis--cuidamedoc-2026-08-05). |
| 2026-07-09 | Añadido paso 0 "Selección de servicio" antes del calendario. `clinical_service_id` incluido en ambos POSTs. Resumen de form y card de éxito muestran el servicio elegido. `goBack` actualizado para navegar `service←calendar←slots←form`. Barra de progreso ahora 5 puntos. |
| 2026-07-17 | Inventario con precio (backend real, antes localStorage) + Cotizaciones externas en Finanzas (`external_quotes`, flujo pendiente→confirmar/rechazar), para soportar la cotización del plan de tratamiento que arma CuidameDoc al cerrar una historia clínica. Detalle en [arquitectura.md](arquitectura.md#inventario-con-precio--panel-admin). |
