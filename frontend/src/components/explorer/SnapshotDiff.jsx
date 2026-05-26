import { useState, useEffect } from 'react';
import { listSnapshots, diffSnapshots } from '../../api/snapshots';
import { useSnapshot } from '../../context/SnapshotContext';

const STATUS_COLOR = {
  added:     'var(--color-success)',
  removed:   'var(--color-danger)',
  changed:   'var(--color-warning)',
  unchanged: 'var(--color-text-dim)',
};

const STATUS_LABEL = {
  added:     '+ Added',
  removed:   '− Removed',
  changed:   '~ Changed',
  unchanged: '· Unchanged',
};

export default function SnapshotDiff() {
  const { activeSnapshot } = useSnapshot();
  const [snapshots, setSnapshots] = useState([]);
  const [compareId, setCompareId] = useState('');
  const [diff, setDiff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    listSnapshots().then(({ data }) =>
      setSnapshots(data.filter((s) => s.id !== activeSnapshot?.id))
    );
  }, [activeSnapshot]);

  const handleDiff = async () => {
    if (!compareId) return;
    setLoading(true);
    setError(null);
    setDiff(null);
    try {
      const { data } = await diffSnapshots(activeSnapshot.id, compareId);
      setDiff(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to compare snapshots');
    } finally {
      setLoading(false);
    }
  };

  const changed = diff?.diff.filter((d) => d.status !== 'unchanged') ?? [];
  const unchangedCount = diff?.diff.filter((d) => d.status === 'unchanged').length ?? 0;

  return (
    <div className="snapshot-diff">
      <div className="diff-controls">
        <div className="diff-controls-row">
          <div className="diff-snapshot-label">
            <span className="diff-label">Base</span>
            <span className="diff-name">{activeSnapshot?.name}</span>
          </div>
          <span className="diff-vs">vs</span>
          <select
            value={compareId}
            onChange={(e) => setCompareId(e.target.value)}
            style={{ flex: 1, minWidth: '200px' }}
          >
            <option value="">Select snapshot to compare…</option>
            {snapshots.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            className="btn btn-primary"
            onClick={handleDiff}
            disabled={!compareId || loading}
          >
            {loading ? 'Comparing…' : 'Compare'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>}

      {diff && (
        <div className="diff-results">
          <div className="diff-summary">
            {Object.keys(STATUS_LABEL).map((status) => {
              const count = diff.diff.filter((d) => d.status === status).length;
              if (!count) return null;
              return (
                <span key={status} className="diff-summary-item" style={{ color: STATUS_COLOR[status] }}>
                  {STATUS_LABEL[status]}: {count}
                </span>
              );
            })}
          </div>

          {changed.length === 0 ? (
            <div className="empty-state" style={{ marginTop: '1.5rem' }}>
              <p>No differences found — these snapshots have identical schemas ({unchangedCount} tables).</p>
            </div>
          ) : (
            <div className="diff-table-list">
              {changed.map((item) => (
                <div key={item.table} className="diff-table-item" style={{ borderColor: STATUS_COLOR[item.status] }}>
                  <div className="diff-table-header">
                    <span className="diff-status-badge" style={{ color: STATUS_COLOR[item.status] }}>
                      {STATUS_LABEL[item.status]}
                    </span>
                    <span className="diff-table-name">{item.table}</span>
                    {!!item.row_count_delta && (
                      <span className="diff-row-delta" style={{ color: item.row_count_delta > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {item.row_count_delta > 0 ? '+' : ''}{item.row_count_delta.toLocaleString()} rows
                      </span>
                    )}
                  </div>
                  {item.column_changes?.length > 0 && (
                    <ul className="diff-col-changes">
                      {item.column_changes.map((cc) => (
                        <li key={cc.column} style={{ color: STATUS_COLOR[cc.status] }}>
                          {cc.status === 'added' ? '+ ' : cc.status === 'removed' ? '− ' : '~ '}
                          <span className="col-name">{cc.column}</span>
                          {cc.null_percent_delta !== undefined && (
                            <span className="diff-null-delta">
                              null rate {cc.null_percent_delta > 0 ? '+' : ''}{cc.null_percent_delta}%
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!diff && !loading && !error && (
        <div className="empty-state" style={{ marginTop: '2rem' }}>
          <p>Select a snapshot above to compare schemas, column changes, and row count differences.</p>
        </div>
      )}
    </div>
  );
}
