import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { migrateLegacyCore, normalizeCore, nowIso } from './domain';

const EngineContext = createContext(null);

export function EngineProvider({ repository, nativeBridge, platform = 'mobile', children }) {
  const [core, setCore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const coreRef = useRef(null);
  const writeQueue = useRef(Promise.resolve());

  const persist = useCallback((next) => {
    coreRef.current = next;
    setCore(next);
    writeQueue.current = writeQueue.current
      .catch(() => {})
      .then(() => repository.saveCore(next))
      .catch((err) => {
        console.error(err);
        setError('Não consegui salvar uma alteração. Tente novamente.');
      });
    return next;
  }, [repository]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const bootTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Tempo limite ao abrir o banco local.')), 6500);
      });
      try {
        const raw = await Promise.race([repository.loadCore(), bootTimeout]);
        if (!alive) return;
        const next = migrateLegacyCore(raw);
        coreRef.current = next;
        setCore(next);
        repository.saveCore(next).catch((err) => console.warn('Persistência inicial adiada', err));
      } catch (err) {
        console.error(err);
        if (!alive) return;
        const fallback = migrateLegacyCore(null);
        coreRef.current = fallback;
        setCore(fallback);
        setError('');
        repository.saveCore(fallback).catch(() => {});
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [repository]);

  useEffect(() => {
    if (!core) return;
    document.documentElement.dataset.theme = core.settings.theme || 'dark';
    document.documentElement.style.setProperty('--accent', core.settings.accent || '#C7FF54');
  }, [core?.settings?.theme, core?.settings?.accent]);

  useEffect(() => {
    const flush = () => {
      const current = coreRef.current;
      if (current) repository.saveCore(current).catch(() => {});
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    const onNativeState = () => flush();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', flush);
    window.addEventListener('treino:appstate', onNativeState);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', flush);
      window.removeEventListener('treino:appstate', onNativeState);
    };
  }, [repository]);

  const mutate = useCallback((updater) => {
    const current = coreRef.current;
    if (!current) return null;
    const draft = typeof structuredClone === 'function' ? structuredClone(current) : JSON.parse(JSON.stringify(current));
    const result = updater(draft) || draft;
    result.revision = Number(current.revision || 0) + 1;
    result.updatedAt = nowIso();
    return persist(normalizeCore(result));
  }, [persist]);

  const replaceCore = useCallback(async (next) => {
    const normalized = normalizeCore(next);
    coreRef.current = normalized;
    setCore(normalized);
    await repository.saveCore(normalized);
    return normalized;
  }, [repository]);

  const refresh = useCallback(async () => {
    const next = migrateLegacyCore(await repository.loadCore());
    coreRef.current = next;
    setCore(next);
    return next;
  }, [repository]);

  const value = useMemo(() => ({
    core,
    loading,
    error,
    setError,
    mutate,
    replaceCore,
    refresh,
    repository,
    nativeBridge,
    platform,
    getCurrentCore: () => coreRef.current
  }), [core, loading, error, mutate, replaceCore, refresh, repository, nativeBridge, platform]);

  return <EngineContext.Provider value={value}>{children}</EngineContext.Provider>;
}

export function useEngine() {
  const value = useContext(EngineContext);
  if (!value) throw new Error('EngineProvider ausente.');
  return value;
}

export function useMediaUrl(mediaId) {
  const { repository } = useEngine();
  const [url, setUrl] = useState('');
  useEffect(() => {
    let alive = true;
    let revoke = null;
    if (!mediaId) { setUrl(''); return undefined; }
    repository.getMediaUrl(mediaId).then((result) => {
      if (!alive) {
        if (result?.revoke) result.revoke();
        return;
      }
      setUrl(result?.url || '');
      revoke = result?.revoke || null;
    }).catch(() => setUrl(''));
    return () => {
      alive = false;
      if (revoke) revoke();
    };
  }, [mediaId, repository]);
  return url;
}
