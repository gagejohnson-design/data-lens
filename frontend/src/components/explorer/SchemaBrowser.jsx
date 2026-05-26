import { useState } from 'react';
import { useSnapshot } from '../../context/SnapshotContext';

function getTopValues(sample_rows, colName) {
  if (!sample_rows?.length) return [];
  const counts = {};
  for (const row of sample_rows) {
    const v = row[colName];
    const key = v == null ? '(null)' : String(v);
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([value, count]) => ({ value, count }));
}

function NullBar({ percent }) {
  const pct = percent ?? 0;
  const color = pct > 20 ? 'var(--color-danger)' : pct > 5 ? 'var(--color-warning)' : 'var(--color-success)';
  return (
    <div className="null-bar-wrap">
      <div className="null-bar-track">
        <div className="null-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className={`null-rate ${pct > 20 ? 'high' : pct > 5 ? 'mid' : ''}`}>{pct}%</span>
    </div>
  );
}

export default function SchemaBrowser() {
  const { activeSnapshot } = useSnapshot();
  const [selectedTable, setSelectedTable] = useState(null);
  const [showDist, setShowDist] = useState(false);

  const tables = activeSnapshot?.snapshot_data?.tables || [];
  const table = tables.find((t) => t.name === selectedTable);

  return (
    <div className="schema-layout">
      <nav className="schema-sidebar">
        <div className="sidebar-header">
          Tables <span className="sidebar-count">{tables.length}</span>
        </div>
        <ul className="table-list">
          {tables.map((t) => (
            <li key={t.name}>
              <button
                className={`table-btn ${selectedTable === t.name ? 'active' : ''}`}
                onClick={() => { setSelectedTable(t.name); setShowDist(false); }}
              >
                <span className="table-btn-name">{t.name}</span>
                <span className="table-btn-count">{t.row_count?.toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="schema-detail">
        {table ? (
          <>
            <div className="detail-header">
              <h3>{table.name}</h3>
              <span className="detail-meta">
                {table.row_count?.toLocaleString()} rows
                {table.duplicate_count > 0 && ` · ${table.duplicate_count} duplicates`}
              </span>
              {table.sample_rows?.length > 0 && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => setShowDist((v) => !v)}
                >
                  {showDist ? 'Hide distributions' : 'Show distributions'}
                </button>
              )}
            </div>

            {table.notes && <p className="table-notes">{table.notes}</p>}

            <table className="data-table">
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Type</th>
                  <th>Nullable</th>
                  <th>Null %</th>
                  {showDist && <th>Distribution</th>}
                </tr>
              </thead>
              <tbody>
                {table.columns.map((col) => {
                  const topVals = showDist ? getTopValues(table.sample_rows, col.name) : [];
                  return (
                    <tr key={col.name}>
                      <td className="col-name-cell">{col.name}</td>
                      <td className="col-type-cell">{col.type}</td>
                      <td>{col.nullable ? 'Yes' : 'No'}</td>
                      <td><NullBar percent={col.null_percent} /></td>
                      {showDist && (
                        <td className="dist-cell">
                          {topVals.length > 0 ? (
                            <div className="dist-values">
                              {topVals.map(({ value, count }) => (
                                <div key={value} className="dist-value-row">
                                  <span className="dist-value-label">{value}</span>
                                  <div className="dist-value-bar-track">
                                    <div
                                      className="dist-value-bar-fill"
                                      style={{ width: `${(count / (table.sample_rows?.length || 1)) * 100}%` }}
                                    />
                                  </div>
                                  <span className="dist-value-count">{count}</span>
                                </div>
                              ))}
                              <span className="dist-note">from sample rows</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-text-dim)', fontSize: '0.78rem' }}>—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {table.sample_rows?.length > 0 && (
              <details className="sample-rows">
                <summary>Sample rows ({table.sample_rows.length})</summary>
                <pre>{JSON.stringify(table.sample_rows, null, 2)}</pre>
              </details>
            )}
          </>
        ) : (
          <div className="empty-state">
            <p>Select a table from the left to view its schema.</p>
          </div>
        )}
      </div>
    </div>
  );
}
