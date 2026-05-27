import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../components/common/NavBar';
import InfoModal from '../components/common/InfoModal';
import SchemaBrowser from '../components/explorer/SchemaBrowser';
import RelationshipMap from '../components/explorer/RelationshipMap';
import DataHealth from '../components/explorer/DataHealth';
import AuditLog from '../components/explorer/AuditLog';
import AiQuery from '../components/explorer/AiQuery';
import SnapshotDiff from '../components/explorer/SnapshotDiff';
import SqlQueryRunner from '../components/explorer/SqlQueryRunner';
import { useSnapshot } from '../context/SnapshotContext';
import { listSnapshots, getSnapshot } from '../api/snapshots';

const TABS = [
  { id: 'Schema', label: 'Schema', fullLabel: 'Schema Browser' },
  { id: 'Map',    label: 'Map',    fullLabel: 'Relationship Map' },
  { id: 'Health', label: 'Health', fullLabel: 'Data Health' },
  { id: 'AI',     label: 'Ask AI', fullLabel: 'Ask AI' },
  { id: 'Diff',   label: 'Compare',fullLabel: 'Compare Snapshots' },
  { id: 'Audit',  label: 'Audit',  fullLabel: 'Audit Log' },
  { id: 'Query',  label: 'Query',  fullLabel: 'SQL Query Runner' },
];

const INFO = {
  Schema: 'Browse every table and column. Click a table to see columns, types, and null rates. Press / to focus search.',
  Map:    'A visual graph of how tables connect via foreign keys. Click any node to see details and add notes. Use "Suggest Relationships" to auto-detect links.',
  Health: 'Row counts, null rates, and duplicates per table. Green = healthy, yellow = warning, red = needs attention.',
  AI:     'Ask a question in plain English — DataLens writes the SQL based on your schema. Past queries are saved locally.',
  Diff:   'Compare this snapshot to another one to see added/removed tables, column changes, and row count differences.',
  Audit:  'A history of your activity — connections, loads, exports, and deletions.',
  Query:  'Run SQL directly against a live database connection. Press ⌘↵ to execute. Export results to CSV.',
};

