import { useState, useEffect } from 'react';
import { listSnapshots, renameSnapshot, deleteSnapshot, exportSnapshot, shareSnapshot } from '../../api/snapshots';
import { getSnapshot } from '../../api/snapshots';
import { useSnapshot } from '../../context/SnapshotContext';
import { useNavigate } from 'react-router-dom';

function sourceBadge(type) {
  const map = { csv: 'badge-csv', json: 'badge-json' };
  return `badge ${map[type] || 'badge-csv'}`;
}

export default function SnapshotManager() {
  const [snapshots, setSnapshots] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const { loadSnapshot } = useSnapshot();
  const navigate = useNavigate();

  useEffect(() => {
    listSnapshots().then(({ data }) => setSnapshots(data));
  }, []);

  const handleLoad = async (meta) => {
    const { data: full } = await getSnapshot(meta.id);
    loadSnapshot(full);
    navigate('/explorer');
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
    const { data } = await shareSnapshot(id);
    const url = `${window.location.origin}/shared/${data.share_token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRename = async (id) => {
    const { data } = await renameSnapshot(id, editingName);
    setSnapshots((prev) => prev.map((s) => s.id === id ? { ...s, name: data.name } : s));
    setEditingId(null);
  };

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
    <ul className="snapshot-list">
      {snapshots.map((s) => (
        <li key={s.id} className="snapshot-item">
          {editingId === s.id ? (
            <div className="snapshot-rename">
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename(s.id)}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" onClick={() => handleRename(s.id)}>Save</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
            </div>
          ) : (
            <>
              <div className="snapshot-info">
                <span className="snapshot-name">{s.name}</span>
                <span className={sourceBadge(s.source_type)}>{s.source_type}</span>
              </div>
              <div className="snapshot-actions">
                <button className="btn btn-primary btn-sm" onClick={() => handleLoad(s)}>Load</button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setEditingId(s.id); setEditingName(s.name); }}>Rename</button>
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
  );
}
