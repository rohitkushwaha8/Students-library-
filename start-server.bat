@echo off
:: ═══════════════════════════════════════════════════════════
::   A.R. Library — Auto Startup Script
::   Server start karega + App browser mein khol dega
:: ═══════════════════════════════════════════════════════════

title A.R. Library Server

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║       A.R. Library Server                ║
echo  ║       Starting up...                     ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Auto detect — jahan ye .bat file hai wahi server folder hai
set SERVER_PATH=%~dp0
cd /d "%SERVER_PATH%"

:: PM2 check karo
where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo  [!] PM2 nahi mila. Install ho raha hai...
    npm install -g pm2 >nul 2>&1
    npm install -g pm2-windows-startup >nul 2>&1
    echo  ✅ PM2 install ho gaya!
)

:: Server pehle se chal raha hai to restart, nahi to fresh start
echo  [1/3] Server start ho raha hai...
pm2 describe ar-library >nul 2>&1
if %errorlevel% equ 0 (
    pm2 restart ar-library >nul 2>&1
    echo  ✅ Server restart hua!
) else (
    pm2 start server.js --name "ar-library" >nul 2>&1
    echo  ✅ Server chalu hua!
)

:: Server ready hone ka thoda wait
echo  [2/3] Server ready ho raha hai...
timeout /t 4 /nobreak >nul

:: Browser mein app open karo
echo  [3/3] App browser mein khul raha hai...
start "" "http://localhost:5000"

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║  ✅ A.R. Library chalu hai!              ║
echo  ║  🌐 http://localhost:5000                ║
echo  ║                                          ║
echo  ║  Ye window band kar sakte ho —           ║
echo  ║  server background mein chalta rahega!   ║
echo  ╚══════════════════════════════════════════╝
echo.

timeout /t 5 /nobreak >nul
exit