function exportSchemaMarkdown(mergedSnapshot) {
  const tables = mergedSnapshot?.snapshot_data?.tables || [];
  const relationships = mergedSnapshot?.snapshot_data?.relationships || [];

  let md = `# Schema: ${mergedSnapshot.name}\n\n_Exported ${new Date().toLocaleDateString()}_\n\n`;

  if (tables.length > 0) {
    md += `## Tables (${tables.length})\n\n`;
    for (const t of tables) {
      const displayName = t._isPrimary === false
        ? t.name.split('__').slice(1).join('__')
        : t.name;
      md += `### ${displayName}\n`;
      if (t._source && t._isPrimary === false) md += `_Source: ${t._source.split(' —')[0]}_\n\n`;
      md += `**${t.row_count?.toLocaleString()} rows**`;
      if (t.duplicate_count > 0) md += ` · ${t.duplicate_count} duplicates`;
      md += '\n\n';
      if (t.notes) md += `> ${t.notes}\n\n`;
      md += '| Column | Type | Nullable | Null % |\n|--------|------|----------|--------|\n';
      for (const c of (t.columns || [])) {
        md += `| \`${c.name}\` | ${c.type} | ${c.nullable ? 'Yes' : 'No'} | ${c.null_percent ?? 0}% |\n`;
      }
      md += '\n';
    }
  }

  if (relationships.length > 0) {
    md += `## Relationships\n\n`;
    for (const r of relationships) {
      md += `- \`${r.from_table}.${r.from_column}\` → \`${r.to_table}.${r.to_column}\`\n`;
    }
    md += '\n';
  }

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${mergedSnapshot.name.replace(/[^a-z0-9]/gi, '_').slice(0, 40)}_schema.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function QuickStats({ mergedSnapshot, sessionSnapshots }) {
  const tables = mergedSnapshot?.snapshot_data?.tables || [];
  const totalRows = tables.reduce((s, t) => s + (t.row_count || 0), 0);
  const totalCols = tables.reduce((s, t) => s + (t.columns?.length || 0), 0);
  const totalRels = mergedSnapshot?.snapshot_data?.relationships?.length || 0;

  return (
    <div className="quick-stats">
      {sessionSnapshots.length > 1 && (
        <>
          <div className="quick-stat">
            <span className="quick-stat-value">{sessionSnapshots.length}</span>
            <span className="quick-stat-label">sources</span>
          </div>
          <div className="quick-stat-divider" />
        </>
      )}
      <div className="quick-stat">
        <span className="quick-stat-value">{tables.length}</span>
        <span className="quick-stat-label">tables</span>
      </div>
      <div className="quick-stat-divider" />
      <div className="quick-stat">
        <span className="quick-stat-value">{totalCols}</span>
        <span className="quick-stat-label">columns</span>
      </div>
      <div className="quick-stat-divider" />
      <div className="quick-stat">
        <span className="quick-stat-value">{totalRows.toLocaleString()}</span>
        <span className="quick-stat-label">rows</span>
      </div>
      {totalRels > 0 && (
        <>
          <div className="quick-stat-divider" />
          <div className="quick-stat">
            <span className="quick-stat-value">{totalRels}</span>
            <span className="quick-stat-label">relationships</span>
          </div>
        </>
      )}
    </div>
  );
}

export default function ExplorerPage() {
  const [activeTab, setActiveTab] = useState('Schema');
  const { mergedSnapshot, sessionSnapshots, primarySnapshotId, addToSession, removeFromSession, setAsPrimary } = useSnapshot();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [allSnapshots, setAllSnapshots] = useState([]);
  const pickerRef = useRef(null);

  // 1–6 keyboard shortcuts to switch tabs
  useEffect(() => {
    const handler = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      const idx = parseInt(e.key, 10) - 1;
      if (idx >= 0 && idx < TABS.length) setActiveTab(TABS[idx].id);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    listSnapshots().then(({ data }) => setAllSnapshots(data)).catch(() => {});
  }, [pickerOpen]);

  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAddSnapshot = async (snap) => {
    setPickerOpen(false);
    try {
      const { data } = await getSnapshot(snap.id);
      addToSession(data);
    } catch {}
  };

  const availableToAdd = allSnapshots.filter(s => !sessionSnapshots.find(ss => ss.id === s.id));

  return (
    <>
      <NavBar />
      <main className="page explorer-page">
        <div className="page-header">
          <div className="explorer-heading">
            <h1>Explorer</h1>
            {mergedSnapshot && (
              <span className="explorer-snapshot-name">{mergedSnapshot.name}</span>
            )}
          </div>
          {mergedSnapshot && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => exportSchemaMarkdown(mergedSnapshot)}
              title="Download schema as Markdown"
            >
              Export Schema
            </button>
          )}
          <InfoModal
            title={TABS.find((t) => t.id === activeTab)?.fullLabel}
            body={INFO[activeTab]}
          />
        </div>

        {!mergedSnapshot && (
          <div className="explorer-empty">
            <div className="explorer-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12"/>
                <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
              </svg>
            </div>
            <h2>No data loaded</h2>
            <p>Upload a file and load a snapshot to start exploring.</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Go to Connection Hub
            </Link>
          </div>
        )}

        {mergedSnapshot && (
          <>
            <QuickStats mergedSnapshot={mergedSnapshot} sessionSnapshots={sessionSnapshots} />

            <div className="session-panel">
              <span className="session-panel-label">Sources</span>
              <div className="session-chips">
                {sessionSnapshots.map(snap => (
                  <div
                    key={snap.id}
                    className={`session-chip ${snap.id === primarySnapshotId ? 'session-chip-primary' : ''}`}
                  >
                    <span className="session-chip-name" title={snap.name}>
                      {snap.name.split(' —')[0].trim().slice(0, 24)}
                    </span>
                    {sessionSnapshots.length > 1 && (
                      snap.id === primarySnapshotId
                        ? <span className="session-chip-badge">schema</span>
                        : <button
                            className="session-chip-set-primary"
                            onClick={() => setAsPrimary(snap.id)}
                            title="Use as schema reference"
                          >set schema</button>
                    )}
                    {sessionSnapshots.length > 1 && (
                      <button
                        className="session-chip-remove"
                        onClick={() => removeFromSession(snap.id)}
                        aria-label="Remove from session"
                      >×</button>
                    )}
                  </div>
                ))}
              </div>

              <div className="session-add-wrap" ref={pickerRef}>
                <button
                  className="btn btn-ghost btn-sm session-add-btn"
                  onClick={() => setPickerOpen(v => !v)}
                >
                  + Add Source
                </button>
                {pickerOpen && (
                  <div className="session-picker">
                    {availableToAdd.length === 0
                      ? <p className="session-picker-empty">No other snapshots available</p>
                      : availableToAdd.map(snap => (
                          <button
                            key={snap.id}
                            className="session-picker-item"
                            onClick={() => handleAddSnapshot(snap)}
                          >
                            <span className="session-picker-name">{snap.name.split(' —')[0].trim()}</span>
                            <span className="session-picker-type">{snap.source_type}</span>
                          </button>
                        ))
                    }
                  </div>
                )}
              </div>
            </div>

            <nav className="explorer-tabs" aria-label="Explorer tabs">
              {TABS.map((tab, i) => (
                <button
                  key={tab.id}
                  className={`explorer-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  title={`${tab.fullLabel} (press ${i + 1})`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="explorer-content">
              {activeTab === 'Schema' && <SchemaBrowser />}
              {activeTab === 'Map'    && <RelationshipMap />}
              {activeTab === 'Health' && <DataHealth />}
              {activeTab === 'AI'     && <AiQuery />}
              {activeTab === 'Diff'   && <SnapshotDiff />}
              {activeTab === 'Audit'  && <AuditLog />}
              {activeTab === 'Query'  && <SqlQueryRunner />}
            </div>
          </>
        )}
      </main>
    </>
  );
}
