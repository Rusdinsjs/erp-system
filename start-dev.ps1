$ErrorActionPreference = "Stop"

# Warna output
function Write-Green ($text) { Write-Host $text -ForegroundColor Green }
function Write-Blue ($text) { Write-Host $text -ForegroundColor Cyan }

Write-Blue ">>> Memulai Asset Management System..."

# 1. Pastikan Docker Containers (DB & Redis) berjalan
Write-Green "1. Menjalankan Docker Service (DB & Redis)..."

$dockerCmd = "docker"
if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
    if (Get-Command "podman" -ErrorAction SilentlyContinue) {
        $dockerCmd = "podman"
        Write-Host "Docker not found. Using Podman..." -ForegroundColor Cyan
    }
    elseif (Test-Path "C:\Program Files\RedHat\Podman\podman.exe") {
        $dockerCmd = "& 'C:\Program Files\RedHat\Podman\podman.exe'"
        Write-Host "Docker not found. Using Podman (full path)..." -ForegroundColor Cyan
    }
    elseif (Get-Command "wsl" -ErrorAction SilentlyContinue) {
        $dockerCmd = "wsl -d archlinux docker"
        Write-Host "Docker command not found. Using wsl docker..." -ForegroundColor Yellow
    }
    else {
        Write-Error "Container engine (Docker/Podman) tidak ditemukan. Harap install Docker atau Podman."
    }
}

Write-Green "1. Menjalankan Service (DB & Redis) menggunakan $dockerCmd..."
Invoke-Expression "$dockerCmd compose up -d postgres redis"

Write-Green "2. Menunggu Database Siap..."
Start-Sleep -Seconds 3

# 2a. Jalankan Migrasi Database
Write-Green "2a. Menjalankan Migrasi Database..."
try {
    # Check if sqlx is installed
    if (Get-Command "sqlx" -ErrorAction SilentlyContinue) {
        sqlx migrate run
        Write-Green "Migrasi Database Selesai."
    }
    else {
        Write-Host "⚠️ sqlx CLI tidak ditemukan. Melewati migrasi." -ForegroundColor Yellow
        Write-Host "   Install dengan: cargo install sqlx-cli --no-default-features --features rustls,postgres" -ForegroundColor Gray
    }
}
catch {
    Write-Host "⚠️ Gagal menjalankan migrasi: $_" -ForegroundColor Red
    # We continue even if migration fails, though backend might error out
}


# 2. Jalankan Backend (Cargo) di background
Write-Green "3. Menjalankan Backend (Rust)..."
$backendProcess = Start-Process -FilePath "cargo" -ArgumentList "run" -RedirectStandardOutput "backend.out.log" -RedirectStandardError "backend.err.log" -PassThru -NoNewWindow
Write-Host "Backend running with PID: $($backendProcess.Id)"

# 3. Jalankan Frontend (Bun/Npm) di background
Write-Green "4. Menjalankan Frontend Web Admin..."
Push-Location "web-admin"

$frontendProcess = $null
if (Get-Command "bun" -ErrorAction SilentlyContinue) {
    Write-Host "Using Bun..."
    $frontendProcess = Start-Process -FilePath "bun" -ArgumentList "dev" -RedirectStandardOutput "frontend.out.log" -RedirectStandardError "frontend.err.log" -PassThru -NoNewWindow
}
else {
    Write-Host "Bun not found, using NPM..."
    # npm is usually a cmd file on Windows
    $npmCmd = Get-Command "npm" -CommandType Application, Cmdlet, ExternalScript | Select-Object -First 1
    if ($npmCmd) {
        # Wrap in cmd /c to ensure it executes properly as a background process
        $frontendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -RedirectStandardOutput "frontend.out.log" -RedirectStandardError "frontend.err.log" -PassThru -NoNewWindow
    }
    else {
        Write-Error "Neither Bun nor NPM found!"
    }
}

Write-Host "Frontend running with PID: $($frontendProcess.Id)"
Pop-Location

Write-Blue ">>> SEMUA SERVICE BERJALAN! 🚀"
Write-Host "Backend Logs: Get-Content -Wait backend.out.log (or backend.err.log)"
Write-Host "Frontend Logs: Get-Content -Wait web-admin/frontend.out.log (or frontend.err.log)"
Write-Blue "Tekan CTRL+C untuk menghentikan semua service."

try {
    while ($true) {
        Start-Sleep -Seconds 1
        
        if ($backendProcess.HasExited) {
            Write-Host "⚠️ Backend process exited unexpectedly!" -ForegroundColor Red
            break
        }
    }
}
finally {
    Write-Blue "`n>>> Mematikan Service..."
    
    if ($backendProcess -and -not $backendProcess.HasExited) {
        Write-Host "  Stopping Backend (PID: $($backendProcess.Id))..."
        # Use taskkill to ensure the whole tree (cargo + app) is killed
        taskkill /F /T /PID $backendProcess.Id | Out-Null
    }
    
    if ($frontendProcess -and -not $frontendProcess.HasExited) {
        Write-Host "  Stopping Frontend (PID: $($frontendProcess.Id))..."
        # Use taskkill to ensure the whole tree (cmd + node/bun) is killed
        taskkill /F /T /PID $frontendProcess.Id | Out-Null
    }

    Write-Host "  Stopping Containers..."
    Invoke-Expression "$dockerCmd compose stop"
    Write-Green ">>> Selesai. Sampai jumpa! 👋"
}
