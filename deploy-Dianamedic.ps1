# ============================================================
#  deploy-medisdiana.ps1  —  medisdiana deployment en GCP
#  VM: cuidame-app | IP: 35.239.162.75 | Proyecto: esmart-health
#
#  USO:
#    .\deploy-medisdiana.ps1
#    .\deploy-medisdiana.ps1 -DbPass "OtraPass!" -SkipUpload
# ============================================================

param(
    [string]$DbPass    = "medisdiana2024Secure!",
    [string]$JwtSecret = "",
    [string]$CertbotEmail = "admin@medisdiana.com",
    [switch]$SkipUpload
)
$DbPassword = $DbPass   # alias interno para compatibilidad con placeholders

$ErrorActionPreference = "Continue"

# ── CONFIG ──────────────────────────────────────────────────
$VM_NAME     = "cuidame-app"
$ZONE        = "us-central1-a"
$PROJECT_ID  = "esmart-health"
$VM_IP       = "35.239.162.75"
$WEB_PORT    = "80"
$HTTPS_PORT  = "443"
$APP_PORT    = "3012"
$SITE_HOST   = "dianamedic.cuidame.tech"
$DB_NAME     = "medisdiana_prod"
$DB_USER     = "medisdiana_user"
$APP_DIR     = "/var/www/medisdiana"
$PROJ_ROOT   = $PSScriptRoot

if (-not $JwtSecret) {
    $JwtSecret = "medisdiana-jwt-$(Get-Random -Maximum 999999)-$(Get-Random -Maximum 9999)-prod"
}

# ── HELPERS ──────────────────────────────────────────────────
function Write-Step([string]$msg) {
    Write-Host ""
    Write-Host ("=" * 62) -ForegroundColor DarkCyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host ("=" * 62) -ForegroundColor DarkCyan
}
function Write-OK([string]$msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green  }
function Write-Warn([string]$msg) { Write-Host "  [!]  $msg" -ForegroundColor Yellow }

