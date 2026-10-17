@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>&1
if %errorlevel%==0 (
  py -3 launcher.py
) else (
  where python >nul 2>&1
  if %errorlevel%==0 (
    python launcher.py
  ) else (
    echo Python nao encontrado. Instale em https://www.python.org/downloads/
    echo Marque a opcao Add Python to PATH durante a instalacao.
    pause
  )
)
