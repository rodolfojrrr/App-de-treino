const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let server = null;

const lock = app.requestSingleInstanceLock();
if (!lock) app.quit();

function caminhos() {
  const empacotado = app.isPackaged;
  return {
    frontendDir: empacotado ? path.join(process.resourcesPath, 'frontend') : path.resolve(__dirname, '../frontend/dist'),
    backendFile: empacotado ? path.join(process.resourcesPath, 'backend/server.js') : path.resolve(__dirname, '../backend/server.js'),
    dataDir: app.getPath('userData')
  };
}

async function criarJanela() {
  const { frontendDir, backendFile, dataDir } = caminhos();
  if (!fs.existsSync(backendFile)) throw new Error(`Backend não encontrado: ${backendFile}`);
  const { iniciarServidor } = require(backendFile);
  const iniciado = await iniciarServidor({ dataDir, frontendDir, port: 3035 });
  server = iniciado.server;

  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#090B0C',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://127.0.0.1:3035')) event.preventDefault();
  });
  await mainWindow.loadURL('http://127.0.0.1:3035');
}

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.whenReady().then(criarJanela).catch((erro) => {
  console.error(erro);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (server) server.close();
});
