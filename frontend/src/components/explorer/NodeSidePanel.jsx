import { useState, useMemo } from 'react';
import { useSnapshot } from '../../context/SnapshotContext';
import { updateSnapshotData } from '../../api/snapshots';

export default function NodeSidePanel({ tableName, onClose }) {
  const { mergedSnapshot, sessionSnapshots, loadSnapshot, addToSession } = useSnapshot();

  const tables = mergedSnapshot?.snapshot_data?.tables || [];
  const table = useMemo(() => tables.find((t) => t.name === tableName), [tables, tableName]);

  const [notes, setNotes] = useState(table?.notes || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!table) return null;

  // Find the actual source snapshot for saving notes
  const sourceSnapshot = table._sourceId
    ? sessionSnapshots.find(s => s.id === table._sourceId)
    : sessionSnapshots[0];

  const displayName = table._isPrimary === false
    ? table.name.split('__').slice(1).join('__')
    : table.name;

  const handleSaveNotes = async () => {
    if (!sourceSnapshot) return;
    setSaving(true);
    setSaved(false);
    try {
      const sourceTables = sourceSnapshot.snapshot_data?.tables || [];
      // The actual table name in the source snapshot (before prefix was added)
      const originalName = table._isPrimary === false
        ? table.name.split('__').slice(1).join('__')
        : table.name;
      const updatedData = {
        ...sourceSnapshot.snapshot_data,
        tables: sourceTables.map((t) =>
          t.name === originalName ? { ...t, notes } : t
        ),
      };
      const { data: updated } = await updateSnapshotData(sourceSnapshot.id, updatedData);
      // Refresh the right snapshot in the session
      if (sessionSnapshots.length === 1) {
        loadSnapshot(updated);
      } else {
        addToSession(updated);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="node-side-panel">
      <button className="panel-close" onClick={onClose} aria-label="Close panel">✕</button>
      <h3>{displayName}</h3>
      {table._source && table._isPrimary === false && (
        <p style={{ fontSize: '0.75rem', color: '#c4b5fd', marginBottom: '0.25rem' }}>
          from {table._source.split(' —')[0].trim()}
        </p>
      )}
      <p className="panel-meta">
        {table.row_count.toLocaleString()} rows
        {table.duplicate_count > 0 && ` · ${table.duplicate_count} duplicates`}
      </p>

      <h4>Columns</h4>
      <ul className="column-list">
        {table.columns.map((col) => (
          <li key={col.name}>
            <span className="col-name">{col.name}</span>
            <span className="col-type">{col.type}</span>
            {col.null_percent > 0 && (
              <span className="col-null">{col.null_percent}% null</span>
            )}
          </li>
        ))}
      </ul>

      <h4>Notes</h4>
      <textarea
        className="notes-textarea"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        placeholder="Add notes about this table..."
      />
      <button
        className="btn btn-primary"
        onClick={handleSaveNotes}
        disabled={saving}
      >
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Notes'}
      </button>
    </aside>
  );
}
