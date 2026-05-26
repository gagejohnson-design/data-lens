import { useState } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../components/common/NavBar';
import InfoModal from '../components/common/InfoModal';
import SchemaBrowser from '../components/explorer/SchemaBrowser';
import RelationshipMap from '../components/explorer/RelationshipMap';
import DataHealth from '../components/explorer/DataHealth';
import AuditLog from '../components/explorer/AuditLog';
import AiQuery from '../components/explorer/AiQuery';
import SnapshotDiff from '../components/explorer/SnapshotDiff';
import { useSnapshot } from '../context/SnapshotContext';

const TABS = [
  { id: 'Schema', label: 'Schema Browser' },
  { id: 'Map',    label: 'Relationship Map' },
  { id: 'Health', label: 'Data Health' },
  { id: 'AI',     label: 'Ask AI' },
  { id: 'Diff',   label: 'Compare' },
  { id: 'Audit',  label: 'Audit Log' },
];

const INFO = {
  Schema: 'Browse every table and column in plain English. Click a table to see its columns, types, and null rate bars. Toggle distributions to see top values from sample rows.',
  Map:    'A visual graph of how tables connect via foreign keys. Click any node to see details and add notes.',
  Health: 'Row counts, null rates, and duplicates per table. Green = healthy, yellow = warning, red = needs attention.',
  AI:     'Ask a question in plain English — DataLens writes the SQL query based on your schema. Copy it and run it in your database client.',
  Diff:   'Compare this snapshot to another one to see added/removed tables, column changes, and row count differences over time.',
  Audit:  'A history of your activity — connections, loads, exports, and deletions.',
};

export default function ExplorerPage() {
  const [activeTab, setActiveTab] = useState('Schema');
  const { activeSnapshot } = useSnapshot();

  return (
    <>
      <NavBar />
      <main className="page explorer-page">
        <div className="page-header">
          <div className="explorer-heading">
            <h1>Explorer</h1>
            {activeSnapshot && (
              <span className="explorer-snapshot-name">{activeSnapshot.name}</span>
            )}
          </div>
          <InfoModal
            title={TABS.find((t) => t.id === activeTab)?.label}
            body={INFO[activeTab]}
          />
        </div>

        {!activeSnapshot && (
          <div className="empty-state">
            <p>No snapshot loaded. <Link to="/">Go to Connection Hub</Link> to connect a data source.</p>
          </div>
        )}

        {activeSnapshot && (
          <>
            <nav className="explorer-tabs" aria-label="Explorer tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`explorer-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
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
            </div>
          </>
        )}
      </main>
    </>
  );
}
