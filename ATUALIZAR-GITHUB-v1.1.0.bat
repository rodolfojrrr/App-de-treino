@echo off
chcp 65001 >nul
setlocal
title Treino Premium v1.1.0 - Atualizar GitHub
cd /d "%~dp0"

echo.
echo ========================================================
echo       TREINO PREMIUM v1.1.0 - ATUALIZACAO
echo ========================================================
echo.
echo Esta versao corrige a execucao do treino no celular,
echo finalizacao e adiciona ajustes pontuais da programacao.
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo ERRO: Git nao encontrado neste computador.
  pause
  exit /b 1
)

if not exist ".git" (
  echo [1/4] Preparando esta pasta como repositorio...
  git init
  if errorlevel 1 goto :erro
  git branch -M main
  git remote add origin https://github.com/rodolfojrrr/App-de-treino.git
  git fetch origin main
) else (
  echo [1/4] Repositorio Git encontrado.
)

git branch -M main
git remote get-url origin >nul 2>nul
if errorlevel 1 git remote add origin https://github.com/rodolfojrrr/App-de-treino.git

echo [2/4] Adicionando arquivos da v1.1.0...
git add -A

echo [3/4] Criando commit...
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "fix: v1.1.0 execucao, finalizacao e ajuste de treino"
  if errorlevel 1 goto :erro
) else (
  echo Nenhuma alteracao nova para commit.
)

echo [4/4] Enviando para o GitHub...
git push -u origin main
if errorlevel 1 (
  echo.
  echo O push normal nao foi aceito. Atualizando referencia remota...
  git fetch origin main
  git push --force-with-lease -u origin main
)

if errorlevel 1 goto :erro

echo.
echo ========================================================
echo SUCESSO!
echo Agora abra GitHub ^> Actions e gere a v1.1.0.
echo Android: Treino-Premium-APK-1.1.0
echo Windows: Treino-Premium-Windows-1.1.0
echo ========================================================
echo.
pause
exit /b 0

:erro
echo.
echo ========================================================
echo O envio nao foi concluido.
echo Tire um print desta janela e mande no chat.
echo ========================================================
echo.
pause
exit /b 1
