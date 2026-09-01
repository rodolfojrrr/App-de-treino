const DB_NAME = 'treino-premium-stable';
const DB_VERSION = 1;
const CORE_STORE = 'core';
const MEDIA_STORE = 'media';
const CORE_KEY = 'main';
const LEGACY_DB_NAME = 'rodolfo-training';
const LEGACY_STORE = 'app';
const LEGACY_KEY = 'state';

function randomId(prefix = 'media') {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
}

function withTimeout(promise, ms, fallback = null) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CORE_STORE)) db.createObjectStore(CORE_STORE, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(MEDIA_STORE)) db.createObjectStore(MEDIA_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Falha ao abrir o banco local.'));
    request.onblocked = () => reject(new Error('O banco local está temporariamente bloqueado.'));
  });
}

async function getRecord(storeName, key) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Falha ao ler dados locais.'));
    });
  } finally {
    db.close();
  }
}

async function putRecord(storeName, value) {
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Falha ao salvar dados locais.'));
      tx.onabort = () => reject(tx.error || new Error('Gravação local cancelada.'));
    });
  } finally {
    db.close();
  }
}

async function clearStores() {
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction([CORE_STORE, MEDIA_STORE], 'readwrite');
      tx.objectStore(CORE_STORE).clear();
      tx.objectStore(MEDIA_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Falha ao limpar dados locais.'));
      tx.onabort = () => reject(tx.error || new Error('Limpeza local cancelada.'));
    });
  } finally {
    db.close();
  }
}

async function listMedia() {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(MEDIA_STORE, 'readonly');
      const request = tx.objectStore(MEDIA_STORE).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error || new Error('Falha ao ler mídias.'));
    });
  } finally {
    db.close();
  }
}

async function deleteMediaRecord(id) {
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(MEDIA_STORE, 'readwrite');
      tx.objectStore(MEDIA_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Falha ao excluir mídia.'));
    });
  } finally {
    db.close();
  }
}

async function readLegacyStateRaw() {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    try {
      const request = indexedDB.open(LEGACY_DB_NAME);
      let createdNow = false;

      request.onupgradeneeded = () => {
        createdNow = true;
      };

      request.onerror = () => finish(null);
      request.onblocked = () => finish(null);
      request.onsuccess = () => {
        const db = request.result;
        try {
          if (createdNow || !db.objectStoreNames.contains(LEGACY_STORE)) {
            db.close();
            if (createdNow) indexedDB.deleteDatabase(LEGACY_DB_NAME);
            finish(null);
            return;
          }
          const tx = db.transaction(LEGACY_STORE, 'readonly');
          const get = tx.objectStore(LEGACY_STORE).get(LEGACY_KEY);
          get.onsuccess = () => {
            const value = get.result || null;
            db.close();
            finish(value);
          };
          get.onerror = () => {
            db.close();
            finish(null);
          };
        } catch {
          db.close();
          finish(null);
        }
      };
    } catch {
      finish(null);
    }
  });
}

async function readLegacyState() {
  return withTimeout(readLegacyStateRaw(), 1800, null);
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl) {
  const [head, data] = String(dataUrl || '').split(',');
  if (!head || !data) throw new Error('Imagem inválida.');
  const mime = head.match(/data:(.*?);base64/)?.[1] || 'application/octet-stream';
  const bytes = atob(data);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) array[i] = bytes.charCodeAt(i);
  return new Blob([array], { type: mime });
}

