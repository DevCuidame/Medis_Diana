#!/usr/bin/env pwsh
# deploy-rapido.ps1
# Sube los archivos clave modificados, reconstruye frontend y reinicia backend.

$VM   = "julie@cuidame-app"   # dueño de /var/www/medisdiana (evita 'permission denied' en scp)
$ZONE = "us-central1-a"
$PROJ = "esmart-health"
$APP  = "/var/www/medisdiana"
$ROOT = $PSScriptRoot

$ErrorActionPreference = "Continue"

function Write-Step([string]$msg) {
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor DarkCyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor DarkCyan
}

function Send-File([string]$local, [string]$remote) {
    $dest = "${VM}:${remote}"
    gcloud compute scp $local $dest --zone=$ZONE --project=$PROJ --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] $(Split-Path $local -Leaf)" -ForegroundColor Green
    } else {
        Write-Host "  [!]  Fallo: $local" -ForegroundColor Yellow
    }
}

# ── Archivos a subir ──────────────────────────────────────────
$files = @(
    # Backend: controladores con rejectPlan, deletePlan, rejectServicePayment, deleteServicePayment
    @{ local = "apps\backend\src\controllers\user-memberships.controller.ts"; remote = "$APP/apps/backend/src/controllers/user-memberships.controller.ts" },
    @{ local = "apps\backend\src\controllers\services.controller.ts";         remote = "$APP/apps/backend/src/controllers/services.controller.ts" },
    # Backend: rutas con reject/delete
    @{ local = "apps\backend\src\routes\user-memberships.routes.ts"; remote = "$APP/apps/backend/src/routes/user-memberships.routes.ts" },
    @{ local = "apps\backend\src\routes\services.routes.ts";          remote = "$APP/apps/backend/src/routes/services.routes.ts" },
    # Backend: repositorio con auto-approve inscripciones gratuitas
    @{ local = "apps\backend\src\repositories\services.repository.ts"; remote = "$APP/apps/backend/src/repositories/services.repository.ts" },
    @{ local = "apps\backend\src\repositories\user-membership.repository.ts"; remote = "$APP/apps/backend/src/repositories/user-membership.repository.ts" },
    # Frontend: dashboard de Finanzas con aprobar/rechazar/eliminar
    @{ local = "medisdiana-landing\src\components\admin\FinanzasDashboard.tsx"; remote = "$APP/medisdiana-landing/src/components/admin/FinanzasDashboard.tsx" },
    # Frontend: formulario de servicios con capacidad del salon
    @{ local = "medisdiana-landing\src\components\admin\FormularioServicio.tsx"; remote = "$APP/medisdiana-landing/src/components/admin/FormularioServicio.tsx" },
    # Frontend: dashboard de servicios
    @{ local = "medisdiana-landing\src\components\admin\ServiciosDashboard.tsx"; remote = "$APP/medisdiana-landing/src/components/admin/ServiciosDashboard.tsx" },
    # Frontend: schema de servicios (categoria 'Clase')
    @{ local = "medisdiana-landing\src\components\admin\servicioSchema.ts"; remote = "$APP/medisdiana-landing/src/components/admin/servicioSchema.ts" },
    # Frontend: calendario admin responsive
    @{ local = "medisdiana-landing\src\components\admin\AdminClasses.tsx"; remote = "$APP/medisdiana-landing/src/components/admin/AdminClasses.tsx" },
    # Frontend: CSS global responsive
    @{ local = "medisdiana-landing\src\components\admin\MainDashboard.css"; remote = "$APP/medisdiana-landing/src/components/admin/MainDashboard.css" },
    # Frontend: vistas de usuario (rebranding Academia medisdiana)
    @{ local = "medisdiana-landing\src\components\ArtistLogin.tsx";              remote = "$APP/medisdiana-landing/src/components/ArtistLogin.tsx" },
    @{ local = "medisdiana-landing\src\components\user\UserCalendario.tsx";      remote = "$APP/medisdiana-landing/src/components/user/UserCalendario.tsx" },
    @{ local = "medisdiana-landing\src\components\user\UserMembresias.tsx";      remote = "$APP/medisdiana-landing/src/components/user/UserMembresias.tsx" },
    @{ local = "medisdiana-landing\src\components\user\UserProfesionales.tsx";   remote = "$APP/medisdiana-landing/src/components/user/UserProfesionales.tsx" },
    @{ local = "medisdiana-landing\src\components\user\UserServicios.tsx";       remote = "$APP/medisdiana-landing/src/components/user/UserServicios.tsx" },
    # Frontend: gestión de planes (suma de sesiones por categoría + scroll)
    @{ local = "medisdiana-landing\src\components\admin\MembresiasDashboard.tsx"; remote = "$APP/medisdiana-landing/src/components/admin/MembresiasDashboard.tsx" },
    # Per-category session tracking (migration + backend + frontend)
    @{ local = "apps\backend\migrations\014_service_category.sql";                remote = "$APP/apps/backend/migrations/014_service_category.sql" },
    @{ local = "apps\backend\src\repositories\benefit.repository.ts";             remote = "$APP/apps/backend/src/repositories/benefit.repository.ts" },
    @{ local = "apps\backend\src\controllers\benefits.controller.ts";             remote = "$APP/apps/backend/src/controllers/benefits.controller.ts" },
    @{ local = "apps\backend\src\types\user-membership.types.ts";                 remote = "$APP/apps/backend/src/types/user-membership.types.ts" },
    @{ local = "medisdiana-landing\src\components\admin\BeneficiosDashboard.tsx";  remote = "$APP/medisdiana-landing/src/components/admin/BeneficiosDashboard.tsx" },
    @{ local = "medisdiana-landing\src\components\user\UserServicios.tsx";         remote = "$APP/medisdiana-landing/src/components/user/UserServicios.tsx" },
    # Inscripción: coexistencia con planes + descuento + bloqueo sin inscripción
    @{ local = "apps\backend\src\repositories\user-membership.repository.ts";    remote = "$APP/apps/backend/src/repositories/user-membership.repository.ts" },
    @{ local = "apps\backend\src\controllers\user-memberships.controller.ts";    remote = "$APP/apps/backend/src/controllers/user-memberships.controller.ts" },
    @{ local = "apps\backend\src\routes\user-memberships.routes.ts";             remote = "$APP/apps/backend/src/routes/user-memberships.routes.ts" },
    @{ local = "apps\backend\src\controllers\services.controller.ts";            remote = "$APP/apps/backend/src/controllers/services.controller.ts" },
    # Fix: borrar plan con compras asociadas devolvía 500 -> ahora 409 con mensaje claro
    @{ local = "apps\backend\src\controllers\memberships.controller.ts";         remote = "$APP/apps/backend/src/controllers/memberships.controller.ts" },

    # ── Sesión: horarios multi-bloque por sede, especialidades editables, nivel "Todos los niveles" y logout fijo en sidebar ──
    @{ local = "apps\backend\migrations\015_operating_hours_blocks.sql";          remote = "$APP/apps/backend/migrations/015_operating_hours_blocks.sql" },
    @{ local = "apps\backend\src\controllers\location.controller.ts";             remote = "$APP/apps/backend/src/controllers/location.controller.ts" },
    @{ local = "apps\backend\src\repositories\location.repository.ts";            remote = "$APP/apps/backend/src/repositories/location.repository.ts" },
    @{ local = "packages\shared-types\src\models\services.types.ts";              remote = "$APP/packages/shared-types/src/models/services.types.ts" },
    @{ local = "medisdiana-landing\src\lib\schemas\sedeSchema.ts";                  remote = "$APP/medisdiana-landing/src/lib/schemas/sedeSchema.ts" },
    @{ local = "medisdiana-landing\src\components\admin\FormularioSede.tsx";       remote = "$APP/medisdiana-landing/src/components/admin/FormularioSede.tsx" },
    @{ local = "medisdiana-landing\src\components\admin\SedesDashboard.tsx";       remote = "$APP/medisdiana-landing/src/components/admin/SedesDashboard.tsx" },
    @{ local = "medisdiana-landing\src\components\admin\EspaciosDashboard.tsx";    remote = "$APP/medisdiana-landing/src/components/admin/EspaciosDashboard.tsx" },
    @{ local = "medisdiana-landing\src\components\admin\CreateProfessionalModal.tsx"; remote = "$APP/medisdiana-landing/src/components/admin/CreateProfessionalModal.tsx" },
    @{ local = "medisdiana-landing\src\components\user\UserLayout.tsx";            remote = "$APP/medisdiana-landing/src/components/user/UserLayout.tsx" },
    @{ local = "medisdiana-landing\src\components\Footer.tsx";                     remote = "$APP/medisdiana-landing/src/components/Footer.tsx" }
)

