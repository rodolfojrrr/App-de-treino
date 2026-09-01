@echo off
chcp 65001 >nul
title App de Treino - Liberar Wi-Fi

net session >nul 2>&1
if errorlevel 1 (
  echo Execute este arquivo como ADMINISTRADOR.
  pause
  exit /b 1
)

netsh advfirewall firewall delete rule name="App de Treino - WiFi" >nul 2>&1
netsh advfirewall firewall add rule name="App de Treino - WiFi" dir=in action=allow protocol=TCP localport=3035 profile=private

echo.
echo Porta 3035 liberada na rede privada para o App de Treino.
echo.
pause
