@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Pipa Combat Live

where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERRO] Node.js nao foi encontrado.
    echo Instale a versao LTS em https://nodejs.org/ e execute este arquivo novamente.
    echo.
    pause
    exit /b 1
)

if not exist ".env" (
    echo Primeira execucao detectada. Abrindo configuracao...
    call "%~dp0CONFIGURAR-PIPA-LIVE.bat"
    if errorlevel 1 exit /b 1
)

findstr /b /c:"TIKTOK_USERNAME=seu_usuario" ".env" >nul 2>&1
if not errorlevel 1 (
    echo.
    echo A conta do TikTok ainda nao foi configurada.
    call "%~dp0CONFIGURAR-PIPA-LIVE.bat"
    if errorlevel 1 exit /b 1
)

if not exist "node_modules" (
    echo.
    echo Instalando componentes do jogo. Isso acontece apenas na primeira vez...
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo.
        echo [ERRO] Nao foi possivel instalar os componentes.
        pause
        exit /b 1
    )
)

for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "$port = 3000; try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 ('http://127.0.0.1:' + $port + '/config'); if ($r.StatusCode -eq 200) { 'EM_USO' } } catch {}"`) do set "PORT_STATUS=%%A"
if "%PORT_STATUS%"=="EM_USO" (
    echo.
    echo [ERRO] A porta 3000 ja esta em uso.
    echo Feche a outra instancia do Pipa Combat Live e tente novamente.
    pause
    exit /b 1
)

start "Pipa Combat Live - Jogo" http://localhost:3000

echo.
echo ============================================
echo          PIPA COMBAT LIVE INICIADO
echo ============================================
echo Jogo: http://localhost:3000
echo Painel de saude: http://localhost:3000/health
echo.
echo Mantenha esta janela aberta durante a live.
echo Feche esta janela para encerrar o jogo.
echo.
npm start

if errorlevel 1 (
    echo.
    echo O jogo foi encerrado com erro. Leia a mensagem acima.
    pause
)
endlocal
