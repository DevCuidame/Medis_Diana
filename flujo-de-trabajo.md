# Flujo de trabajo — Medis OpiMed

> Volver al índice: [CLAUDE.md](CLAUDE.md)

## Desarrollo local

- El frontend vive en `medisopimed-landing/` (Vite + React + TypeScript).
- El backend propio del monorepo vive en `apps/backend/`.
- Antes de tocar cualquier pantalla, revisar las reglas de
  [convenciones.md](convenciones.md) y el mapeo de términos de
  [glosario.md](glosario.md).

## Migración de pantallas

La migración de la plataforma original a temática médica se hace pantalla por
pantalla. La lista completa de pantallas y sus archivos está en
[arquitectura.md](arquitectura.md#estructura-de-pantallas--rutas). Al migrar
una pantalla:

1. Aplicar las reglas globales de tematización ([convenciones.md](convenciones.md)).
2. Renombrar conceptos según el [glosario.md](glosario.md).
3. Sustituir paleta original (dorados/rosas) por blancos/azules.
4. Registrar cambios relevantes en [decisiones.md](decisiones.md) (historial).

## Despliegue

Desde 2026-09-03 el deploy es a **Cloud Run** (proyecto GCP `esmart-health`, región
`europe-west1`) — ya no a la VM (`cuidame-app`) vía PM2/SSH. Dos servicios:

- `medisopimed-backend` — Express vía `tsx` (no `tsc`+`node`, ver más abajo), conectado
  a **Cloud SQL** (`cuidamedoc1`, base `medisopimed`) vía Cloud SQL Auth Proxy.
- `medisopimed-frontend` — build estático de `medisopimed-landing` servido con nginx,
  que además proxea `/api/` al backend. Variable `BACKEND_URL` apunta a la URL de
  Cloud Run del backend.

```powershell
# Desde la raíz del repo
.\deploy-OpiMedmedic.ps1                  # backend + frontend
.\deploy-OpiMedmedic.ps1 -Target backend
.\deploy-OpiMedmedic.ps1 -Target frontend
```

El backend necesita `apps/backend/cloud-run.env.yaml` (gitignored, no está en el
repo — variables de entorno reales en formato YAML para `--env-vars-file`,
equivalente al viejo `.env` de producción). Pedirlo aparte si hace falta recrearlo.

**Migraciones de BD no corren solas en el deploy** — `deploy-OpiMedmedic.ps1`
solo construye y publica las imágenes, no ejecuta `npm run migrate`. Cualquier
migración pendiente en `apps/backend/migrations/` debe aplicarse a mano contra
la Cloud SQL de producción (`cuidamedoc1` / `medisopimed`) antes o justo después
de desplegar el backend. Pendiente ahora mismo: migración `028_service_commercial.sql`
(tabla `service_commercial`, ver [arquitectura.md](arquitectura.md#servicios-comerciales-vs-operativos-2026-09-08)) —
correrla (`npm run migrate` desde `apps/backend/` apuntando a producción, o el
equivalente manual con `psql`) antes de que el panel admin use las pestañas
Comerciales/Operativos en producción.

**Contexto de build = raíz del monorepo** (pnpm workspace) en ambos casos — el
script copia `Dockerfile.backend` o `Dockerfile.frontend` a `./Dockerfile`
temporalmente, porque `gcloud run deploy --source` solo busca ese nombre exacto.

**Por qué el backend corre con `tsx` y no con `tsc` + `node dist/index.js`**: el
código usa alias de path de TypeScript (`@config/*`, `@utils/*`, etc.) que `tsc` no
reescribe a rutas relativas — `node dist/index.js` revienta con
`ERR_MODULE_NOT_FOUND`. `tsx` sí resuelve los alias en runtime, igual que ya hacía
PM2 en la VM.

**Por qué el frontend compila con `vite build` a secas (no `tsc -b && vite build`
como dice el script de `package.json`)**: el código tiene errores de TypeScript
preexistentes (deriva de tipos entre definiciones y uso — p. ej. `ServiceGroup` sin
`maxEnrolledCount`, `MembershipType` sin `per_consultation`) que nunca se detectaron
porque producción nunca corrió `tsc -b` en modo estricto. `vite build` compila JS
funcional igual (esbuild, sin type-check) — arreglar esos tipos es trabajo aparte,
fuera del alcance de esta migración.

## Gestión de servicios clínicos (fuera del repo)

Los servicios que aparecen en el paso 0 del booking se administran en
`doc.cuidame.tech` → **Mis Servicios** (sidebar profesional), con la cuenta de
la Dra. OpiMed (`professional_id = 12`). No se crean desde este código.
