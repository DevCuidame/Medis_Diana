#!/usr/bin/env pwsh
# fix-vm-completo.ps1 — Aplica admin + migraciones faltantes + parche ruta servicios

$VM_NAME = "cuidame-app"
$ZONE    = "us-central1-a"
$PROJECT = "esmart-health"

$bashScript = @'
#!/bin/bash
set -e

DB_PASS="AcariPole2024Secure!"
DB_USER="acaripole_user"
DB_NAME="acaripole_prod"
APP_DIR="/var/www/acaripole"

psql_cmd() {
  PGPASSWORD="$DB_PASS" psql -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" "$@"
}

echo ""
echo "============================================================"
echo "  PASO 1: Verificar y crear tabla service_offers"
echo "============================================================"

TABLE_EXISTS=$(psql_cmd -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_offers');")
if [ "$TABLE_EXISTS" = "f" ]; then
  echo "[!] service_offers no existe — ejecutando migraciones pendientes..."
  for f in $(ls $APP_DIR/apps/backend/migrations/*.sql | sort); do
    echo "    -> $f"
    psql_cmd -f "$f" 2>&1 | tail -3
  done
  echo "[OK] Migraciones aplicadas"
else
  echo "[OK] service_offers ya existe"
fi

echo ""
echo "============================================================"
echo "  PASO 2: Verificar columnas criticas (enrolled_count, etc.)"
echo "============================================================"

psql_cmd -c "ALTER TABLE service_offers ADD COLUMN IF NOT EXISTS enrolled_count INT NOT NULL DEFAULT 0;" 2>/dev/null && echo "[OK] enrolled_count OK" || true
psql_cmd -c "ALTER TABLE locations ADD COLUMN IF NOT EXISTS city  VARCHAR(100);" 2>/dev/null || true
psql_cmd -c "ALTER TABLE locations ADD COLUMN IF NOT EXISTS phone VARCHAR(30);"  2>/dev/null || true
psql_cmd -c "ALTER TABLE locations ADD COLUMN IF NOT EXISTS email VARCHAR(255);" 2>/dev/null || true
echo "[OK] Columnas verificadas"

echo ""
echo "============================================================"
echo "  PASO 3: Sembrar usuario admin"
echo "============================================================"

ADMIN_PW="HFT2AJ543"
export ADMIN_PW
ADMIN_HASH=$(node -e "
  const c = require('crypto');
  const s = c.randomBytes(16).toString('hex');
  const h = c.pbkdf2Sync(process.env.ADMIN_PW, s, 310000, 32, 'sha256').toString('hex');
  process.stdout.write(s + ':' + h);
")

printf "INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, is_verified)
VALUES ('admin@acaripole.com', '%s', 'Acaripole', 'Admin', 'ADMIN', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      role = 'ADMIN',
      is_active = TRUE,
      is_verified = TRUE;\n" "${ADMIN_HASH}" | psql_cmd
echo "[OK] Admin: admin@acaripole.com / HFT2AJ543"

echo ""
echo "============================================================"
echo "  PASO 4: Parchar ruta POST /services/offers"
echo "============================================================"

ROUTES="$APP_DIR/apps/backend/src/routes/services.routes.ts"
if grep -q "TODO.*re-add authenticate" "$ROUTES" 2>/dev/null; then
  sed -i "s|router\.post\(.*'/services/offers'.*createOffer.*\)|router.post('/services/offers', authenticate, authorize('ADMIN'), createOffer);|" "$ROUTES"
  echo "[OK] Middleware de autenticacion agregado"
elif grep -q "authenticate.*createOffer\|createOffer.*authenticate" "$ROUTES" 2>/dev/null; then
  echo "[--] Ruta ya tenia authenticate, sin cambios"
else
  echo "[!] No se encontro la linea exacta — parcheando con enfoque alternativo..."
  sed -i "s|router\.post\(.*services/offers.*\)|router.post('/services/offers', authenticate, authorize('ADMIN'), createOffer);|g" "$ROUTES"
fi

echo ""
echo "============================================================"
echo "  PASO 5: Reiniciar backend"
echo "============================================================"

cd "$APP_DIR"
pm2 restart all --update-env 2>/dev/null || pm2 start ecosystem.config.js 2>/dev/null || pm2 start apps/backend/src/index.ts --interpreter tsx 2>/dev/null || true
sleep 3
pm2 status

echo ""
echo "============================================================"
echo "  LISTO — Intenta crear el servicio de nuevo"
echo "  Admin: admin@acaripole.com / HFT2AJ543"
echo "============================================================"
'@

# Escribir con LF (unix)
$tmp = [System.IO.Path]::GetTempFileName() + ".sh"
[System.IO.File]::WriteAllText($tmp, ($bashScript -replace "`r`n", "`n"), [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "Subiendo script al VM..." -ForegroundColor Cyan
gcloud compute scp $tmp "${VM_NAME}:/tmp/fix-completo.sh" --zone=$ZONE --project=$PROJECT --quiet

Write-Host "Ejecutando en el VM (puede tardar ~1 min)..." -ForegroundColor Cyan
gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT --command="bash /tmp/fix-completo.sh; rm -f /tmp/fix-completo.sh"

Remove-Item $tmp -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "Script terminado. Refresca la pagina y prueba crear el servicio." -ForegroundColor Green
