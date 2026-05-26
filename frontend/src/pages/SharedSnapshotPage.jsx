import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/api-client';
import SchemaBrowser from '../components/explorer/SchemaBrowser';
import RelationshipMap from '../components/explorer/RelationshipMap';
import DataHealth from '../components/explorer/DataHealth';
import { useSnapshot } from '../context/SnapshotContext';

const TABS = [
  { id: 'Schema', label: 'Schema Browser' },
  { id: 'Map',    label: 'Relationship Map' },
  { id: 'Health', label: 'Data Health' },
];

export default function SharedSnapshotPage() {
  const { token } = useParams();
  const { loadSnapshot } = useSnapshot();
  const [activeTab, setActiveTab] = useState('Schema');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    client.get(`/api/share/${token}`)
      .then(({ data }) => {
        setSnapshot(data);
        loadSnapshot(data);
      })
      .catch(() => setError('This shared link is invalid or has been revoked.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="auth-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading shared snapshot…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <p style={{ color: 'var(--color-danger)' }}>{error}</p>
        <Link to="/login" className="btn btn-primary">Sign in to DataLens</Link>
      </div>
    );
  }

  return (
    <main className="page">
      <div className="page-header">
        <div className="explorer-heading">
          <h1>Shared Snapshot</h1>
          <span className="explorer-snapshot-name">{snapshot?.name}</span>
        </div>
        <Link to="/login" className="btn btn-primary btn-sm">Sign in to DataLens</Link>
      </div>

      <nav className="explorer-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`explorer-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="explorer-content">
        {activeTab === 'Schema' && <SchemaBrowser />}
        {activeTab === 'Map'    && <RelationshipMap />}
        {activeTab === 'Health' && <DataHealth />}
      </div>
    </main>
  );
}
