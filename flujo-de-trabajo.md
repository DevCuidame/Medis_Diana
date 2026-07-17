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
- Script de despliegue: `deploy-Dianamedic.ps1` (raíz del repo).
  Existe también `deploy-rapido.ps1` para despliegues rápidos.

## Gestión de servicios clínicos (fuera del repo)

Los servicios que aparecen en el paso 0 del booking se administran en
`doc.cuidame.tech` → **Mis Servicios** (sidebar profesional), con la cuenta de
la Dra. Diana (`professional_id = 12`). No se crean desde este código.
