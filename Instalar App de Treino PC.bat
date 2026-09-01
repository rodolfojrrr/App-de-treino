@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Instalar App de Treino PC

echo ============================================
echo       APP DE TREINO - INSTALACAO PC
echo ============================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js nao foi encontrado.
  echo Instale o Node.js LTS e execute novamente.
  pause
  exit /b 1
)

echo [1/3] Instalando interface do computador...
pushd frontend
call npm install --no-audit --no-fund
if errorlevel 1 goto erro
call npm run build
if errorlevel 1 goto erro
popd

echo [2/3] Instalando Electron...
pushd desktop-app
call npm install --no-audit --no-fund
if errorlevel 1 goto erro
popd

echo [3/3] Pronto.
echo.
echo Agora execute: Iniciar App de Treino PC.bat
echo Para Wi-Fi, execute tambem como administrador:
echo Liberar sincronizacao no Firewall.bat
echo.
pause
exit /b 0

:erro
popd
echo.
echo Ocorreu um erro durante a instalacao.
pause
exit /b 1
