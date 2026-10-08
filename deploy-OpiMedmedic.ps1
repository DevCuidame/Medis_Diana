#!/usr/bin/env pwsh
# ============================================================
#  deploy-Dianamedic.ps1 — MedisDiana deployment (Cloud Run)
#  Ya no se despliega a la VM (cuidame-app) — todo vive ahora en
#  Cloud Run, con Cloud SQL (cuidamedoc1 / medisdiana) como base.
#
#  USO:
#    .\deploy-Dianamedic.ps1                  (backend + frontend)
#    .\deploy-Dianamedic.ps1 -Target backend
#    .\deploy-Dianamedic.ps1 -Target frontend
#
#  El contexto de build es la RAIZ del monorepo (pnpm workspace) en
#  ambos casos — el Dockerfile correcto (Dockerfile.backend /
#  Dockerfile.frontend) se copia temporalmente a ./Dockerfile porque
#  "gcloud run deploy --source" solo busca ese nombre exacto.
# ============================================================

param(
    [ValidateSet("all", "frontend", "backend")]
    [string]$Target = "all"
)

$ErrorActionPreference = "Stop"

$PROJECT      = "esmart-health"
$REGION       = "europe-west1"
$ROOT_DIR     = $PSScriptRoot
$DOCKERFILE   = Join-Path $ROOT_DIR "Dockerfile"

$BACKEND_SERVICE  = "medisdiana-backend"
$FRONTEND_SERVICE = "medisdiana-frontend"
$BACKEND_URL      = "https://medisdiana-backend-606913227953.europe-west1.run.app"

function Write-Step([string]$msg) {
    Write-Host ""
    Write-Host ">> $msg" -ForegroundColor Cyan
}

function Write-Fail([string]$msg) {
    Write-Host "ERROR: $msg" -ForegroundColor Red
    exit 1
}

if ($Target -eq "all" -or $Target -eq "backend") {
    Write-Step "Desplegando backend ($BACKEND_SERVICE)..."

    $envFile = Join-Path $ROOT_DIR "apps\backend\cloud-run.env.yaml"
    if (-not (Test-Path $envFile)) {
        Write-Fail "No existe $envFile (variables de entorno reales, gitignored)"
    }

    Copy-Item (Join-Path $ROOT_DIR "Dockerfile.backend") $DOCKERFILE -Force

    gcloud run deploy $BACKEND_SERVICE `
        --source="$ROOT_DIR" `
        --region=$REGION `
        --project=$PROJECT `
        --allow-unauthenticated `
        --add-cloudsql-instances=esmart-health:us-central1:cuidamedoc1 `
        --env-vars-file="$envFile" `
        --memory=512Mi `
        --cpu=1 `
        --min-instances=1 `
        --quiet

    if ($LASTEXITCODE -ne 0) { Write-Fail "Fallo el deploy del backend" }
}

if ($Target -eq "all" -or $Target -eq "frontend") {
    Write-Step "Desplegando frontend ($FRONTEND_SERVICE)..."

    Copy-Item (Join-Path $ROOT_DIR "Dockerfile.frontend") $DOCKERFILE -Force

    gcloud run deploy $FRONTEND_SERVICE `
        --source="$ROOT_DIR" `
        --region=$REGION `
        --project=$PROJECT `
        --allow-unauthenticated `
        --set-env-vars="BACKEND_URL=$BACKEND_URL" `
        --quiet

    if ($LASTEXITCODE -ne 0) { Write-Fail "Fallo el deploy del frontend" }
}

Remove-Item $DOCKERFILE -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Deploy completado." -ForegroundColor Green
Write-Host "  Sitio: https://dianamedic.cuidame.tech" -ForegroundColor Green
