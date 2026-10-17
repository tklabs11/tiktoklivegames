@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Configurar Pipa Combat Live

where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERRO] Node.js nao foi encontrado.
    echo Instale a versao LTS em https://nodejs.org/ e execute este arquivo novamente.
    echo.
    pause
    exit /b 1
)

set "TIKTOK_USERNAME="
echo.
echo ============================================
echo       CONFIGURACAO - PIPA COMBAT LIVE
echo ============================================
echo.
set /p "TIKTOK_USERNAME=Usuario da live no TikTok (sem @): "

if not defined TIKTOK_USERNAME (
    echo.
    echo [ERRO] Informe o usuario da live para continuar.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$user = '%TIKTOK_USERNAME%'.Trim().TrimStart('@'); $usernameLine = 'TIKTOK_USERNAME=' + $user; $lines = @('# Configuracao local do Pipa Combat Live', $usernameLine, 'HOST=0.0.0.0', 'PORT=3000', 'ENABLE_BOTS=1', 'SHOW_PARTICIPATION_PROMPT=1'); [IO.File]::WriteAllLines('.env', $lines, [Text.Encoding]::ASCII)"
if errorlevel 1 (
    echo.
    echo [ERRO] Nao foi possivel salvar o arquivo .env.
    pause
    exit /b 1
)

echo.
echo Configuracao salva para @%TIKTOK_USERNAME%.
echo Agora execute INICIAR-PIPA-LIVE.bat.
echo.
pause
endlocal