# Escribe el script bash en un .sh temporal con saltos LF, lo sube y ejecuta
function Invoke-RemoteBash {
    param([string]$Script, [string]$Label = "step")

    $lf   = $Script -replace "`r`n", "`n" -replace "`r", "`n"
    $base = "medisdiana_$(Get-Date -Format 'HHmmss_fff')"
    $local = Join-Path $env:TEMP "$base.sh"
    [System.IO.File]::WriteAllText($local, $lf, [System.Text.UTF8Encoding]::new($false))

    $remote    = "/tmp/$base.sh"
    $remoteLog = "/tmp/$base.log"
    $remoteRc  = "/tmp/$base.rc"
    $launcher  = "/tmp/$base.run"

    # Wrapper: corre el script en background y guarda el exit code en un archivo
    $launcherText = ((@'
#!/bin/bash
(bash __SCRIPT__ > __LOG__ 2>&1; echo $? > __RC__) &
'@) -replace '__SCRIPT__', $remote -replace '__LOG__', $remoteLog -replace '__RC__', $remoteRc)
    $launcherLf = $launcherText -replace "`r`n", "`n" -replace "`r", "`n"
    $localLauncher = Join-Path $env:TEMP "$base.run"
    [System.IO.File]::WriteAllText($localLauncher, $launcherLf, [System.Text.UTF8Encoding]::new($false))

    try {
        # Subir script principal y launcher
        gcloud compute scp $local "${VM_NAME}:${remote}" `
            --zone=$ZONE --project=$PROJECT_ID --quiet 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "SCP fallo en $Label" }

        gcloud compute scp $localLauncher "${VM_NAME}:${launcher}" `
            --zone=$ZONE --project=$PROJECT_ID --quiet 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "SCP launcher fallo en $Label" }

        # Lanzar en background — SSH retorna inmediatamente
        gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT_ID `
            --command="bash $launcher" --quiet 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Lanzador fallo en $Label" }

        # Polling cada 15 s con conexiones SSH cortas hasta que aparezca el .rc
        $timeout = 900
        $elapsed = 0
        Write-Host "  Ejecutando $Label " -NoNewline
        do {
            Start-Sleep -Seconds 15
            $elapsed += 15
            Write-Host "." -NoNewline

            $done = ((gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT_ID `
                --command="test -f $remoteRc && echo 1 || echo 0" --quiet 2>$null) -join "").Trim()
            if ($elapsed -ge $timeout) { throw "Timeout en $Label (${timeout}s)" }
        } until ($done -eq "1")
        Write-Host " ($elapsed s)"

        # Mostrar output completo del script
        gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT_ID `
            --command="cat $remoteLog"

        # Verificar exit code
        $rc = ((gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT_ID `
            --command="cat $remoteRc" --quiet 2>$null) -join "").Trim()
        if ($rc -ne "0") { throw "Script remoto fallo en $Label (rc=$rc)" }

    } finally {
        gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT_ID `
            --command="rm -f $remote $remoteLog $remoteRc $launcher" --quiet *>$null
        Remove-Item $local, $localLauncher -ErrorAction SilentlyContinue
    }
}

# ── PASO 1: Verificar gcloud ──────────────────────────────────
Write-Step "PASO 1/11  Verificando gcloud CLI"

$v = gcloud version 2>$null | Select-String "Google Cloud SDK"
if (-not $v) {
    Write-Error "gcloud no instalado. https://cloud.google.com/sdk/docs/install"
    exit 1
}
Write-OK $v
gcloud config set project $PROJECT_ID 2>&1 | Out-Null
Write-OK "Proyecto activo: $PROJECT_ID"

# ── PASO 2: Firewall ──────────────────────────────────────────
Write-Step "PASO 2/11  Configurando firewall GCP (puertos 80 y 443)"

$rule = gcloud compute firewall-rules list `
    --filter="name=medisdiana-allow-web" --format="value(name)" 2>$null
if (-not $rule) {
    gcloud compute firewall-rules create medisdiana-allow-web `
        --project=$PROJECT_ID --direction=INGRESS --priority=1000 `
        --network=default --action=ALLOW --rules=tcp:80,tcp:443 `
        --source-ranges=0.0.0.0/0 --description="medisdiana HTTP/HTTPS" 2>&1 | Out-Null
    Write-OK "Regla TCP:80 y TCP:443 creada"
} else {
    Write-OK "Regla TCP:80/443 ya existe"
}

# ── PASO 3: Empaquetar proyecto ───────────────────────────────
if (-not $SkipUpload) {
    Write-Step "PASO 3/11  Creando paquete de despliegue"

    $staging = "$env:TEMP\media-staging"
    $zipPath = "$env:TEMP\media-deploy.zip"

    if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
    New-Item -ItemType Directory -Path $staging | Out-Null

    Write-Host "  Copiando archivos (excluye node_modules, .git, dist)..."
    robocopy $PROJ_ROOT $staging /E `
        /XD node_modules .git .turbo dist .vite `
        /XF "*.log" ".env" ".env.local" ".env.production" `
        /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
    # robocopy exit 0-7 = OK (no error)
    if ($LASTEXITCODE -gt 7) { throw "robocopy fallo: $LASTEXITCODE" }

    if (Test-Path $zipPath) { Remove-Item $zipPath }
    Compress-Archive -Path "$staging\*" -DestinationPath $zipPath
    $mb = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)
    Write-OK "Paquete: media-deploy.zip ($mb MB)"
    Remove-Item $staging -Recurse -Force

    # ── PASO 4: Subir archivo ─────────────────────────────────
    Write-Step "PASO 4/11  Subiendo paquete a la VM"
    gcloud compute scp $zipPath "${VM_NAME}:/tmp/media-deploy.zip" `
        --zone=$ZONE --project=$PROJECT_ID --quiet
    if ($LASTEXITCODE -ne 0) { throw "gcloud scp fallo" }
    Write-OK "Paquete subido a /tmp/media-deploy.zip"
} else {
    Write-Step "PASO 3-4/11  Upload omitido (-SkipUpload)"
}

# ── PASO 5: Instalar dependencias ────────────────────────────
Write-Step "PASO 5/11  Instalando dependencias en VM"

# Nota: @'...'@ es literal — bash usa sus propias variables $()
Invoke-RemoteBash -Label "install-deps" -Script @'
#!/bin/bash
set -euo pipefail
echo "--- Actualizando sistema ---"
sudo apt-get update -qq

# Node.js 20 LTS
if ! command -v node &>/dev/null; then
    echo "--- Instalando Node.js 20 ---"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 2>/dev/null
    sudo apt-get install -y nodejs 2>/dev/null
fi
echo "Node: $(node --version)"

# pnpm
if ! command -v pnpm &>/dev/null; then
    echo "--- Instalando pnpm ---"
    sudo npm install -g pnpm@9 2>/dev/null
fi
echo "pnpm: $(pnpm --version)"

# PM2
if ! command -v pm2 &>/dev/null; then
    sudo npm install -g pm2 2>/dev/null
fi

# PostgreSQL
if ! command -v psql &>/dev/null; then
    echo "--- Instalando PostgreSQL ---"
    sudo apt-get install -y postgresql postgresql-contrib 2>/dev/null
    sudo systemctl enable postgresql
    sudo systemctl start postgresql
fi
echo "Postgres: $(psql --version)"

# nginx
if ! command -v nginx &>/dev/null && [ ! -x /usr/sbin/nginx ]; then
    echo "--- Instalando nginx ---"
    sudo apt-get install -y nginx 2>/dev/null
    sudo systemctl enable nginx
    sudo systemctl start nginx
fi
if command -v nginx &>/dev/null; then
    echo "nginx: $(nginx -v 2>&1)"
elif [ -x /usr/sbin/nginx ]; then
    echo "nginx: $(/usr/sbin/nginx -v 2>&1)"
else
    echo "nginx: not found"
fi

sudo apt-get install -y unzip curl git certbot python3-certbot-nginx 2>/dev/null

echo ""
echo "=== Dependencias OK ==="
'@

Write-OK "Dependencias instaladas (Node/pnpm/PM2/PostgreSQL/nginx)"

# ── PASO 6: Configurar PostgreSQL ────────────────────────────
Write-Step "PASO 6/11  Configurando PostgreSQL"

# Usamos placeholders __VAR__ que PowerShell reemplaza antes de subir
$s06 = (@'
#!/bin/bash
set -euo pipefail
DB_NAME="__DB_NAME__"
DB_USER="__DB_USER__"
DB_PASS="__DB_PASS__"

echo "--- Asegurando peer auth para postgres ---"
PG_HBA=$(sudo find /etc/postgresql -name "pg_hba.conf" 2>/dev/null | head -1)
if [ -n "$PG_HBA" ]; then
    echo "  pg_hba.conf: $PG_HBA"
    sudo sed -i -E 's/^(local[[:space:]]+all[[:space:]]+postgres[[:space:]]+)(md5|scram-sha-256|password)/\1peer/' "$PG_HBA"
    sudo systemctl reload postgresql
    sleep 1
    echo "  Peer auth OK"
fi

echo "--- Creando usuario y base de datos ---"

sudo -u postgres psql -v ON_ERROR_STOP=0 <<SQL
DO \$do\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE USER "${DB_USER}" WITH PASSWORD '${DB_PASS}';
    RAISE NOTICE 'Usuario creado';
  ELSE
    ALTER USER "${DB_USER}" WITH PASSWORD '${DB_PASS}';
    RAISE NOTICE 'Password actualizado';
  END IF;
END
\$do\$;

SELECT 'CREATE DATABASE "${DB_NAME}" OWNER "${DB_USER}"'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')
\gexec

GRANT ALL PRIVILEGES ON DATABASE "${DB_NAME}" TO "${DB_USER}";
SQL

echo "--- Verificando conexion ---"
PGPASSWORD="${DB_PASS}" psql -h 127.0.0.1 -U "${DB_USER}" -d "${DB_NAME}" \
    -c "SELECT current_database(), now();"

echo "=== PostgreSQL OK ==="
'@) `
    -replace '__DB_NAME__', $DB_NAME `
    -replace '__DB_USER__', $DB_USER `
    -replace '__DB_PASS__', $DbPassword

Invoke-RemoteBash -Label "setup-db" -Script $s06
Write-OK "Base de datos '$DB_NAME' lista"

# ── PASO 7: Extraer y configurar proyecto ────────────────────
Write-Step "PASO 7/11  Configurando proyecto en VM"

$s07 = (@'
#!/bin/bash
set -euo pipefail
APP_DIR="__APP_DIR__"
DB_NAME="__DB_NAME__"
DB_USER="__DB_USER__"
DB_PASS="__DB_PASS__"
APP_PORT="__APP_PORT__"
WEB_PORT="__WEB_PORT__"
SITE_HOST="__SITE_HOST__"
JWT_SECRET="__JWT_SECRET__"
VM_IP="__VM_IP__"
EMAIL_PASS="pkiixzomqxkgolwj"
ADMIN_PW="HFT2AJ543"

echo "--- Extrayendo proyecto ---"
sudo rm -rf "${APP_DIR}"
sudo mkdir -p "${APP_DIR}"
sudo chown "$USER" "${APP_DIR}"
set +e
unzip -o /tmp/media-deploy.zip -d "${APP_DIR}" > /dev/null
UNZIP_RC=$?
set -e
[ $UNZIP_RC -le 1 ] || { echo "ERROR: unzip fallo con codigo $UNZIP_RC"; exit $UNZIP_RC; }

echo "--- Corrigiendo permisos (unzip Windows puede crear dirs con permisos 0) ---"
sudo chown -R "$USER":"$USER" "${APP_DIR}"
sudo find "${APP_DIR}" -type d -exec chmod 755 {} +
sudo find "${APP_DIR}" -type f -exec chmod 644 {} +

echo "--- Creando .env de produccion ---"
cat > "${APP_DIR}/apps/backend/.env" <<ENVEOF
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}
NODE_ENV=production
PORT=${APP_PORT}
JWT_SECRET=${JWT_SECRET}
CORS_ORIGIN=http://${SITE_HOST}:${WEB_PORT}
EMAIL_PASSWORD=${EMAIL_PASS}
EMAIL_USER=contacto@esmart-tek.com
EMAIL_SECURE=true
EMAIL_PORT=465
EMAIL_HOST=smtp.gmail.com
ADMINPW=${ADMIN_PW}
ENVEOF

echo "--- Instalando dependencias npm ---"
cd "${APP_DIR}"
# Limpiar cache de pnpm para evitar conflictos con módulos del ZIP
pnpm store prune 2>/dev/null || true
# Instalar todas las dependencias del monorepo (frozen=false para evitar errores de lockfile)
pnpm install --no-frozen-lockfile 2>&1

echo ""
echo "=== Proyecto configurado en ${APP_DIR} ==="
ls -la "${APP_DIR}"
'@) `
    -replace '__APP_DIR__',    $APP_DIR `
    -replace '__DB_NAME__',    $DB_NAME `
    -replace '__DB_USER__',    $DB_USER `
    -replace '__DB_PASS__',    $DbPassword `
    -replace '__APP_PORT__',   $APP_PORT `
    -replace '__WEB_PORT__',   $WEB_PORT `
    -replace '__SITE_HOST__',  $SITE_HOST `
    -replace '__JWT_SECRET__', $JwtSecret `
    -replace '__VM_IP__',      $VM_IP

Invoke-RemoteBash -Label "setup-project" -Script $s07
Write-OK "Proyecto extraido + .env creado + npm install completado"

# ── PASO 8: Build frontend ────────────────────────────────────
Write-Step "PASO 8/11  Compilando frontend (Vite/React)"

$s08 = (@'
#!/bin/bash
set -euo pipefail
APP_DIR="__APP_DIR__"
echo "--- Build frontend ---"
cd "${APP_DIR}/medisdiana-landing"
# NODE_OPTIONS para dar suficiente memoria al proceso de Node/Vite
export NODE_OPTIONS="--max-old-space-size=2048"
NODE_OPTIONS="--max-old-space-size=2048" pnpm exec vite build 2>&1
echo ""
echo "=== Frontend compilado ==="
echo "Archivos en dist/: $(find dist -type f | wc -l)"
ls -lh dist/
'@) -replace '__APP_DIR__', $APP_DIR

Invoke-RemoteBash -Label "build-frontend" -Script $s08
Write-OK "Frontend compilado en $APP_DIR/medisdiana-landing/dist"

# ── PASO 9: Migraciones SQL ───────────────────────────────────
Write-Step "PASO 9/11  Ejecutando migraciones de base de datos (13 archivos)"

$s09 = (@'
#!/bin/bash
set -euo pipefail
APP_DIR="__APP_DIR__"
DB_USER="__DB_USER__"
DB_PASS="__DB_PASS__"
DB_NAME="__DB_NAME__"

MIGRATIONS="${APP_DIR}/apps/backend/migrations"
echo "--- Aplicando migraciones ---"

for f in $(ls "${MIGRATIONS}"/*.sql | sort); do
    echo -n "  $(basename $f) ... "
    PGPASSWORD="${DB_PASS}" psql -h 127.0.0.1 -U "${DB_USER}" -d "${DB_NAME}" \
        -f "${f}" 2>&1 | tail -3
    echo "  listo"
done

echo ""
echo "--- Creando/actualizando usuario admin ---"
ADMIN_PW="HFT2AJ543"
export ADMIN_PW
ADMIN_HASH=$(node -e "const c=require('crypto');const s=c.randomBytes(16).toString('hex');const h=c.pbkdf2Sync(process.env.ADMIN_PW,s,310000,32,'sha256').toString('hex');process.stdout.write(s+':'+h)")

printf "INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, is_verified)\nVALUES ('admin@medisdiana.com', '%s', 'medisdiana', 'Admin', 'ADMIN', TRUE, TRUE)\nON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = TRUE, is_verified = TRUE;\n" "${ADMIN_HASH}" | \
  PGPASSWORD="${DB_PASS}" psql -h 127.0.0.1 -U "${DB_USER}" -d "${DB_NAME}"
echo "Admin listo: admin@medisdiana.com / ${ADMIN_PW}"

echo ""
echo "=== Tablas en la base de datos ==="
PGPASSWORD="${DB_PASS}" psql -h 127.0.0.1 -U "${DB_USER}" -d "${DB_NAME}" -c "\dt"
'@) `
    -replace '__APP_DIR__', $APP_DIR `
    -replace '__DB_USER__', $DB_USER `
    -replace '__DB_PASS__', $DbPassword `
    -replace '__DB_NAME__', $DB_NAME

Invoke-RemoteBash -Label "migrations" -Script $s09
Write-OK "Migraciones aplicadas"

# ── PASO 10: Configurar nginx ─────────────────────────────────
Write-Step "PASO 10/11  Configurando nginx"

# El bloque nginx usa $uri, $http_upgrade etc. (variables nginx, no PS)
# Con @'...'@ estas se preservan literales; solo reemplazamos __PLACEHOLDERS__
$s10 = (@'
#!/bin/bash
set -euo pipefail

echo "--- Escribiendo config nginx ---"
sudo tee /etc/nginx/sites-available/medisdiana > /dev/null <<'NGINX_CONF'
server {
    listen __WEB_PORT__;
    server_name __SITE_HOST__;
    server_tokens off;

    # Frontend React SPA
    root __APP_DIR__/medisdiana-landing/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, no-transform";
    }

    # Assets estaticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Backend API  (proxy interno)
    location /api/ {
        proxy_pass http://127.0.0.1:__APP_PORT__;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
        proxy_connect_timeout 10s;
    }

    location = /health {
        proxy_pass http://127.0.0.1:__APP_PORT__/health;
        access_log off;
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml image/svg+xml;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
NGINX_CONF

sudo ln -sf /etc/nginx/sites-available/medisdiana /etc/nginx/sites-enabled/medisdiana
sudo rm -f /etc/nginx/sites-enabled/default

echo "--- Verificando config ---"
sudo nginx -t

echo "--- Recargando nginx ---"
sudo systemctl reload nginx

echo "=== nginx OK ==="
sudo systemctl status nginx --no-pager | head -5
'@) `
    -replace '__WEB_PORT__', $WEB_PORT `
    -replace '__SITE_HOST__', $SITE_HOST `
    -replace '__VM_IP__',   $VM_IP `
    -replace '__APP_DIR__', $APP_DIR `
    -replace '__APP_PORT__', $APP_PORT

Invoke-RemoteBash -Label "setup-nginx" -Script $s10
Write-OK "nginx configurado: SPA + proxy /api"

# ── PASO 11: Emitir certificado SSL ──────────────────────────
Write-Step "PASO 11/12  Solicitando certificado SSL con Certbot"

$s11Cert = (@'
#!/bin/bash
set -euo pipefail
SITE_HOST="__SITE_HOST__"
CERTBOT_EMAIL="__CERTBOT_EMAIL__"

echo "--- Solicitando certificado SSL ---"
if sudo certbot --nginx -d "${SITE_HOST}" --non-interactive --agree-tos -m "${CERTBOT_EMAIL}" --redirect; then
    echo "=== Certbot OK ==="
    sudo nginx -t
    sudo systemctl reload nginx
else
    echo "[!] Certbot fallo. Verifica que el DNS apunte a la VM y que el puerto 80 sea accesible."
    exit 0
fi
'@) `
    -replace '__SITE_HOST__', $SITE_HOST `
    -replace '__CERTBOT_EMAIL__', $CertbotEmail

Invoke-RemoteBash -Label "certbot" -Script $s11Cert
Write-OK "Certificado SSL solicitado"

# ── PASO 12: Iniciar backend con PM2 + tsx ────────────────────
Write-Step "PASO 12/12  Iniciando backend con PM2"

# tsx resuelve los path-aliases TypeScript (@config/*, @utils/*, etc.)
# sin necesidad de compilar con tsc (evita problemas de aliases en node)
$s11 = (@'
#!/bin/bash
set -euo pipefail
APP_DIR="__APP_DIR__"

echo "--- Creando ecosystem.config.cjs ---"
cat > "${APP_DIR}/ecosystem.config.cjs" <<'PM2_CONF'
module.exports = {
  apps: [{
    name: 'medisdiana-backend',
    script: 'node_modules/.bin/tsx',
    args: 'src/index.ts',
    cwd: '__APP_DIR__/apps/backend',
    interpreter: 'none',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: { NODE_ENV: 'production' },
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
}
PM2_CONF

echo "--- Reiniciando servicio ---"
pm2 stop medisdiana-backend   2>/dev/null || true
pm2 delete medisdiana-backend 2>/dev/null || true

cd "${APP_DIR}"
pm2 start ecosystem.config.cjs
pm2 save

echo "--- Configurando arranque automatico ---"
sudo env PATH=$PATH:/usr/bin $(which pm2) startup systemd -u $USER \
    --hp /home/$USER 2>/dev/null || true
pm2 save

echo ""
echo "=== Backend corriendo ==="
pm2 status
'@) `
    -replace '__APP_DIR__', $APP_DIR

# El cwd dentro del PM2_CONF heredoc tambien necesita el valor real
$s11 = $s11 -replace "'__APP_DIR__/apps/backend'", "'${APP_DIR}/apps/backend'"

Invoke-RemoteBash -Label "start-backend" -Script $s11
Write-OK "Backend iniciado con PM2 + tsx"

# ── VERIFICACION ──────────────────────────────────────────────
Write-Step "VERIFICACION FINAL"
Start-Sleep -Seconds 6

Invoke-RemoteBash -Label "verify" -Script (@'
#!/bin/bash
echo "=== Servicios ==="
echo -n "nginx:      "; sudo systemctl is-active nginx
echo -n "postgresql: "; sudo systemctl is-active postgresql
echo ""
echo "=== PM2 ==="
pm2 status
echo ""
echo "=== Test API health ==="
sleep 2
HTTP_API=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:__APP_PORT__/health 2>/dev/null || echo "000")
echo "Backend /health: HTTP $HTTP_API"
echo ""
echo "=== Test nginx ==="
HTTP_WEB=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:__WEB_PORT__ 2>/dev/null || echo "000")
echo "nginx  puerto __WEB_PORT__: HTTP $HTTP_WEB"
echo ""
echo "=== Ultimos logs backend ==="
pm2 logs medisdiana-backend --lines 10 --nostream 2>/dev/null || true
'@ -replace '__APP_PORT__', $APP_PORT -replace '__WEB_PORT__', $WEB_PORT)

# ── RESUMEN ───────────────────────────────────────────────────
Write-Host ""
Write-Host ("=" * 62) -ForegroundColor Green
Write-Host "  DESPLIEGUE COMPLETADO" -ForegroundColor Green
Write-Host ("=" * 62) -ForegroundColor Green
Write-Host ""
Write-Host "  App:         https://$SITE_HOST" -ForegroundColor White
Write-Host "  API:         https://$SITE_HOST/api" -ForegroundColor White
Write-Host "  Health:      https://$SITE_HOST/health" -ForegroundColor White
Write-Host ""
Write-Host "  Base de datos" -ForegroundColor Yellow
Write-Host "    Nombre:    $DB_NAME" -ForegroundColor Gray
Write-Host "    Usuario:   $DB_USER" -ForegroundColor Gray
Write-Host "    Password:  $DbPassword" -ForegroundColor Gray
Write-Host ""
Write-Host "  Comandos utiles en la VM:" -ForegroundColor Yellow
Write-Host "    pm2 status" -ForegroundColor Gray
Write-Host "    pm2 logs medisdiana-backend" -ForegroundColor Gray
Write-Host "    pm2 restart medisdiana-backend" -ForegroundColor Gray
Write-Host "    sudo systemctl status nginx" -ForegroundColor Gray
Write-Host ("=" * 62) -ForegroundColor Green
