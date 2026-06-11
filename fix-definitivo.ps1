#!/usr/bin/env pwsh
# fix-definitivo.ps1
# Siembra admin + parchea ruta + reconstruye frontend + reinicia backend

$VM   = "cuidame-app"
$ZONE = "us-central1-a"
$PROJ = "esmart-health"
$DIR  = "/var/www/acaripole"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FIX DEFINITIVO - AcariPole VM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# ── Paso 1: Python fix (admin + routes) ─────────────────────────────────────
$pyScript = @'
import subprocess, hashlib, secrets, os, re

DB = dict(host="127.0.0.1", user="acaripole_user", db="acaripole_prod", pw="AcariPole2024Secure!")
APP = "/var/www/acaripole"

def psql(sql):
    env = {**os.environ, "PGPASSWORD": DB["pw"]}
    r = subprocess.run(["psql","-h",DB["host"],"-U",DB["user"],"-d",DB["db"],"-c",sql],
                       env=env, capture_output=True, text=True)
    return r.stdout.strip() + r.stderr.strip()

# 1. Seed admin
salt  = secrets.token_hex(16)
key   = hashlib.pbkdf2_hmac("sha256", b"HFT2AJ543", salt.encode(), 310000, 32).hex()
h     = f"{salt}:{key}"
sql   = f"INSERT INTO users(email,password_hash,first_name,last_name,role,is_active,is_verified) VALUES('"'"'admin@acaripole.com'"'"','"'"'{h}'"'"','"'"'Acaripole'"'"','"'"'Admin'"'"','"'"'ADMIN'"'"',TRUE,TRUE) ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash,role='"'"'ADMIN'"'"',is_active=TRUE,is_verified=TRUE;"
print("[1] Admin:", psql(sql))

# 2. Patch routes
routes = f"{APP}/apps/backend/src/routes/services.routes.ts"
try:
    with open(routes) as f:
        txt = f.read()
    old = "router.post(  '/services/offers',     createOffer);          // TODO: re-add authenticate, authorize('ADMIN')"
    new = "router.post('/services/offers', authenticate, authorize('ADMIN'), createOffer);"
    if old in txt:
        with open(routes, "w") as f:
            f.write(txt.replace(old, new))
        print("[2] Ruta POST /services/offers: autenticacion agregada")
    elif "authenticate" in txt and "createOffer" in txt:
        print("[2] Ruta ya tenia autenticacion")
    else:
        # fallback: replace any matching line
        patched = re.sub(r"router\.post\(['\"]\/services\/offers['\"].*createOffer.*\);.*",
                         new, txt)
        with open(routes, "w") as f:
            f.write(patched)
        print("[2] Ruta parcheada (fallback regex)")
except Exception as e:
    print(f"[2] Error parcheando ruta: {e}")

# 3. Add backend reject/delete routes for memberships
um_routes = f"{APP}/apps/backend/src/routes/user-memberships.routes.ts"
try:
    with open(um_routes) as f:
        txt = f.read()
    if "rejectPlan" not in txt:
        old = "router.patch('/:id/confirm', authenticate, authorize('ADMIN'), confirmPayment);"
        new_block = """router.patch('/:id/confirm', authenticate, authorize('ADMIN'), confirmPayment);
router.patch('/:id/reject',  authenticate, authorize('ADMIN'), rejectPlan);
router.delete('/:id',        authenticate, authorize('ADMIN'), deletePlan);"""
        txt = txt.replace(old, new_block)
        # Also add imports
        txt = txt.replace("  confirmPayment,\n}", "  confirmPayment,\n  rejectPlan,\n  deletePlan,\n}")
        with open(um_routes, "w") as f:
            f.write(txt)
        print("[3] Rutas reject/delete memberships: agregadas")
    else:
        print("[3] Rutas reject/delete ya existen")
except Exception as e:
    print(f"[3] Error: {e}")

# 4. Verify admin exists
row = psql("SELECT id, role FROM users WHERE email='admin@acaripole.com';")
print("[4] Admin en DB:", row)
'@

# Escribir Python script con LF
$pyBytes = [System.Text.Encoding]::UTF8.GetBytes(($pyScript -replace "`r`n", "`n"))
$pyTmp   = [System.IO.Path]::GetTempFileName() + ".py"
[System.IO.File]::WriteAllBytes($pyTmp, $pyBytes)

Write-Host ""
Write-Host "[1/4] Subiendo script Python al VM..." -ForegroundColor Yellow
gcloud compute scp $pyTmp "${VM}:/tmp/fix_acari.py" --zone=$ZONE --project=$PROJ --quiet
if ($LASTEXITCODE -ne 0) { Write-Error "gcloud scp fallo. Verifica que gcloud este autenticado."; exit 1 }

Write-Host "[2/4] Ejecutando fix de admin + rutas backend..." -ForegroundColor Yellow
gcloud compute ssh $VM --zone=$ZONE --project=$PROJ --command="python3 /tmp/fix_acari.py && rm /tmp/fix_acari.py"
if ($LASTEXITCODE -ne 0) { Write-Warn "Algo fallo en el script Python" }

# ── Paso 2: Build frontend en VM ─────────────────────────────────────────────
$buildScript = @'
#!/bin/bash
set -e
APP_DIR="/var/www/acaripole"
echo ""
echo "[3/4] Compilando frontend (Vite)..."
cd "$APP_DIR/acaripole-landing"
export NODE_OPTIONS="--max-old-space-size=2048"
pnpm exec vite build 2>&1 | tail -20
echo "[OK] Frontend compilado: $(find dist -type f | wc -l) archivos"
'@

$bBytes = [System.Text.Encoding]::UTF8.GetBytes(($buildScript -replace "`r`n", "`n"))
$bTmp   = [System.IO.Path]::GetTempFileName() + ".sh"
[System.IO.File]::WriteAllBytes($bTmp, $bBytes)

Write-Host "[3/4] Compilando frontend en VM (puede tardar 2-3 min)..." -ForegroundColor Yellow
gcloud compute scp $bTmp "${VM}:/tmp/build_front.sh" --zone=$ZONE --project=$PROJ --quiet
gcloud compute ssh $VM --zone=$ZONE --project=$PROJ --command="bash /tmp/build_front.sh && rm /tmp/build_front.sh"

# ── Paso 3: Restart PM2 ──────────────────────────────────────────────────────
Write-Host "[4/4] Reiniciando backend (PM2)..." -ForegroundColor Yellow
gcloud compute ssh $VM --zone=$ZONE --project=$PROJ --command="pm2 restart all --update-env && sleep 2 && pm2 status"

# Cleanup
Remove-Item $pyTmp, $bTmp -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  TODO LISTO" -ForegroundColor Green
Write-Host "  Admin: admin@acaripole.com / HFT2AJ543" -ForegroundColor Green
Write-Host "  URL:   http://35.239.162.75" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Recarga la pagina con Ctrl+Shift+R para ver los cambios de Finanzas." -ForegroundColor Cyan