Write-Step "Subiendo $($files.Count) archivos al VM..."
foreach ($f in $files) {
    $localPath = Join-Path $ROOT $f.local
    if (Test-Path $localPath) {
        Send-File $localPath $f.remote
    } else {
        Write-Host "  [--] No encontrado: $($f.local)" -ForegroundColor Yellow
    }
}

# ── Build + restart ───────────────────────────────────────────
Write-Step "Reconstruyendo frontend y reiniciando backend..."

$remoteScript = @'
#!/bin/bash
APP_DIR="/var/www/medisdiana"

echo "[0] Ejecutando migración 014 (service_category)..."
cd "$APP_DIR"
# Detectar credenciales de la DB desde el entorno de PM2
DB_URL=$(pm2 env 0 2>/dev/null | grep DATABASE_URL | awk -F'= ' '{print $2}' | tr -d "'\"")
if [ -z "$DB_URL" ]; then
  # Fallback: leer del archivo .env si existe
  if [ -f "$APP_DIR/apps/backend/.env" ]; then
    DB_URL=$(grep DATABASE_URL "$APP_DIR/apps/backend/.env" | cut -d '=' -f2-)
  fi
fi
if [ -n "$DB_URL" ]; then
  psql "$DB_URL" -f "$APP_DIR/apps/backend/migrations/014_service_category.sql" && echo "[OK] Migración 014 aplicada" || echo "[!] Migración 014 falló (puede que ya esté aplicada)"
