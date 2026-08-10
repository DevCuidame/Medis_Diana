# CLAUDE.md — Proyecto "Medis Diana" / dianamedic.cuidame.tech

## Visión general

Landing + portal de la **Dra. Diana Cristina Medina Camargo**, en producción en
`https://dianamedic.cuidame.tech`. Es una adaptación a **clínica general** de la
plataforma medisdiana; el agendamiento de citas clínicas se delega al backend
externo de **CuidameDoc** (Diana = `professional_id 12`).

Stack confirmado: monorepo con frontend **React + Vite** y backend propio
**TypeScript + Express**, con **base de datos PostgreSQL propia** accedida por
**SQL directo (pool `pg`) — sin Prisma ni otro ORM**. El agendamiento clínico
no vive en esta BD: se delega al backend externo de CuidameDoc.

Este archivo es solo el **índice maestro**: el contenido detallado vive en los
documentos enlazados abajo. No duplicar información aquí — actualizar siempre
el documento correspondiente.

## Reglas críticas

1. Una tarea solo se considera **totalmente terminada** cuando queda documentada en este `CLAUDE.md` y en los demás archivos `.md` correspondientes del proyecto.
2. Ver la **regla de oro** más abajo antes de escribir o modificar cualquier texto, estilo o UI visible.
3. **Sin Prisma ni otro ORM en el backend propio** — todas las queries y migraciones contra la BD propia son SQL directo vía el pool `pg`.
4. Al consumir el backend externo de **CuidameDoc** para el agendamiento (`professional_id 12`), no inventar campos ni endpoints que no existan ahí — confirmar contra [arquitectura.md → DianaBookingCalendar](arquitectura.md#dianabookingcalendar-medisdiana-landing) antes de construir o corregir ese flujo.

## Skills instaladas — cuándo usar cada una

### Frontend (React + Vite)

**En conjunto** — al crear una pantalla/feature desde cero o en un rediseño integral:
1. `ui-ux-pro-max` → sistema de diseño (estilo, paleta, tipografía) — siempre dentro de la paleta médica blanco/azul (regla de oro).
2. `frontend-design` → dirección visual distintiva, no genérica.
3. `emil-design-eng` → animaciones, transiciones y microinteracciones.
4. `react-core` + `react-hooks-composition` → estructura de componentes y hooks.

**Por separado** — en tareas puntuales:
- Solo animaciones → `emil-design-eng`
- Solo paleta/tipografía → `ui-ux-pro-max`
- Solo dirección visual → `frontend-design`
- Solo fetching/cache de datos → `tanstack-query`
- Solo estilos utilitarios → `tailwind`

### Verificación contra el backend externo (CuidameDoc)
- `api-review` → usar **siempre** al tocar `DianaBookingCalendar` o cualquier flujo de agendamiento, para verificar que el frontend/backend propio consumen campos y endpoints que realmente existen en CuidameDoc (regla crítica #4).

### Backend propio (TypeScript + Express + SQL directo)
- `express-production` → patrones de Express listos para producción. Usar al crear/refactorizar endpoints propios.
- `nodejs-backend` → arquitectura general de capas (controllers/services/repositories).
- `typescript-core` → tipado estricto, patrones idiomáticos TS.
- `zod` → validación de request/response en endpoints nuevos.
- `api-design-patterns` / `api-documentation` → diseño y documentación de los contratos REST propios (no los de CuidameDoc, esos son externos).
- ~~`postgresql-prisma-specialist`~~ y ~~`prisma`~~ → **no aplican** (regla crítica #3: sin Prisma, SQL directo con `pg`).
- `database-migration` → usar al escribir o revisar migraciones de la BD propia.

### Testing
- `vitest` → tests unitarios (frontend Vite y backend, si se usa el mismo runner; confirmar antes de asumir en el backend).
- `playwright` → tests E2E de flujos completos, incluyendo el paso hacia CuidameDoc en el booking.
- `testing-anti-patterns` → revisión para evitar tests inútiles o mal diseñados.
- `webapp-testing` → verificación funcional de la app corriendo.

**Regla obligatoria:** antes de marcar una tarea como terminada, correr `vitest` (unitarios) y, si la tarea toca el booking o cualquier flujo de usuario, `playwright` (E2E).

### Seguridad
- `security-scanning` → escaneo de dependencias/código. Usar en cada PR o antes de deploy.
- `threat-modeling` → al diseñar una feature con superficie de ataque nueva (integración con CuidameDoc, formularios de contacto/agendamiento).
- `dependency-audit` → auditoría periódica de paquetes desactualizados o vulnerables.

### DevOps / CI-CD
- `docker` → si el deploy está conteneirizado (confirmar en [flujo-de-trabajo.md](flujo-de-trabajo.md)).
- `github-actions` → pipelines de CI/CD.
- `env-manager` → manejo de variables de entorno/secrets (credenciales de conexión a CuidameDoc, BD propia).

### Calidad de código / flujo de trabajo (transversal, siempre activas)
- `code-review-standards` + `code-quality-scoring` → estándares de revisión.
- `pre-merge` → checklist antes de mergear a main.
- `systematic-debugging` + `root-cause-tracing` → depuración estructurada (consultar [errores-conocidos.md](errores-conocidos.md) primero).
- `verification-before-completion` → verificar antes de decir "listo", incluyendo el chequeo contra CuidameDoc (`api-review`) y contra la paleta/tono médico (regla de oro).
- `git-workflow` + `gh-cli` → manejo de ramas, commits y operaciones del repo.

### Flujo sugerido por feature completa
1. Si toca el booking, confirmar endpoint/campo real en CuidameDoc (regla crítica #4) — apoyarse en `api-review`.
2. Revisar [convenciones.md](convenciones.md) antes de escribir o modificar cualquier texto/estilo/UI (regla de oro).
3. Cambios de BD propia → SQL directo + `database-migration` (nunca Prisma — regla crítica #3).
4. Backend propio → `express-production` + `nodejs-backend` + `typescript-core` + `zod` + `api-design-patterns`.
5. Frontend → combo de la sección Frontend.
6. Tests → `vitest` + `playwright` si hay flujo de usuario o de booking.
7. Seguridad → `security-scanning` (siempre) + `threat-modeling` (si hay superficie de ataque nueva).
8. Revisión → `code-review-standards` + `pre-merge`.
9. Deploy → según [flujo-de-trabajo.md](flujo-de-trabajo.md) (`deploy-Dianamedic.ps1`).
10. Documentar en el `.md` dueño del tema (regla crítica #1).

## Índice de documentación

| Documento | Qué contiene | Consultar cuando… |
|-----------|--------------|-------------------|
| [arquitectura.md](arquitectura.md) | Stack, estructura del monorepo, mapa de pantallas/rutas, componente `DianaBookingCalendar` (flujo, endpoints, estado, constantes) | Vas a tocar código, rutas, el booking o integraciones con CuidameDoc |
| [convenciones.md](convenciones.md) | Reglas críticas de tematización, paleta de colores, tono de los textos | Vas a escribir o modificar CUALQUIER texto, estilo o UI visible |
| [glosario.md](glosario.md) | Mapeo de conceptos (pole dance → clínica) y términos técnicos (`prof_service_id`, `clinical_service_id`, slots…) | Dudas de nomenclatura o al renombrar entidades durante la migración |
| [decisiones.md](decisiones.md) | Decisiones de arquitectura vigentes con su justificación + historial de cambios | Antes de cambiar el enfoque de algo que ya funciona, o para registrar un cambio |
| [flujo-de-trabajo.md](flujo-de-trabajo.md) | Desarrollo local, proceso de migración de pantallas, despliegue (`deploy-Dianamedic.ps1`), gestión de servicios en CuidameDoc | Vas a migrar una pantalla, desplegar o configurar servicios clínicos |
| [errores-conocidos.md](errores-conocidos.md) | Bugs conocidos, limitaciones y comportamientos que no son bugs | Algo falla o se comporta raro, antes de diagnosticar desde cero |

## Regla de oro

Todo lo visible al usuario debe ser **médico, formal, blanco/azul** — nunca
mencionar pole dance ni usar la paleta dorada/rosa original. Detalle completo
en [convenciones.md](convenciones.md).

## Otros documentos del repo

En `docs/` hay documentación legacy en inglés de la plataforma original
(API.md, ARCHITECTURE.md, DATABASE.md, SETUP.md, CONTRIBUTING.md): útil como
referencia histórica, pero **no** refleja las adaptaciones de este proyecto.