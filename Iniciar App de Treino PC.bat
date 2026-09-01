@echo off
chcp 65001 >nul
cd /d "%~dp0"
title App de Treino PC

if not exist "frontend\dist\index.html" (
  echo A interface ainda nao foi compilada.
  echo Execute primeiro: Instalar App de Treino PC.bat
  pause
  exit /b 1
)
if not exist "desktop-app\node_modules\electron\dist\electron.exe" (
  echo O Electron ainda nao foi instalado.
  echo Execute primeiro: Instalar App de Treino PC.bat
  pause
  exit /b 1
)

pushd desktop-app
call npm start
popd
