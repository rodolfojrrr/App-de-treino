function fileToDataUrl(file) {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); });
}
async function json(url, options = {}) { const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.erro || `Erro ${response.status}`); return body; }

export const desktopRepository = {
  async loadCore() { return json('/api/state'); },
  async saveCore(core) { return json('/api/state', { method: 'PUT', body: JSON.stringify(core) }); },
  async addMedia(file, meta = {}) { if (file.size > 20 * 1024 * 1024) throw new Error('A imagem é muito grande. Use até 20 MB.'); const result = await json('/api/media', { method: 'POST', body: JSON.stringify({ name: file.name, kind: meta.kind, ownerId: meta.ownerId, dataUrl: await fileToDataUrl(file) }) }); return result.id; },
  async getMediaUrl(id) { return { url: `/api/media/${encodeURIComponent(id)}` }; },
  async deleteMedia(id) { return json(`/api/media/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
  async exportBackup() { return json('/api/backup'); },
  async importBackup(backup) { return json('/api/import', { method: 'POST', body: JSON.stringify(backup) }); },
  async getSyncInfo() { return json('/api/sync/info'); }
};
