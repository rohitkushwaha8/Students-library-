@echo off
:: ═══════════════════════════════════════════════════════════════
::   A.R. Library — EK BAAR CHALAO (First Time Setup)
::   Ye script sab kuch install aur configure kar dega
:: ═══════════════════════════════════════════════════════════════

title A.R. Library — First Time Setup

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║   A.R. Library — First Time Setup            ║
echo  ║   Ek baar chalao — sab set ho jayega!        ║
echo  ╚══════════════════════════════════════════════╝
echo.

:: ── Step 1: Node check ────────────────────────────────────────
echo  [1/5] Node.js check kar raha hoon...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ❌ Node.js nahi mila!
    echo  👉 Yahan se install karo: https://nodejs.org
    echo  Phir ye script dobara chalao.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo  ✅ Node.js mila: %NODE_VER%

:: ── Step 2: PM2 install ───────────────────────────────────────
echo.
echo  [2/5] PM2 install kar raha hoon...
npm install -g pm2 >nul 2>&1
npm install -g pm2-windows-startup >nul 2>&1
echo  ✅ PM2 ready

:: ── Step 3: npm install ───────────────────────────────────────
echo.
echo  [3/5] App dependencies install ho rahi hain...
npm install
if %errorlevel% neq 0 (
    echo  ❌ npm install fail hua. Check karo internet connection.
    pause
    exit /b 1
)
echo  ✅ Dependencies ready

:: ── Step 4: Database setup ────────────────────────────────────
echo.
echo  [4/5] MySQL database setup ho raha hai...
echo  (Pehle .env file mein apna MySQL password daalo!)
echo.
set /p CONFIRM="Kya .env file edit kar li? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo.
    echo  👉 .env file kholo aur DB_PASSWORD mein apna MySQL password daalo
    echo  Phir ye script dobara chalao.
    pause
    exit /b 1
)
node config/setupDb.js
if %errorlevel% neq 0 (
    echo.
    echo  ❌ Database setup fail hua!
    echo  Check karo: MySQL chalu hai? .env mein password sahi hai?
    pause
    exit /b 1
)
echo  ✅ Database ready

:: ── Step 5: PM2 startup register ─────────────────────────────
echo.
echo  [5/5] PC startup pe auto-start set kar raha hoon...
pm2 start server.js --name "ar-library"
pm2-startup install
pm2 save
echo  ✅ Startup registered — ab PC restart pe bhi server chalu rahega!

:: ── Done ──────────────────────────────────────────────────────
echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║   🎉 SETUP COMPLETE!                          ║
echo  ║                                               ║
echo  ║   App: http://localhost:5000                  ║
echo  ║   Server: PM2 se manage ho raha hai           ║
echo  ║                                               ║
echo  ║   Useful commands:                            ║
echo  ║     pm2 status        → server ki status      ║
echo  ║     pm2 logs          → server logs dekho     ║
echo  ║     pm2 restart all   → restart karo          ║
echo  ║     pm2 stop all      → band karo             ║
echo  ╚══════════════════════════════════════════════╝
echo.

timeout /t 3 /nobreak >nul
start http://localhost:5000

pause
