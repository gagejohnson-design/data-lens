import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSnapshot } from '../../context/SnapshotContext';
import { updateSnapshotData } from '../../api/snapshots';

const TYPE_BADGE = {
  number:  { label: '123', cls: 'type-number' },
  boolean: { label: 'T/F', cls: 'type-boolean' },
  string:  { label: 'ABC', cls: 'type-string' },
  text:    { label: 'TXT', cls: 'type-string' },
};
const ALL_TYPES = ['string', 'number', 'boolean', 'text'];

const PINS_KEY = 'datalens_pinned_tables';
function loadPins(snapId) {
  try { return JSON.parse(localStorage.getItem(PINS_KEY) || '{}')[snapId] || []; }
  catch { return []; }
}
function savePins(snapId, pins) {
  try {
    const all = JSON.parse(localStorage.getItem(PINS_KEY) || '{}');
    localStorage.setItem(PINS_KEY, JSON.stringify({ ...all, [snapId]: pins }));
  } catch {}
}

function getTopValues(sample_rows, colName) {
  if (!sample_rows?.length) return [];
  const counts = {};
  for (const row of sample_rows) {
    const v = row[colName];
    const key = v == null ? '(null)' : String(v);
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([value, count]) => ({ value, count }));
}

function avgNull(table) {
  if (!table.columns?.length) return 0;
  return table.columns.reduce((s, c) => s + (c.null_percent || 0), 0) / table.columns.length;
}
function nullHealthCls(pct) {
  if (pct > 20) return 'health-poor';
  if (pct > 5)  return 'health-warn';
  return '';
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

function generateDDL(table) {
  const displayName = table._isPrimary === false
    ? table.name.split('__').slice(1).join('__') : table.name;
  const cols = (table.columns || [])
    .map(c => `  ${c.name} ${c.type.toUpperCase()}${c.nullable ? '' : ' NOT NULL'}`)
    .join(',\n');
  return `CREATE TABLE ${displayName} (\n${cols}\n);`;
}

function exportRowsCSV(table) {
  const rows = table.sample_rows || [];
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.join(','), ...rows.map(r => cols.map(c => escape(r[c])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const name = table._isPrimary === false ? table.name.split('__').slice(1).join('__') : table.name;
  a.download = `${name}_sample.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function detectDuplicateCols(sample_rows) {
  if (!sample_rows?.length) return [];
  const cols = Object.keys(sample_rows[0]);
  return cols
    .map(col => {
      const vals = sample_rows.map(r => r[col]);
      const unique = new Set(vals).size;
      const dupeRate = +((1 - unique / vals.length) * 100).toFixed(0);
      return { col, dupeRate };
    })
    .filter(d => d.dupeRate > 0)
    .sort((a, b) => b.dupeRate - a.dupeRate)
    .slice(0, 5);
}

export default function SchemaBrowser() {
  const { mergedSnapshot, activeSnapshot, loadSnapshot, addToSession, sessionSnapshots } = useSnapshot();
  const [selectedTable, setSelectedTable] = useState(null);
  const [showDist, setShowDist] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [rowFilter, setRowFilter] = useState('');
  const [ddlCopied, setDdlCopied] = useState(false);
  const [showDupes, setShowDupes] = useState(false);

  // Pinned tables keyed by primary snapshot ID
  const snapId = activeSnapshot?.id;
  const [pins, setPins] = useState(() => loadPins(snapId));
  useEffect(() => { setPins(loadPins(snapId)); }, [snapId]);

  // Column type overrides (local edits before saving)
  const [typeEdits, setTypeEdits] = useState({});
  const [typeSaving, setTypeSaving] = useState(false);
  const hasTypeEdits = Object.keys(typeEdits).length > 0;

  const searchRef = useRef(null);
  const listRef = useRef(null);

  const tables = mergedSnapshot?.snapshot_data?.tables || [];
  const isMultiSource = tables.some(t => t._source);

  // `/` key focuses search
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const filteredTables = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = q
      ? tables.filter(t =>
          t.name.toLowerCase().includes(q) ||
          t.columns?.some(c => c.name.toLowerCase().includes(q))
        )
      : [...tables];

    if (sort === 'rows') list.sort((a, b) => (b.row_count || 0) - (a.row_count || 0));
    else if (sort === 'nulls') list.sort((a, b) => avgNull(b) - avgNull(a));
    else if (sort === 'name') {
      // pinned tables float to top
      list.sort((a, b) => {
        const aPin = pins.includes(a.name) ? -1 : 0;
        const bPin = pins.includes(b.name) ? -1 : 0;
        if (aPin !== bPin) return aPin - bPin;
        return a.name.localeCompare(b.name);
      });
    }
    return list;
  }, [tables, search, sort, pins]);

  // Keyboard nav in sidebar
  const handleListKeyDown = useCallback((e) => {
    const items = listRef.current?.querySelectorAll('.table-btn');
    if (!items?.length) return;
    const idx = [...items].findIndex(el => el.classList.contains('active'));
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = items[Math.min(idx + 1, items.length - 1)];
      next?.click(); next?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = items[Math.max(idx - 1, 0)];
      prev?.click(); prev?.focus();
    }
  }, []);

  const table = tables.find(t => t.name === selectedTable);

  const filteredRows = useMemo(() => {
    if (!table?.sample_rows?.length || !rowFilter.trim()) return table?.sample_rows || [];
    const q = rowFilter.trim().toLowerCase();
    return table.sample_rows.filter(row =>
      Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q))
    );
  }, [table, rowFilter]);

  const searchMatchedCols = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !table) return new Set();
    return new Set(table.columns?.filter(c => c.name.toLowerCase().includes(q)).map(c => c.name) || []);
  }, [search, table]);

  const togglePin = (tableName) => {
    const next = pins.includes(tableName)
      ? pins.filter(p => p !== tableName)
      : [...pins, tableName];
    setPins(next);
    savePins(snapId, next);
  };

  const handleDdlCopy = () => {
    if (!table) return;
    navigator.clipboard.writeText(generateDDL(table));
    setDdlCopied(true);
    setTimeout(() => setDdlCopied(false), 2000);
  };

  const setColType = (colName, newType) => {
    setTypeEdits(prev => ({ ...prev, [`${selectedTable}__${colName}`]: newType }));
  };

  const handleSaveTypes = async () => {
    const sourceSnapshot = table?._sourceId
      ? sessionSnapshots.find(s => s.id === table._sourceId)
      : activeSnapshot;
    if (!sourceSnapshot) return;

    setTypeSaving(true);
    try {
      const originalName = table._isPrimary === false
        ? table.name.split('__').slice(1).join('__') : table.name;
      const updatedTables = (sourceSnapshot.snapshot_data?.tables || []).map(t => {
        if (t.name !== originalName) return t;
        return {
          ...t,
          columns: t.columns.map(c => {
            const editKey = `${selectedTable}__${c.name}`;
            return typeEdits[editKey] ? { ...c, type: typeEdits[editKey] } : c;
          }),
        };
      });
      const { data: updated } = await updateSnapshotData(sourceSnapshot.id, {
        ...sourceSnapshot.snapshot_data,
        tables: updatedTables,
      });
      if (sessionSnapshots.length === 1) loadSnapshot(updated);
      else addToSession(updated);
      setTypeEdits({});
    } finally {
      setTypeSaving(false);
    }
  };

  const dupeCols = useMemo(() =>
    table?.duplicate_count > 0 ? detectDuplicateCols(table.sample_rows) : [],
  [table]);

  return (
    <div className="schema-layout">
      <nav className="schema-sidebar" onKeyDown={handleListKeyDown}>
        <div className="sidebar-header">
          Tables <span className="sidebar-count">{filteredTables.length}</span>
          <select className="sidebar-sort" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="name">A–Z</option>
            <option value="rows">Rows ↓</option>
            <option value="nulls">Nulls ↓</option>
          </select>
        </div>
        <div className="sidebar-search-wrap">
          <input
            ref={searchRef}
            className="sidebar-search"
            type="text"
            placeholder="Search… (press /)"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <ul className="table-list" ref={listRef}>
          {filteredTables.map((t) => {
            const an = avgNull(t);
            const isPinned = pins.includes(t.name);
            const displayName = t._isPrimary === false
              ? t.name.split('__').slice(1).join('__') : t.name;
            return (
              <li key={t.name} className={`table-list-item ${nullHealthCls(an)}`}>
                <button
                  className={`table-btn ${selectedTable === t.name ? 'active' : ''}`}
                  onClick={() => { setSelectedTable(t.name); setShowDist(false); setRowFilter(''); setShowDupes(false); setTypeEdits({}); }}
                >
                  {isPinned && <span className="pin-icon" title="Pinned">★</span>}
                  <span className="table-btn-name">{displayName}</span>
                  <span className="table-btn-count">{t.row_count?.toLocaleString()}</span>
                  {isMultiSource && !t._isPrimary && t._source && (
                    <span className="table-source-tag" title={t._source}>
                      {t._source.split(' —')[0].trim().slice(0, 10)}
                    </span>
                  )}
                </button>
                <button
                  className={`pin-btn ${isPinned ? 'pin-btn-on' : ''}`}
                  onClick={() => togglePin(t.name)}
                  title={isPinned ? 'Unpin' : 'Pin to top'}
                >★</button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="schema-detail">
        {table ? (
          <>
            <div className="detail-header">
              <h3>{table._isPrimary === false ? table.name.split('__').slice(1).join('__') : table.name}</h3>
              {isMultiSource && table._source && (
                <span className="detail-source-badge">{table._source.split(' —')[0].trim().slice(0, 20)}</span>
              )}
              <span className="detail-meta">
                {table.row_count?.toLocaleString()} rows
                {table.duplicate_count > 0 && (
                  <button className="dupe-link" onClick={() => setShowDupes(v => !v)}>
                    {table.duplicate_count} dupes
                  </button>
                )}
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {hasTypeEdits && (
                  <button className="btn btn-primary btn-sm" onClick={handleSaveTypes} disabled={typeSaving}>
                    {typeSaving ? 'Saving…' : 'Save Types'}
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={handleDdlCopy}>
                  {ddlCopied ? 'Copied!' : 'Copy DDL'}
                </button>
                {table.sample_rows?.length > 0 && (
                  <>
                    <button className="btn btn-ghost btn-sm" onClick={() => exportRowsCSV(table)}>
                      Export CSV
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowDist(v => !v)}>
                      {showDist ? 'Hide dist.' : 'Dist.'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {showDupes && dupeCols.length > 0 && (
              <div className="dupe-panel">
                <p className="dupe-panel-title">Columns with repeated values (from sample)</p>
                <div className="dupe-list">
                  {dupeCols.map(d => (
                    <div key={d.col} className="dupe-item">
                      <span className="dupe-col">{d.col}</span>
                      <div className="dupe-bar-track">
                        <div className="dupe-bar-fill" style={{ width: `${d.dupeRate}%` }} />
                      </div>
                      <span className="dupe-rate">{d.dupeRate}% repeated</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                  const editKey = `${selectedTable}__${col.name}`;
                  const currentType = typeEdits[editKey] || col.type;
                  const badge = TYPE_BADGE[currentType] || { label: currentType, cls: 'type-string' };
                  const isHighlighted = searchMatchedCols.has(col.name);
                  const topVals = showDist ? getTopValues(table.sample_rows, col.name) : [];
                  return (
                    <tr key={col.name} className={isHighlighted ? 'col-row-highlight' : ''}>
                      <td className="col-name-cell">{col.name}</td>
                      <td className="col-type-cell">
                        <span className={`type-badge ${badge.cls}`}>{badge.label}</span>
                        <select
                          className="type-override-select"
                          value={currentType}
                          onChange={e => setColType(col.name, e.target.value)}
                          title="Override type"
                        >
                          {ALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        {typeEdits[editKey] && <span className="type-edited-dot" title="Unsaved change" />}
                      </td>
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
                                    <div className="dist-value-bar-fill" style={{ width: `${(count / (table.sample_rows?.length || 1)) * 100}%` }} />
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
                <div className="sample-rows-filter-wrap">
                  <input
                    className="sample-rows-filter"
                    type="text"
                    placeholder="Filter rows…"
                    value={rowFilter}
                    onChange={e => setRowFilter(e.target.value)}
                  />
                  {rowFilter && <span className="sample-rows-count">{filteredRows.length} match</span>}
                </div>
                {filteredRows.length > 0 ? (
                  <div className="sample-rows-table-wrap">
                    <table className="sample-rows-table">
                      <thead>
                        <tr>
                          {Object.keys(filteredRows[0]).map(col => (
                            <th key={col}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((row, ri) => (
                          <tr key={ri}>
                            {Object.keys(filteredRows[0]).map(col => {
                              const val = row[col];
                              return (
                                <td key={col} className={val == null ? 'cell-null' : ''}>
                                  {val == null ? 'null' : String(val)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--color-text-dim)' }}>
                    No rows match filter.
                  </p>
                )}
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
