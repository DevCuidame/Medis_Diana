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

## Historial de cambios

| Fecha | Cambio |
|-------|--------|
| 2026-07-09 | Añadido paso 0 "Selección de servicio" antes del calendario. `clinical_service_id` incluido en ambos POSTs. Resumen de form y card de éxito muestran el servicio elegido. `goBack` actualizado para navegar `service←calendar←slots←form`. Barra de progreso ahora 5 puntos. |
