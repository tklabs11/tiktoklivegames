@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
py -3 -m pip install -r requirements.txt
if errorlevel 1 goto erro
py -3 -m PyInstaller --noconfirm --clean --onedir --windowed --name TikTokLiveGamesLauncher --collect-all TikTokLive --collect-all TikTokLiveProto --collect-all EulerApiSdk --collect-all betterproto2 --collect-all websockets_proxy --hidden-import TikTokLive.events launcher.py
if errorlevel 1 goto erro
xcopy /E /I /Y "games" "dist\TikTokLiveGamesLauncher\games" >nul
if errorlevel 1 goto erro
echo.
echo PRONTO: dist\TikTokLiveGamesLauncher\TikTokLiveGamesLauncher.exe
echo Distribua a pasta inteira, nao apenas o EXE.
pause
exit /b 0
:erro
echo FALHA AO GERAR O EXECUTAVEL. Confira as mensagens acima.
pause
exit /b 1
