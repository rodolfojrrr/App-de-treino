const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('treinoDesktop', Object.freeze({ platform: 'windows' }));
