# Flujo de trabajo — Medis Diana

> Volver al índice: [CLAUDE.md](CLAUDE.md)

## Desarrollo local

- El frontend vive en `medisdiana-landing/` (Vite + React + TypeScript).
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

- Producción: `https://dianamedic.cuidame.tech`, servida desde la VM
  `instance-esmart1` (zona `us-east1-b`).
- Script de despliegue: `deploy-Dianamedic.ps1` (raíz del repo), con
  parámetro `-Target` para elegir qué desplegar:

  | Comando | Qué hace |
  |---------|----------|
  | `.\deploy-Dianamedic.ps1 -Target front` | Sube el código y recompila solo el frontend (Vite) |
  | `.\deploy-Dianamedic.ps1 -Target back` | Sube el código, `pnpm install` y reinicia el backend (PM2) |
  | `.\deploy-Dianamedic.ps1 -Target both` | Frontend + backend, **sin** migraciones ni re-provisión |
  | `.\deploy-Dianamedic.ps1` (o `-Target full`) | Todo: deps del sistema, BD, migraciones, nginx, SSL, front y back |

  Los targets `front`/`back`/`both` actualizan el código sobre la instalación
  existente (preservan `.env`, `node_modules` y la base de datos); `full`
  borra `/var/www/medisdiana`, regenera el `.env` (nuevo `JWT_SECRET` →
  invalida sesiones) y aplica las migraciones SQL. Requieren un `full`
  previo: si no hay instalación en la VM, los targets parciales fallan con
  un mensaje indicándolo.

## Gestión de servicios clínicos (fuera del repo)

Los servicios que aparecen en el paso 0 del booking se administran en
`doc.cuidame.tech` → **Mis Servicios** (sidebar profesional), con la cuenta de
la Dra. Diana (`professional_id = 12`). No se crean desde este código.
