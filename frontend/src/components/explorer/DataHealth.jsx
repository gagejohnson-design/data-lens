import { useMemo, useState } from 'react';
import { useSnapshot } from '../../context/SnapshotContext';

function healthLabel(avgNull) {
  if (avgNull < 5) return { label: 'Good', cls: 'health-good' };
  if (avgNull < 20) return { label: 'Warning', cls: 'health-warn' };
  return { label: 'Poor', cls: 'health-poor' };
}

const COLS = [
  { key: 'displayName', label: 'Table' },
  { key: '_source',     label: 'Source',   multiOnly: true },
  { key: 'col_count',   label: 'Columns' },
  { key: 'row_count',   label: 'Rows' },
  { key: 'duplicate_count', label: 'Dupes' },
  { key: 'avgNull',     label: 'Avg Null %' },
  { key: 'health',      label: 'Health' },
];

export default function DataHealth() {
  const { mergedSnapshot } = useSnapshot();
  const tables = mergedSnapshot?.snapshot_data?.tables || [];
  const isMultiSource = tables.some(t => t._source);
  const [sortKey, setSortKey] = useState('avgNull');
  const [sortDir, setSortDir] = useState(-1); // -1 = desc, 1 = asc

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d * -1);
    else { setSortKey(key); setSortDir(-1); }
  };

  const rows = useMemo(() => {
    const base = tables.map((t) => {
      const avgNull = t.columns.length
        ? t.columns.reduce((s, c) => s + (c.null_percent || 0), 0) / t.columns.length
        : 0;
      const displayName = t._isPrimary === false
        ? t.name.split('__').slice(1).join('__')
        : t.name;
      return {
        ...t,
        displayName,
        avgNull,
        col_count: t.columns?.length || 0,
        ...healthLabel(avgNull),
      };
    });

    return [...base].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return -sortDir;
      if (av > bv) return sortDir;
      return 0;
    });
  }, [tables, sortKey, sortDir]);

  if (rows.length === 0) {
    return <div className="empty-state"><p>No tables found in this snapshot.</p></div>;
  }

  const SortTh = ({ col }) => {
    if (col.multiOnly && !isMultiSource) return null;
    const active = sortKey === col.key;
    return (
      <th
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => handleSort(col.key)}
        title={`Sort by ${col.label}`}
      >
        {col.label}
        {active && <span style={{ marginLeft: '0.3rem', color: 'var(--color-primary)', fontSize: '0.7rem' }}>
          {sortDir === -1 ? '↓' : '↑'}
        </span>}
      </th>
    );
  };

  return (
    <div className="health-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {COLS.map(col => <SortTh key={col.key} col={col} />)}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.name}>
              <td className="col-name-cell">{t.displayName}</td>
              {isMultiSource && (
                <td>
                  {t._source
                    ? <span className="table-source-tag">{t._source.split(' —')[0].trim().slice(0, 16)}</span>
                    : <span style={{ color: 'var(--color-primary)', fontSize: '0.75rem' }}>primary</span>
                  }
                </td>
              )}
              <td>{t.col_count}</td>
              <td>{t.row_count.toLocaleString()}</td>
              <td style={{ color: t.duplicate_count > 0 ? 'var(--color-warning)' : 'var(--color-text-dim)' }}>
                {t.duplicate_count}
              </td>
              <td>
                <span style={{
                  color: t.avgNull > 20 ? 'var(--color-danger)' : t.avgNull > 5 ? 'var(--color-warning)' : 'var(--color-text-muted)'
                }}>
                  {t.avgNull.toFixed(1)}%
                </span>
              </td>
              <td><span className={`health-badge ${t.cls}`}>{t.label}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
