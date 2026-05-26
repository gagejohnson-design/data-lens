import { useEffect, useRef, useState } from 'react';
import { getAuditLog } from '../../api/audit';

const ACTION_LABELS = {
  connected: 'Connected',
  loaded_snapshot: 'Loaded',
  deleted_snapshot: 'Deleted',
  exported: 'Exported',
};

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  if (h < 24 * 7) return `${Math.floor(h / 24)}d ago`;
  return new Date(iso).toLocaleDateString();
}

const cache = { data: null };

export default function AuditLog() {
  const [entries, setEntries] = useState(cache.data || []);
  const [loading, setLoading] = useState(!cache.data);
  const fetched = useRef(!!cache.data);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    getAuditLog()
      .then(({ data }) => { cache.data = data; setEntries(data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: 'var(--color-text-muted)', padding: '1rem' }}>Loading…</p>;

  if (entries.length === 0) {
    return <div className="empty-state"><p>No activity recorded yet.</p></div>;
  }

  return (
    <div className="health-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Action</th>
            <th>Snapshot</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td><span className={`action-badge action-${e.action}`}>{ACTION_LABELS[e.action] || e.action}</span></td>
              <td className="col-name-cell">{e.snapshot_name || '—'}</td>
              <td style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }} title={new Date(e.created_at).toLocaleString()}>
                {timeAgo(e.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