else
  echo "[!] No se encontró DATABASE_URL — ejecuta la migración manualmente:"
  echo "    psql \$DATABASE_URL -f $APP_DIR/apps/backend/migrations/014_service_category.sql"
fi

echo ""
echo "[1] Ejecutando migración 015 (operating_hours_blocks)..."
if [ -n "$DB_URL" ]; then
  psql "$DB_URL" -f "$APP_DIR/apps/backend/migrations/015_operating_hours_blocks.sql" && echo "[OK] Migración 015 aplicada" || echo "[!] Migración 015 falló (puede que ya esté aplicada)"
else
  echo "[!] No se encontró DATABASE_URL — ejecuta la migración manualmente:"
  echo "    psql \$DATABASE_URL -f $APP_DIR/apps/backend/migrations/015_operating_hours_blocks.sql"
fi

echo ""
echo "[2] Compilando frontend con Vite (2-3 min)..."
cd "$APP_DIR/medisdiana-landing"
export NODE_OPTIONS="--max-old-space-size=2048"
pnpm exec vite build 2>&1 | tail -20

BUILT=$(find dist -type f 2>/dev/null | wc -l)
echo "[OK] Frontend: $BUILT archivos"

echo ""
echo "[3] Reiniciando backend..."
pm2 restart all --update-env 2>/dev/null || pm2 start all 2>/dev/null || true
sleep 3
pm2 status

echo ""
echo "============================================"
echo " DEPLOY COMPLETADO"
echo " Recarga con Ctrl+Shift+R"
echo "============================================"
'@

$bytes = [System.Text.Encoding]::UTF8.GetBytes(($remoteScript -replace "`r`n", "`n"))
$tmpSh = [System.IO.Path]::GetTempFileName() + ".sh"
[System.IO.File]::WriteAllBytes($tmpSh, $bytes)

gcloud compute scp $tmpSh "${VM}:/tmp/build_restart.sh" --zone=$ZONE --project=$PROJ --quiet
gcloud compute ssh $VM --zone=$ZONE --project=$PROJ --command="bash /tmp/build_restart.sh; rm -f /tmp/build_restart.sh"

Remove-Item $tmpSh -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Listo. Recarga la pagina con Ctrl+Shift+R." -ForegroundColor Green
