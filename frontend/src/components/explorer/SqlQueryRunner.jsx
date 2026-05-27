import { useState } from 'react';
import { useSnapshot } from '../../context/SnapshotContext';
import { runQuery } from '../../api/connections';

const LIVE_TYPES = ['postgres', 'mysql', 'sqlite'];

function exportCsv(fields, rows) {
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [fields.join(','), ...rows.map(row => fields.map(f => escape(row[f])).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `query_results_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Sanitize table/column names to valid SQL identifiers for alasql
function safeName(name) {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

async function runInMemory(sql, tables) {
  const alasql = (await import('alasql')).default;

  // Register each table using safe names, mapping original -> safe
  const nameMap = {};
  for (const table of tables) {
    const original = table.name.includes('__')
      ? table.name.split('__').slice(1).join('__')
      : table.name;
    const safe = safeName(original);
    nameMap[original] = safe;
    alasql.tables[safe] = {
      data: (table.sample_rows || []).map(row => {
        const normalized = {};
        for (const [k, v] of Object.entries(row)) {
          normalized[safeName(k)] = v;
        }
        return normalized;
      }),
    };
  }

  // Rewrite SQL to use safe names
  let rewritten = sql;
  for (const [orig, safe] of Object.entries(nameMap)) {
    if (orig !== safe) {
      rewritten = rewritten.replace(new RegExp(`\\b${orig}\\b`, 'g'), safe);
    }
  }

  try {
    const rows = alasql(rewritten);
    const fields = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { rows, fields, rowCount: rows.length };
  } finally {
    for (const safe of Object.values(nameMap)) {
      delete alasql.tables[safe];
    }
  }
}

export default function SqlQueryRunner() {
  const { mergedSnapshot, sessionSnapshots, primarySnapshotId } = useSnapshot();
  const [sql, setSql] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const primarySnap = sessionSnapshots.find(s => s.id === primarySnapshotId) || sessionSnapshots[0];
  const isLive = LIVE_TYPES.includes(primarySnap?.source_type);
  const tables = mergedSnapshot?.snapshot_data?.tables || [];
  const hasSampleData = tables.some(t => (t.sample_rows || []).length > 0);

  const handleRun = async (e) => {
    e.preventDefault();
    if (!sql.trim() || !primarySnap) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      if (isLive) {
        const { data } = await runQuery(sql.trim(), primarySnap.id);
        setResult(data);
      } else {
        const data = await runInMemory(sql.trim(), tables);
        setResult(data);
      }
    } catch (err) {
      const errData = err.response?.data;
      setError(errData?.error || err.message || 'Query failed');
    } finally {
      setLoading(false);
    }
  };

  const modeLabel = isLive
    ? `Connected to ${primarySnap.source_type} — queries run live against the database.`
    : hasSampleData
    ? `File-based snapshot — running against up to 500 in-memory rows per table.`
    : 'File-based snapshot — no row data available. Re-upload to enable in-browser queries.';

  return (
    <div className="sql-runner">
      <div className="sql-runner-header">
        <h2>SQL Query Runner</h2>
        <p className="sql-runner-subtitle">{modeLabel}</p>
        {!isLive && hasSampleData && (
          <p className="sql-runner-note">
            Results reflect sample data only. Connect to a live database for full query execution.
          </p>
        )}
      </div>

      {tables.length > 0 && (
        <div className="sql-runner-tables">
          <span className="sql-runner-tables-label">Tables:</span>
          {tables.slice(0, 12).map(t => {
            const displayName = t.name.includes('__') ? t.name.split('__').slice(1).join('__') : t.name;
            return (
              <code
                key={t.name}
                className="sql-runner-table-chip"
                onClick={() => setSql(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + displayName)}
                title="Click to insert table name"
              >
                {displayName}
              </code>
            );
          })}
          {tables.length > 12 && <span className="sql-runner-tables-more">+{tables.length - 12} more</span>}
        </div>
      )}

      <form onSubmit={handleRun} className="sql-runner-form">
        <textarea
          className="sql-runner-editor"
          value={sql}
          onChange={e => setSql(e.target.value)}
          placeholder={isLive
            ? 'SELECT * FROM your_table LIMIT 100'
            : 'SELECT * FROM your_table LIMIT 100'}
          rows={6}
          spellCheck={false}
          autoComplete="off"
          disabled={loading}
          onKeyDown={e => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              handleRun(e);
            }
          }}
        />
        <div className="sql-runner-actions">
          <button
            className="btn btn-primary"
            type="submit"
            disabled={!sql.trim() || loading || (!isLive && !hasSampleData)}
            title={!isLive && !hasSampleData ? 'No row data available — re-upload to enable in-browser queries' : 'Run query (⌘Enter)'}
          >
            {loading ? 'Running…' : 'Run Query'}
          </button>
          {result && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => exportCsv(result.fields, result.rows)}
            >
              Export CSV
            </button>
          )}
          {sql && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setSql(''); setResult(null); setError(null); }}
            >
              Clear
            </button>
          )}
          <span className="sql-runner-hint">⌘↵ to run</span>
        </div>
      </form>

      {error && (
        <div className="alert alert-error" style={{ marginTop: '1rem' }}>
          {error}
        </div>
      )}

      {result && (
        <div className="sql-runner-results">
          <div className="sql-runner-results-header">
            <span className="sql-runner-results-count">
              {result.rowCount} row{result.rowCount !== 1 ? 's' : ''}
            </span>
          </div>
          {result.rowCount === 0 ? (
            <p className="sql-runner-empty">Query returned no rows.</p>
          ) : (
            <div className="sql-runner-table-wrap">
              <table className="sql-runner-table">
                <thead>
                  <tr>
                    {result.fields.map(f => <th key={f}>{f}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i}>
                      {result.fields.map(f => (
                        <td key={f}>{row[f] == null ? <span className="null-badge">NULL</span> : String(row[f])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
