@echo off
:: Self-elevate to Administrator if not already running as Admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Meminta Hak Akses Administrator...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

title Aktifkan Akses LAN - Asset Management System
cls
echo ===================================================================
echo     MENGAKTIFKAN AKSES LAN / WI-FI (ASSET MANAGEMENT SYSTEM)
echo ===================================================================
echo.
echo [1/3] Menambahkan Aturan Windows Firewall (Port 5173, 5174, 8080)...
netsh advfirewall firewall delete rule name="Asset Management System (LAN Access)" >nul 2>&1
netsh advfirewall firewall add rule name="Asset Management System (LAN Access)" dir=in action=allow protocol=TCP localport=5173,5174,8080,8888
if %errorLevel% equ 0 (
    echo       [OK] Windows Firewall Berhasil Diatur!
) else (
    echo       [Gagal] Gagal mengatur Windows Firewall.
)

echo.
echo [2/3] Mengatur PortProxy Cadangan (Netsh)...
for /f "tokens=*" %%i in ('wsl -e bash -c "ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+'"') do set WSL_IP=%%i
if defined WSL_IP (
    netsh interface portproxy delete v4tov4 listenport=5174 >nul 2>&1
    netsh interface portproxy add v4tov4 listenport=5174 listenaddress=0.0.0.0 connectport=5174 connectaddress=%WSL_IP%
    netsh interface portproxy delete v4tov4 listenport=8080 >nul 2>&1
    netsh interface portproxy add v4tov4 listenport=8080 listenaddress=0.0.0.0 connectport=8080 connectaddress=%WSL_IP%
    echo       [OK] PortProxy Berhasil Diarahkan ke IP WSL (%WSL_IP%)!
)

echo.
echo [3/3] Me-restart WSL2 agar Mode Mirrored aktif...
wsl --shutdown
echo       [OK] WSL Berhasil Di-restart!

echo.
echo ===================================================================
echo   BERHASIL! Akses LAN / Wi-Fi telah dibuka 100%%.
echo.
echo   Alamat yang bisa dibuka dari PC / HP Lain:
echo   - Wi-Fi:    http://192.168.118.101:5174
echo   - LAN:      http://192.168.1.7:5174
echo ===================================================================
echo.
echo Silakan jalankan kembali ./start-dev.sh di terminal Anda.
pause
