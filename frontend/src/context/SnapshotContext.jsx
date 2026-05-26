import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'datalens_recent_snapshots';
const MAX_RECENT = 5;

const SnapshotContext = createContext(null);

function shortName(snap) {
  return snap.name.split(' —')[0].trim().slice(0, 20);
}

export function SnapshotProvider({ children }) {
  const [sessionSnapshots, setSessionSnapshots] = useState([]);
  const [primarySnapshotId, setPrimaryId] = useState(null);
  const [recentSnapshots, setRecentSnapshots] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  });

  const addToRecent = useCallback((snapshot) => {
    setRecentSnapshots((prev) => {
      const filtered = prev.filter((s) => s.id !== snapshot.id);
      const updated = [snapshot, ...filtered].slice(0, MAX_RECENT);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const loadSnapshot = useCallback((snapshot) => {
    setSessionSnapshots([snapshot]);
    setPrimaryId(snapshot.id);
    addToRecent(snapshot);
  }, [addToRecent]);

  const addToSession = useCallback((snapshot) => {
    setSessionSnapshots((prev) => {
      if (prev.find(s => s.id === snapshot.id)) return prev;
      return [...prev, snapshot];
    });
    addToRecent(snapshot);
  }, [addToRecent]);

  const removeFromSession = useCallback((id) => {
    setSessionSnapshots((prev) => {
      const next = prev.filter(s => s.id !== id);
      return next;
    });
    setPrimaryId((prev) => {
      if (prev !== id) return prev;
      const remaining = sessionSnapshots.filter(s => s.id !== id);
      return remaining[0]?.id || null;
    });
  }, [sessionSnapshots]);

  const setAsPrimary = useCallback((id) => setPrimaryId(id), []);

  const clearSnapshot = useCallback(() => {
    setSessionSnapshots([]);
    setPrimaryId(null);
  }, []);

  const mergedSnapshot = useMemo(() => {
    if (sessionSnapshots.length === 0) return null;
    if (sessionSnapshots.length === 1) return sessionSnapshots[0];

    const primary = sessionSnapshots.find(s => s.id === primarySnapshotId) || sessionSnapshots[0];

    const allTables = sessionSnapshots.flatMap(snap => {
      const prefix = shortName(snap);
      return (snap.snapshot_data?.tables || []).map(t => ({
        ...t,
        _source: snap.name,
        _sourceId: snap.id,
        _isPrimary: snap.id === primary.id,
        name: snap.id === primary.id ? t.name : `${prefix}__${t.name}`,
      }));
    });

    const allRelationships = sessionSnapshots.flatMap(s => s.snapshot_data?.relationships || []);

    return {
      id: primary.id,
      name: `Session (${sessionSnapshots.length} sources)`,
      snapshot_data: { tables: allTables, relationships: allRelationships },
      _isSession: true,
      _sessionSnapshots: sessionSnapshots,
      _primaryId: primary.id,
    };
  }, [sessionSnapshots, primarySnapshotId]);

  const activeSnapshot = sessionSnapshots.length === 1 ? sessionSnapshots[0] : (sessionSnapshots.find(s => s.id === primarySnapshotId) || null);

  return (
    <SnapshotContext.Provider value={{
      activeSnapshot,
      mergedSnapshot: mergedSnapshot || activeSnapshot,
      sessionSnapshots,
      primarySnapshotId,
      recentSnapshots,
      loadSnapshot,
      addToSession,
      removeFromSession,
      setAsPrimary,
      clearSnapshot,
    }}>
      {children}
    </SnapshotContext.Provider>
  );
}

export const useSnapshot = () => useContext(SnapshotContext);
