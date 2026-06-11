#!/usr/bin/env pwsh
# fix-trigger.ps1

$VM   = "cuidame-app"
$ZONE = "us-central1-a"
$PROJ = "esmart-health"

$script = @'
#!/bin/bash
PGPASSWORD="AcariPole2024Secure!" psql -h 127.0.0.1 -U acaripole_user -d acaripole_prod <<'SQL'
DROP TRIGGER IF EXISTS trg_check_offer_capacity ON service_offers;
SELECT 'Trigger eliminado OK' AS resultado;
SQL
'@

$bytes = [System.Text.Encoding]::UTF8.GetBytes(($script -replace "`r`n", "`n"))
$tmp   = [System.IO.Path]::GetTempFileName() + ".sh"
[System.IO.File]::WriteAllBytes($tmp, $bytes)

Write-Host "Subiendo script..." -ForegroundColor Cyan
gcloud compute scp $tmp "${VM}:/tmp/fix_trigger.sh" --zone=$ZONE --project=$PROJ --quiet
gcloud compute ssh $VM --zone=$ZONE --project=$PROJ --command="bash /tmp/fix_trigger.sh; rm -f /tmp/fix_trigger.sh"

Remove-Item $tmp -ErrorAction SilentlyContinue
Write-Host "Listo. Intenta crear el servicio de nuevo." -ForegroundColor Green
