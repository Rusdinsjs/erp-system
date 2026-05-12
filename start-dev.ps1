$ErrorActionPreference = "Stop"

# Warna output
function Write-Green ($text) { Write-Host $text -ForegroundColor Green }
function Write-Blue ($text) { Write-Host $text -ForegroundColor Cyan }

Write-Blue ">>> Memulai Management System..."

# 1. Pastikan Container Engine (Docker/Podman) berjalan
Write-Green "1. Menjalankan Docker Service (DB & Redis)..."

$dockerCmd = ""
if (Get-Command "docker" -ErrorAction SilentlyContinue) {
    $dockerCmd = "docker"
}
elseif (Get-Command "podman" -ErrorAction SilentlyContinue) {
    $dockerCmd = "podman"
    Write-Host "Docker not found. Using Podman..." -ForegroundColor Cyan
}
elseif (Get-Command "wsl" -ErrorAction SilentlyContinue) {
    # Check if docker or podman is in WSL using a more reliable check
    $hasWslDocker = (wsl -d archlinux sh -c "command -v docker" 2>$null) -ne $null
    $hasWslPodman = (wsl -d archlinux sh -c "command -v podman" 2>$null) -ne $null
    
    if ($hasWslDocker) {
        $dockerCmd = "wsl -d archlinux docker"
        Write-Host "Docker found in WSL. Using wsl docker..." -ForegroundColor Yellow
    }
    elseif ($hasWslPodman) {
        $dockerCmd = "wsl -d archlinux podman"
        Write-Host "Podman found in WSL. Using wsl podman..." -ForegroundColor Yellow
    }
    else {
        Write-Error "Container engine (Docker/Podman) tidak ditemukan di Windows maupun WSL."
        return
    }
}
else {
    Write-Error "Container engine tidak ditemukan. Harap install Docker atau Podman."
    return
}

Write-Green "1. Menjalankan Service (DB & Redis) menggunakan $dockerCmd..."
# Try 'compose' then 'podman-compose' fallback
try {
    Invoke-Expression "$dockerCmd compose up -d postgres redis"
}
catch {
    if ($dockerCmd -like "*podman*") {
        Write-Host "Trying podman-compose..." -ForegroundColor Cyan
        Invoke-Expression "$dockerCmd-compose up -d postgres redis"
    }
    else { 
        Write-Host "⚠️ Gagal menjalankan Docker Compose. Jika menggunakan Podman di WSL, pastikan firewall_driver set ke iptables di ~/.config/containers/containers.conf" -ForegroundColor Yellow
        throw $_ 
    }
}

Write-Green "2. Menunggu Database Siap..."
Start-Sleep -Seconds 3

# 2a. Jalankan Migrasi Database
Write-Green "2a. Menjalankan Migrasi Database..."
try {
    if (Get-Command "sqlx" -ErrorAction SilentlyContinue) {
        sqlx migrate run
        Write-Green "Migrasi Database Selesai."
    }
    elseif (Get-Command "wsl" -ErrorAction SilentlyContinue) {
        $wslSqlxPath = wsl -d archlinux sh -c "command -v sqlx || { [ -f ~/.cargo/bin/sqlx ] && echo ~/.cargo/bin/sqlx; }" 2>$null
        if ($wslSqlxPath) {
            $wslSqlxPath = $wslSqlxPath.Trim()
            Write-Host "sqlx not found in Windows. Using WSL sqlx ($wslSqlxPath)..." -ForegroundColor Yellow
            wsl -d archlinux sh -c "$wslSqlxPath migrate run"
            Write-Green "Migrasi Database Selesai (via WSL)."
        }
        else {
            Write-Host "⚠️ sqlx CLI tidak ditemukan di Windows maupun WSL." -ForegroundColor Yellow
            Write-Host "Tips: Jalankan 'cargo install sqlx-cli --no-default-features --features postgres' di WSL." -ForegroundColor Cyan
        }
    }
    else {
        Write-Host "⚠️ sqlx CLI tidak ditemukan. Melewati migrasi." -ForegroundColor Yellow
    }
}
catch {
    Write-Host "⚠️ Gagal menjalankan migrasi: $_" -ForegroundColor Red
}


# 2. Jalankan Backend (Cargo)
Write-Green "3. Menjalankan Backend (Rust)..."

$cargoPath = ""
$cargoArgs = @()

if (Get-Command "cargo" -ErrorAction SilentlyContinue) {
    $cargoPath = "cargo"
    $cargoArgs = @("run", "--release")
}
elseif (Get-Command "wsl" -ErrorAction SilentlyContinue) {
    $hasWslCargo = (wsl -d archlinux sh -c "command -v cargo" 2>$null) -ne $null
    if ($hasWslCargo) {
        Write-Host "Cargo not found in Windows. Using WSL Cargo..." -ForegroundColor Yellow
        $cargoPath = "wsl"
        $cargoArgs = @("-d", "archlinux", "cargo", "run", "--release")
    }
}

if (-not $cargoPath) {
    Write-Error "Cargo tidak ditemukan di Windows maupun WSL."
    return
}

$backendProcess = Start-Process -FilePath $cargoPath -ArgumentList $cargoArgs -RedirectStandardOutput "backend.out.log" -RedirectStandardError "backend.err.log" -PassThru -NoNewWindow
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
    $npmCmd = Get-Command "npm" -CommandType Application, Cmdlet, ExternalScript | Select-Object -First 1
    if ($npmCmd) {
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
        taskkill /F /T /PID $backendProcess.Id | Out-Null
    }
    
    if ($frontendProcess -and -not $frontendProcess.HasExited) {
        Write-Host "  Stopping Frontend (PID: $($frontendProcess.Id))..."
        taskkill /F /T /PID $frontendProcess.Id | Out-Null
    }

    Write-Host "  Stopping Containers..."
    Invoke-Expression "$dockerCmd compose stop"
    Write-Green ">>> Selesai. Sampai jumpa! 👋"
}
