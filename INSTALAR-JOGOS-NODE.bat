@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1 || (echo Instale Node.js LTS: https://nodejs.org/ & pause & exit /b 1)
for %%G in (pipa-live chat-war-live corrida-chat-live) do (
  echo Instalando %%G...
  pushd "games\%%G"
  call npm install --no-audit --no-fund
  if errorlevel 1 (popd & echo Falha ao instalar %%G & pause & exit /b 1)
  popd
)
echo Jogos Node instalados.
pause
