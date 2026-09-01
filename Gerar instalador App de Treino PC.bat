@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Gerar Instalador App de Treino PC

echo Compilando interface...
pushd frontend
call npm install --no-audit --no-fund
if errorlevel 1 goto erro
call npm run build
if errorlevel 1 goto erro
popd

echo Instalando dependencias do desktop...
pushd desktop-app
call npm install --no-audit --no-fund
if errorlevel 1 goto erro
call npm run dist
if errorlevel 1 goto erro
popd

echo.
echo Instalador gerado em desktop-app\dist
echo.
pause
exit /b 0

:erro
popd
echo Falha ao gerar o instalador.
pause
exit /b 1
