import { useMemo } from 'react';
import { useSnapshot } from '../../context/SnapshotContext';

function healthLabel(avgNull) {
  if (avgNull < 5) return { label: 'Good', cls: 'health-good' };
  if (avgNull < 20) return { label: 'Warning', cls: 'health-warn' };
  return { label: 'Poor', cls: 'health-poor' };
}

export default function DataHealth() {
  const { activeSnapshot } = useSnapshot();
  const tables = activeSnapshot?.snapshot_data?.tables || [];

  const rows = useMemo(() => tables.map((t) => {
    const avgNull = t.columns.length
      ? t.columns.reduce((s, c) => s + (c.null_percent || 0), 0) / t.columns.length
      : 0;
    return { ...t, avgNull, ...healthLabel(avgNull) };
  }), [tables]);

  if (rows.length === 0) {
    return <div className="empty-state"><p>No tables found in this snapshot.</p></div>;
  }

  return (
    <div className="health-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Table</th>
            <th>Rows</th>
            <th>Duplicates</th>
            <th>Avg Null %</th>
            <th>Health</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.name}>
              <td className="col-name-cell">{t.name}</td>
              <td>{t.row_count.toLocaleString()}</td>
              <td>{t.duplicate_count}</td>
              <td>{t.avgNull.toFixed(1)}%</td>
              <td><span className={`health-badge ${t.cls}`}>{t.label}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