function normalizeHost(value) {
  let host = String(value || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  if (!host) throw new Error('Informe o endereço do computador.');
  if (!/:\d+$/.test(host)) host += ':3035';
  return `http://${host}`;
}

async function syncRequest(host, code, path, options = {}) {
  const response = await fetch(`${normalizeHost(host)}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Sync-Code': String(code || '').trim(),
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.erro || `Falha na conexão (${response.status}).`);
  return body;
}

async function migrateLegacyPhotos(legacy) {
  if (!legacy?.treinos) return legacy;
  for (const treino of legacy.treinos) {
    for (const exercicio of treino.exercicios || []) {
      const mediaIds = Array.isArray(exercicio.mediaIds) ? [...exercicio.mediaIds] : [];
      for (const foto of exercicio.fotos || []) {
        if (typeof foto !== 'string' || !foto.startsWith('data:')) continue;
        try {
          const id = randomId();
          const blob = dataUrlToBlob(foto);
          await putRecord(MEDIA_STORE, {
            id,
            blob,
            name: `${id}.jpg`,
            mime: blob.type || 'image/jpeg',
            size: blob.size || 0,
            kind: 'exercise',
            ownerId: exercicio.id || '',
            createdAt: new Date().toISOString()
          });
          mediaIds.push(id);
        } catch {}
      }
      exercicio.mediaIds = mediaIds;
    }
  }
  return legacy;
}

export const mobileRepository = {
  async loadCore() {
    const record = await withTimeout(getRecord(CORE_STORE, CORE_KEY), 2500, null);
    if (record?.data) return record.data;

    const legacy = await readLegacyState();
    if (legacy) {
      await migrateLegacyPhotos(legacy);
      return legacy;
    }
    return null;
  },

  async saveCore(core) {
    const current = await withTimeout(getRecord(CORE_STORE, CORE_KEY), 1800, null);
    if (current?.data && Number(current.data.revision || 0) > Number(core?.revision || 0)) return current.data;
    await withTimeout(
      putRecord(CORE_STORE, { key: CORE_KEY, data: core, savedAt: new Date().toISOString() }),
      2500,
      null
    );
    return core;
  },

  async addMedia(file, meta = {}) {
    if (!file) throw new Error('Selecione uma imagem.');
    if (file.size > 20 * 1024 * 1024) throw new Error('A imagem é muito grande. Use até 20 MB por arquivo.');
    const id = randomId();
    await putRecord(MEDIA_STORE, {
      id,
      blob: file,
      name: file.name || `${id}.jpg`,
      mime: file.type || 'image/jpeg',
      size: file.size || 0,
      kind: meta.kind || 'generic',
      ownerId: meta.ownerId || '',
      createdAt: new Date().toISOString()
    });
    return id;
  },

  async getMediaUrl(id) {
    const media = await getRecord(MEDIA_STORE, id);
    if (!media?.blob) return { url: '' };
    const url = URL.createObjectURL(media.blob);
    return { url, revoke: () => URL.revokeObjectURL(url) };
  },

  async deleteMedia(id) {
    await deleteMediaRecord(id);
  },

  async exportBackup() {
    const core = (await getRecord(CORE_STORE, CORE_KEY))?.data || null;
    const records = await listMedia();
    const media = [];
    for (const record of records) {
      media.push({
        id: record.id,
        name: record.name,
        mime: record.mime,
        kind: record.kind,
        ownerId: record.ownerId,
        createdAt: record.createdAt,
        dataUrl: await blobToDataUrl(record.blob)
      });
    }
    return { format: 'treino-premium-backup', version: 1, exportedAt: new Date().toISOString(), core, media };
  },

  async importBackup(backup) {
    if (!backup || !['treino-premium-backup', 'app-treinos-backup'].includes(backup.format || backup.formato)) {
      throw new Error('Este arquivo não é um backup válido do App de Treino.');
    }

    const current = await this.exportBackup().catch(() => null);
    if (current) {
      try {
        localStorage.setItem('treino.lastSafetyBackup', JSON.stringify({ ...current, media: [] }));
      } catch {}
    }

    const core = backup.core || backup.dados;
    await clearStores();
    await putRecord(CORE_STORE, { key: CORE_KEY, data: core, savedAt: new Date().toISOString() });
    for (const item of backup.media || []) {
      await putRecord(MEDIA_STORE, {
        ...item,
        id: item.id || randomId(),
        blob: dataUrlToBlob(item.dataUrl),
        size: 0
      });
    }
  },

  async pullFromDesktop(host, code) {
    const backup = await syncRequest(host, code, '/api/backup');
    const localCore = (await getRecord(CORE_STORE, CORE_KEY))?.data || null;
    if (backup.core && localCore?.user) {
      backup.core.user = localCore.user;
      backup.core.settings = {
        ...(backup.core.settings || {}),
        rememberLogin: localCore.settings?.rememberLogin ?? true
      };
    }
    await this.importBackup(backup);
  },

  async pushToDesktop(host, code) {
    const backup = await this.exportBackup();
    await syncRequest(host, code, '/api/sync/import', { method: 'POST', body: JSON.stringify(backup) });
  }
};
