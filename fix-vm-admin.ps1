#!/usr/bin/env pwsh
# fix-vm-admin.ps1 — siembra el admin en el VM y parchea la ruta de servicios

$VM_NAME  = "cuidame-app"
$ZONE     = "us-central1-a"
$PROJECT  = "esmart-health"
$APP_DIR  = "/var/www/medisdiana"

$bashScript = @'
#!/bin/bash
set -e
echo ""
echo "=== Sembrando usuario admin ==="
ADMIN_PW="HFT2AJ543"
export ADMIN_PW
ADMIN_HASH=$(node -e "
  const c = require('crypto');
  const s = c.randomBytes(16).toString('hex');
  const h = c.pbkdf2Sync(process.env.ADMIN_PW, s, 310000, 32, 'sha256').toString('hex');
  process.stdout.write(s + ':' + h);
")
printf "INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, is_verified)
VALUES ('admin@medisdiana.com', '%s', 'medisdiana', 'Admin', 'ADMIN', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      is_active = TRUE,
      is_verified = TRUE;\n" "${ADMIN_HASH}" | \
  PGPASSWORD="medisdiana2024Secure!" psql -h 127.0.0.1 -U medisdiana_user -d medisdiana_prod
echo "[OK] Admin listo: admin@medisdiana.com / HFT2AJ543"

echo ""
echo "=== Parcheando ruta POST /services/offers ==="
ROUTES_FILE="/var/www/medisdiana/apps/backend/src/routes/services.routes.ts"
if grep -q "createOffer);.*TODO" "$ROUTES_FILE"; then
  sed -i "s|router.post.*services/offers.*createOffer.*|router.post('/services/offers', authenticate, authorize('ADMIN'), createOffer);|" "$ROUTES_FILE"
  echo "[OK] Middleware de autenticacion agregado"
else
  echo "[--] Ruta ya parcheada o no encontrada, sin cambios"
fi

echo ""
echo "=== Reiniciando backend ==="
pm2 restart all --update-env 2>/dev/null || pm2 start all 2>/dev/null || true
pm2 status
echo ""
echo "=== Listo ==="
'@

# Escribir script con saltos LF
$tmp = [System.IO.Path]::GetTempFileName() + ".sh"
[System.IO.File]::WriteAllText($tmp, ($bashScript -replace "`r`n", "`n"), [System.Text.UTF8Encoding]::new($false))

Write-Host "Subiendo script al VM..." -ForegroundColor Cyan
gcloud compute scp $tmp "${VM_NAME}:/tmp/fix-admin.sh" --zone=$ZONE --project=$PROJECT --quiet

Write-Host "Ejecutando en el VM..." -ForegroundColor Cyan
gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT --command="bash /tmp/fix-admin.sh; rm -f /tmp/fix-admin.sh"

Remove-Item $tmp -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "Parche aplicado. Intenta crear el servicio de nuevo." -ForegroundColor Green
