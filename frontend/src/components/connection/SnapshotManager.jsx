import { useState, useEffect } from 'react';
import { listSnapshots, renameSnapshot, deleteSnapshot, exportSnapshot, shareSnapshot, getSnapshot } from '../../api/snapshots';
import { useSnapshot } from '../../context/SnapshotContext';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';

function sourceBadge(type) {
  const map = { csv: 'badge-csv', json: 'badge-json', mixed: 'badge-mixed' };
  return `badge ${map[type] || 'badge-csv'}`;
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  if (h < 168) return `${Math.floor(h / 24)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function SnapshotManager() {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingDesc, setEditingDesc] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const { loadSnapshot } = useSnapshot();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    listSnapshots()
      .then(({ data }) => setSnapshots(data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? snapshots.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.description || '').toLowerCase().includes(search.toLowerCase())
      )
    : snapshots;

  const handleLoad = async (meta) => {
    try {
      const { data: full } = await getSnapshot(meta.id);
      loadSnapshot(full);
      navigate('/explorer');
    } catch {
      toast('Failed to load snapshot', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this snapshot?')) return;
    await deleteSnapshot(id);
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleExport = async (id, name) => {
    const { data } = await exportSnapshot(id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async (id) => {
    try {
      const { data } = await shareSnapshot(id);
      const url = `${window.location.origin}/shared/${data.share_token}`;
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast('Share link copied to clipboard', 'success');
    } catch {
      toast('Failed to generate share link', 'error');
    }
  };

  const handleRenameSuccess = (id, data) => {
    setSnapshots(prev => prev.map(s => s.id === id ? { ...s, name: data.name, description: data.description } : s));
    setEditingId(null);
    toast('Snapshot updated', 'success');
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditingName(s.name);
    setEditingDesc(s.description || '');
  };

  const handleRename = async (id) => {
    try {
      const { data } = await renameSnapshot(id, editingName, editingDesc || null);
      handleRenameSuccess(id, data);
    } catch {
      toast('Failed to save changes', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.25rem 0' }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="snapshot-skeleton" />
        ))}
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 0.75rem', color: 'var(--color-text-dim)' }}>
          <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12"/>
          <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
        </svg>
        <p>No snapshots yet. Upload a CSV, JSON, or Excel file to get started.</p>
      </div>
    );
  }

  return (
    <>
      {snapshots.length > 3 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <input
            type="text"
            placeholder="Search snapshots…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      )}
      {filtered.length === 0 && (
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', padding: '0.5rem 0' }}>
          No snapshots match "{search}".
        </p>
      )}
      <ul className="snapshot-list">
        {filtered.map((s) => (
        <li key={s.id} className="snapshot-item">
          {editingId === s.id ? (
            <div className="snapshot-rename">
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename(s.id)}
                placeholder="Snapshot name"
                autoFocus
              />
              <input
                type="text"
                value={editingDesc}
                onChange={(e) => setEditingDesc(e.target.value)}
                placeholder="Description (optional)"
              />
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button className="btn btn-primary btn-sm" onClick={() => handleRename(s.id)}>Save</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="snapshot-info">
                <div className="snapshot-name-row">
                  <span className="snapshot-name">{s.name}</span>
                  <span className={sourceBadge(s.source_type)}>{s.source_type}</span>
                  <span className="snapshot-age">{timeAgo(s.created_at)}</span>
                </div>
                {s.description && (
                  <p className="snapshot-description">{s.description}</p>
                )}
              </div>
              <div className="snapshot-actions">
                <button className="btn btn-primary btn-sm" onClick={() => handleLoad(s)}>Load</button>
                <button className="btn btn-secondary btn-sm" onClick={() => startEdit(s)}>Edit</button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleExport(s.id, s.name)}>Export</button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleShare(s.id)}>
                  {copiedId === s.id ? 'Copied!' : 'Share'}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>Delete</button>
              </div>
            </>
          )}
        </li>
      ))}
      </ul>
    </>
  );
}
