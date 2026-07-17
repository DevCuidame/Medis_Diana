# CLAUDE.md — Proyecto "Medis Diana" / dianamedic.cuidame.tech

## Visión general

Landing + portal de la **Dra. Diana Cristina Medina Camargo**, en producción en
`https://dianamedic.cuidame.tech`. Es una adaptación a **clínica general** de la
plataforma medisdiana; el agendamiento de citas clínicas se delega al backend
externo de **CuidameDoc** (Diana = `professional_id 12`).

Este archivo es solo el **índice maestro**: el contenido detallado vive en los
documentos enlazados abajo. No duplicar información aquí — actualizar siempre
el documento correspondiente.

## Índice de documentación

| Documento | Qué contiene | Consultar cuando… |
|-----------|--------------|-------------------|
| [arquitectura.md](arquitectura.md) | Stack, estructura del monorepo, mapa de pantallas/rutas, componente `DianaBookingCalendar` (flujo, endpoints, estado, constantes) | Vas a tocar código, rutas, el booking o integraciones con CuidameDoc |
| [convenciones.md](convenciones.md) | Reglas críticas de tematización, paleta de colores, tono de los textos | Vas a escribir o modificar CUALQUIER texto, estilo o UI visible |
| [glosario.md](glosario.md) | Mapeo de conceptos (pole dance → clínica) y términos técnicos (`prof_service_id`, `clinical_service_id`, slots…) | Dudas de nomenclatura o al renombrar entidades durante la migración |
| [decisiones.md](decisiones.md) | Decisiones de arquitectura vigentes con su justificación + historial de cambios | Antes de cambiar el enfoque de algo que ya funciona, o para registrar un cambio |
| [flujo-de-trabajo.md](flujo-de-trabajo.md) | Desarrollo local, proceso de migración de pantallas, despliegue (`deploy-Dianamedic.ps1`), gestión de servicios en CuidameDoc | Vas a migrar una pantalla, desplegar o configurar servicios clínicos |
| [errores-conocidos.md](errores-conocidos.md) | Bugs conocidos, limitaciones y comportamientos que no son bugs | Algo falla o se comporta raro, antes de diagnosticar desde cero |

## Regla de oro (resumen mínimo)

Todo lo visible al usuario debe ser **médico, formal, blanco/azul** — nunca
mencionar pole dance ni usar la paleta dorada/rosa original. Detalle completo
en [convenciones.md](convenciones.md).

## Otros documentos del repo

En `docs/` hay documentación legacy en inglés de la plataforma original
(API.md, ARCHITECTURE.md, DATABASE.md, SETUP.md, CONTRIBUTING.md): útil como
referencia histórica, pero **no** refleja las adaptaciones de este proyecto.
