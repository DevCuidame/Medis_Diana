#!/usr/bin/env pwsh
# diagnostico-vm.ps1 — Diagnostica y repara servicios en el VM

$VM   = "cuidame-app"
$ZONE = "us-central1-a"
$PROJ = "esmart-health"

$script = @'
#!/bin/bash
echo ""
echo "=== LOGS BACKEND (ultimas 30 lineas) ==="
pm2 logs backend --lines 30 --nostream 2>/dev/null || pm2 logs --lines 30 --nostream 2>/dev/null || true

echo ""
echo "=== ESTADO DB ==="
PGPASSWORD="medisdiana2024Secure!" psql -h 127.0.0.1 -U medisdiana_user -d medisdiana_prod -c "
SELECT 'admin_exists' as check, COUNT(*)::text as result FROM users WHERE role='ADMIN'
UNION ALL
SELECT 'service_offers_table', CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='service_offers') THEN 'YES' ELSE 'NO' END
UNION ALL
SELECT 'locations_count', COUNT(*)::text FROM locations;
"

echo ""
echo "=== SEMBRANDO ADMIN (si falta) ==="
ADMIN_HASH=$(node -e "
  const c = require('crypto');
  const s = c.randomBytes(16).toString('hex');
  const h = c.pbkdf2Sync('HFT2AJ543', s, 310000, 32, 'sha256').toString('hex');
  process.stdout.write(s + ':' + h);
")
PGPASSWORD="medisdiana2024Secure!" psql -h 127.0.0.1 -U medisdiana_user -d medisdiana_prod -c "
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, is_verified)
VALUES ('admin@medisdiana.com', '$ADMIN_HASH', 'medisdiana', 'Admin', 'ADMIN', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      role = 'ADMIN', is_active = TRUE, is_verified = TRUE;
"
echo "[OK] Admin: admin@medisdiana.com / HFT2AJ543"

echo ""
echo "=== VERIFICACION FINAL ==="
PGPASSWORD="medisdiana2024Secure!" psql -h 127.0.0.1 -U medisdiana_user -d medisdiana_prod -c "
SELECT id, email, role, is_active FROM users WHERE role='ADMIN';
"

echo ""
echo "=== RUTA POST /services/offers en el VM ==="
grep -n "services/offers" /var/www/medisdiana/apps/backend/src/routes/services.routes.ts | head -5

echo ""
echo "=== REINICIANDO BACKEND ==="
pm2 restart all --update-env 2>/dev/null || true
sleep 2
pm2 status
'@

$bytes = [System.Text.Encoding]::UTF8.GetBytes(($script -replace "`r`n", "`n"))
$tmp   = [System.IO.Path]::GetTempFileName() + ".sh"
[System.IO.File]::WriteAllBytes($tmp, $bytes)

Write-Host "Ejecutando diagnostico en el VM..." -ForegroundColor Cyan
gcloud compute scp $tmp "${VM}:/tmp/diag.sh" --zone=$ZONE --project=$PROJ --quiet
gcloud compute ssh $VM --zone=$ZONE --project=$PROJ --command="bash /tmp/diag.sh; rm -f /tmp/diag.sh"

Remove-Item $tmp -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "Diagnostico completado. Revisa los logs de arriba para ver el error exacto." -ForegroundColor Green
