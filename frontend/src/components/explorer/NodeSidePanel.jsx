import { useState, useMemo } from 'react';
import { useSnapshot } from '../../context/SnapshotContext';
import { updateSnapshotData } from '../../api/snapshots';

export default function NodeSidePanel({ tableName, onClose }) {
  const { activeSnapshot, loadSnapshot } = useSnapshot();
  const tables = activeSnapshot?.snapshot_data?.tables || [];
  const table = useMemo(() => tables.find((t) => t.name === tableName), [tables, tableName]);
  const [notes, setNotes] = useState(table?.notes || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!table) return null;

  const handleSaveNotes = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updatedData = {
        ...activeSnapshot.snapshot_data,
        tables: tables.map((t) =>
          t.name === tableName ? { ...t, notes } : t
        ),
      };
      const { data: updated } = await updateSnapshotData(activeSnapshot.id, updatedData);
      loadSnapshot(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="node-side-panel">
      <button className="panel-close" onClick={onClose} aria-label="Close panel">✕</button>
      <h3>{table.name}</h3>
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
