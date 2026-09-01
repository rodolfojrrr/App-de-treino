const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = 3035;

function now() { return new Date().toISOString(); }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function atomicJson(file, data) { const tmp = `${file}.tmp`; fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8'); if (fs.existsSync(file)) fs.rmSync(file, { force: true }); fs.renameSync(tmp, file); }
function readJson(file, fallback = null) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }
function syncCode() { return String(crypto.randomInt(100000, 999999)); }
function localIps() { const out = []; for (const list of Object.values(os.networkInterfaces())) for (const info of list || []) if (info.family === 'IPv4' && !info.internal) out.push(info.address); return [...new Set(out)]; }
function isLocal(req) { const ip = req.socket.remoteAddress || ''; return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip); }
function sendJson(res, status, data) { const body = JSON.stringify(data); res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Sync-Code', 'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS' }); res.end(body); }
function contentType(file) { const ext = path.extname(file).toLowerCase(); return ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json; charset=utf-8' })[ext] || 'application/octet-stream'; }
function readBody(req, limit = 220 * 1024 * 1024) { return new Promise((resolve, reject) => { const parts = []; let size = 0; req.on('data', (chunk) => { size += chunk.length; if (size > limit) { reject(new Error('Arquivo muito grande.')); req.destroy(); return; } parts.push(chunk); }); req.on('end', () => { try { const text = Buffer.concat(parts).toString('utf8'); resolve(text ? JSON.parse(text) : {}); } catch { reject(new Error('JSON inválido.')); } }); req.on('error', reject); }); }
function safeId(value) { return String(value || '').replace(/[^a-zA-Z0-9_-]/g, ''); }
function decodeDataUrl(dataUrl) { const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/s); if (!match) throw new Error('Imagem inválida.'); return { mime: match[1], buffer: Buffer.from(match[2], 'base64') }; }
function encodeDataUrl(buffer, mime) { return `data:${mime || 'application/octet-stream'};base64,${buffer.toString('base64')}`; }

function startServer({ dataDir, frontendDir, port = PORT }) {
  ensureDir(dataDir);
  const backupsDir = path.join(dataDir, 'backups');
  const mediaDir = path.join(dataDir, 'media');
  ensureDir(backupsDir); ensureDir(mediaDir);
  const stateFile = path.join(dataDir, 'training-state.json');
  const mediaIndexFile = path.join(dataDir, 'media-index.json');
  const syncFile = path.join(dataDir, 'sync.json');
  if (!fs.existsSync(stateFile)) atomicJson(stateFile, null);
  if (!fs.existsSync(mediaIndexFile)) atomicJson(mediaIndexFile, {});
  let sync = readJson(syncFile, null);
  if (!sync?.code) { sync = { code: syncCode(), updatedAt: now() }; atomicJson(syncFile, sync); }

  const loadState = () => readJson(stateFile, null);
  const saveState = (state, force = false) => { const current = loadState(); if (!force && current && Number(current.revision || 0) > Number(state?.revision || 0)) return current; atomicJson(stateFile, state); return state; };
  const loadMediaIndex = () => readJson(mediaIndexFile, {}) || {};
  const saveMediaIndex = (index) => atomicJson(mediaIndexFile, index);
  const authorized = (req) => String(req.headers['x-sync-code'] || '') === String(sync.code);

  function buildBackup() {
    const index = loadMediaIndex();
    const media = [];
    for (const item of Object.values(index)) {
      const file = path.join(mediaDir, item.fileName);
      if (!fs.existsSync(file)) continue;
      media.push({ id: item.id, name: item.name, mime: item.mime, kind: item.kind, ownerId: item.ownerId, createdAt: item.createdAt, dataUrl: encodeDataUrl(fs.readFileSync(file), item.mime) });
    }
    return { format: 'treino-premium-backup', version: 1, exportedAt: now(), core: loadState(), media };
  }

  function safetyBackup(reason) {
    try { atomicJson(path.join(backupsDir, `${now().replace(/[:.]/g, '-')}-${reason}.treino`), buildBackup()); } catch (error) { console.warn('Falha ao criar backup de segurança:', error.message); }
  }

  function restoreBackup(backup) {
    const format = backup?.format || backup?.formato;
    if (!['treino-premium-backup', 'app-treinos-backup'].includes(format)) throw new Error('Backup inválido.');
    safetyBackup('antes-restauracao');
    saveState(backup.core || backup.dados || null, true);
    if (format === 'treino-premium-backup') {
      fs.rmSync(mediaDir, { recursive: true, force: true }); ensureDir(mediaDir);
      const index = {};
      for (const item of backup.media || []) {
        const decoded = decodeDataUrl(item.dataUrl);
        const id = safeId(item.id) || crypto.randomUUID();
        const ext = (item.mime || decoded.mime).split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
        const fileName = `${id}.${ext}`;
        fs.writeFileSync(path.join(mediaDir, fileName), decoded.buffer);
        index[id] = { id, fileName, name: item.name || fileName, mime: item.mime || decoded.mime, kind: item.kind || 'generic', ownerId: item.ownerId || '', createdAt: item.createdAt || now() };
      }
      saveMediaIndex(index);
    }
  }

  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Sync-Code', 'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS' }); return res.end(); }
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      if (url.pathname === '/status') return sendJson(res, 200, { ok: true, app: 'Treino Premium PC', version: '1.0.0' });

      if (url.pathname === '/api/state' && req.method === 'GET') { if (!isLocal(req)) return sendJson(res, 403, { erro: 'Acesso local necessário.' }); return sendJson(res, 200, loadState()); }
      if (url.pathname === '/api/state' && req.method === 'PUT') { if (!isLocal(req)) return sendJson(res, 403, { erro: 'Acesso local necessário.' }); return sendJson(res, 200, saveState(await readBody(req))); }

      if (url.pathname === '/api/media' && req.method === 'POST') {
        if (!isLocal(req)) return sendJson(res, 403, { erro: 'Acesso local necessário.' });
        const body = await readBody(req, 35 * 1024 * 1024);
        const decoded = decodeDataUrl(body.dataUrl);
        if (decoded.buffer.length > 20 * 1024 * 1024) return sendJson(res, 413, { erro: 'Imagem muito grande. Use até 20 MB.' });
        const id = safeId(body.id) || crypto.randomUUID();
        const ext = decoded.mime.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
        const fileName = `${id}.${ext}`;
        fs.writeFileSync(path.join(mediaDir, fileName), decoded.buffer);
        const index = loadMediaIndex();
        index[id] = { id, fileName, name: body.name || fileName, mime: decoded.mime, kind: body.kind || 'generic', ownerId: body.ownerId || '', createdAt: now() };
        saveMediaIndex(index);
        return sendJson(res, 200, { id });
      }

      const mediaMatch = url.pathname.match(/^\/api\/media\/([a-zA-Z0-9_-]+)$/);
      if (mediaMatch && req.method === 'GET') {
        const id = safeId(mediaMatch[1]); const item = loadMediaIndex()[id]; if (!item) return sendJson(res, 404, { erro: 'Imagem não encontrada.' });
        const file = path.join(mediaDir, item.fileName); if (!fs.existsSync(file)) return sendJson(res, 404, { erro: 'Arquivo não encontrado.' });
        const body = fs.readFileSync(file); res.writeHead(200, { 'Content-Type': item.mime, 'Content-Length': body.length, 'Cache-Control': 'private, max-age=3600', 'Access-Control-Allow-Origin': '*' }); return res.end(body);
      }
      if (mediaMatch && req.method === 'DELETE') {
        if (!isLocal(req)) return sendJson(res, 403, { erro: 'Acesso local necessário.' });
        const id = safeId(mediaMatch[1]); const index = loadMediaIndex(); const item = index[id]; if (item) fs.rmSync(path.join(mediaDir, item.fileName), { force: true }); delete index[id]; saveMediaIndex(index); return sendJson(res, 200, { ok: true });
      }

      if (url.pathname === '/api/backup' && req.method === 'GET') { if (!isLocal(req) && !authorized(req)) return sendJson(res, 401, { erro: 'Código de conexão inválido.' }); return sendJson(res, 200, buildBackup()); }
      if (url.pathname === '/api/import' && req.method === 'POST') { if (!isLocal(req)) return sendJson(res, 403, { erro: 'Acesso local necessário.' }); restoreBackup(await readBody(req)); return sendJson(res, 200, { ok: true }); }
      if (url.pathname === '/api/sync/import' && req.method === 'POST') {
        if (!authorized(req)) return sendJson(res, 401, { erro: 'Código de conexão inválido.' });
        const incoming = await readBody(req);
        const localState = loadState();
        if (incoming?.core && localState?.user) {
          incoming.core.user = localState.user;
          incoming.core.settings = { ...(incoming.core.settings || {}), rememberLogin: localState.settings?.rememberLogin ?? true };
        }
        restoreBackup(incoming);
        return sendJson(res, 200, { ok: true });
      }
      if (url.pathname === '/api/sync/info' && req.method === 'GET') { if (!isLocal(req)) return sendJson(res, 403, { erro: 'Acesso local necessário.' }); return sendJson(res, 200, { ips: localIps(), port, codigo: sync.code }); }
      if (url.pathname === '/api/sync/code' && req.method === 'POST') { if (!isLocal(req)) return sendJson(res, 403, { erro: 'Acesso local necessário.' }); sync = { code: syncCode(), updatedAt: now() }; atomicJson(syncFile, sync); return sendJson(res, 200, { codigo: sync.code }); }
      if (url.pathname === '/api/sync/ping' && req.method === 'GET') { if (!authorized(req)) return sendJson(res, 401, { erro: 'Código de conexão inválido.' }); return sendJson(res, 200, { ok: true, computer: os.hostname(), version: '1.0.0' }); }

      let relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^\/+/, '');
      const root = path.resolve(frontendDir); let file = path.resolve(frontendDir, relative);
      if (!file.startsWith(root)) return sendJson(res, 403, { erro: 'Caminho inválido.' });
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
      if (!fs.existsSync(file)) return sendJson(res, 503, { erro: 'Interface do PC não foi compilada.' });
      const body = fs.readFileSync(file); res.writeHead(200, { 'Content-Type': contentType(file), 'Content-Length': body.length, 'Cache-Control': file.endsWith('index.html') ? 'no-store' : 'public, max-age=3600' }); return res.end(body);
    } catch (error) { console.error(error); if (!res.headersSent) sendJson(res, 500, { erro: error.message || 'Erro interno.' }); else res.end(); }
  });

  return new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '0.0.0.0', () => resolve({ server, port, ips: localIps() })); });
}

module.exports = { startServer, iniciarServidor: startServer, PORT };
