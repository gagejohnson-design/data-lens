import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/common/NavBar';
import InfoModal from '../components/common/InfoModal';
import FileUploadForm from '../components/connection/FileUploadForm';
import SnapshotManager from '../components/connection/SnapshotManager';
import { uploadFiles, connectDb } from '../api/connections';
import { saveSnapshot } from '../api/snapshots';
import { useSnapshot } from '../context/SnapshotContext';

const SOURCE_PLACEHOLDERS = {
  postgres: 'postgresql://user:password@host:5432/dbname',
  mysql: 'mysql://user:password@host:3306/dbname',
};

export default function ConnectionHubPage() {
  const { loadSnapshot } = useSnapshot();
  const navigate = useNavigate();
  const [limitError, setLimitError] = useState(null);
  const [pendingData, setPendingData] = useState(null); // { data, defaultName, connection? }
  const [snapshotName, setSnapshotName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // DB connect form state
  const [dbPanel, setDbPanel] = useState(false);
  const [dbType, setDbType] = useState('postgres');
  const [connStr, setConnStr] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connError, setConnError] = useState(null);

  const handleSave = async () => {
    if (!pendingData || !snapshotName.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        name: snapshotName.trim(),
        description: description.trim() || undefined,
        source_type: pendingData.data.source_type,
        snapshot_data: pendingData.data,
      };
      if (pendingData.connection) {
        payload.connection_string_enc = pendingData.connection.enc;
        payload.connection_iv = pendingData.connection.iv;
      }
      const { data: snapshot } = await saveSnapshot(payload);
      loadSnapshot(snapshot);
      navigate('/explorer');
    } catch (err) {
      if (err.response?.status === 409 && err.response.data?.oldest) {
        setLimitError(err.response.data);
      } else {
        setSaveError(err.response?.data?.error || 'Save failed');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (files) => {
    const { data } = await uploadFiles(files);
    const defaultName = files.length === 1
      ? `${files[0].name} — ${new Date().toLocaleString()}`
      : `${files.length} files — ${new Date().toLocaleString()}`;
    setPendingData({ data, defaultName });
    setSnapshotName(defaultName);
    setDescription('');
    setSaveError(null);
  };

  const handleDbConnect = async (e) => {
    e.preventDefault();
    if (!connStr.trim()) return;
    setConnecting(true);
    setConnError(null);
    try {
      const { data } = await connectDb(connStr.trim());
      const defaultName = `${data.connection?.name || connStr.replace(/:[^@]+@/, ':***@')} — ${new Date().toLocaleString()}`;
      // Strip the connection object so enc/iv don't end up in snapshot_data JSONB
      const { connection, ...snapshotPayload } = data;
      setPendingData({ data: snapshotPayload, defaultName, connection });
      setSnapshotName(defaultName);
      setDescription('');
      setSaveError(null);
      setDbPanel(false);
      setConnStr('');
    } catch (err) {
      setConnError(err.response?.data?.error || 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const handleCancel = () => {
    setPendingData(null);
    setSnapshotName('');
    setDescription('');
    setSaveError(null);
  };

  return (
    <>
      <NavBar />
      <main className="page">
        <div className="page-header">
          <h1>Upload Data</h1>
          <InfoModal
            title="Upload Data"
            body="Upload CSV, JSON, or Excel files — or connect directly to a PostgreSQL or MySQL database."
          />
        </div>

        {limitError && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
            Snapshot limit reached (10 max). Export or delete "{limitError.oldest?.name}" to make room.
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: '0.5rem' }} onClick={() => setLimitError(null)}>
              Dismiss
            </button>
          </div>
        )}

        {/* Save form — shown after a successful file upload or DB connection */}
        {pendingData && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-title">
              <span>Save Snapshot</span>
            </div>
            <div className="save-form">
              <div className="save-form-preview">
                <span className="save-form-tables">
                  {pendingData.data.tables?.length} table{pendingData.data.tables?.length !== 1 ? 's' : ''} found
                </span>
                <span className="save-form-type">{pendingData.data.source_type}</span>
              </div>
              <div className="field">
                <label htmlFor="snap-name">Snapshot name</label>
                <input
                  id="snap-name"
                  type="text"
                  value={snapshotName}
                  onChange={e => setSnapshotName(e.target.value)}
                  placeholder="My dataset"
                  autoFocus
                />
              </div>
              <div className="field">
                <label htmlFor="snap-desc">Description <span style={{ color: 'var(--color-text-dim)', fontWeight: 400 }}>(optional)</span></label>
                <input
                  id="snap-desc"
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What is this data?"
                />
              </div>
              {saveError && <div className="alert alert-error">{saveError}</div>}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={!snapshotName.trim() || saving}>
                  {saving ? 'Saving…' : 'Save Snapshot'}
                </button>
                <button className="btn btn-ghost" onClick={handleCancel}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* File upload card */}
        {!pendingData && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-title">
              <span>Upload Files</span>
              <InfoModal
                title="Upload Files"
                body="Drop one or multiple CSV, JSON, or Excel files. Multi-file drops are combined into one snapshot — great for loading related tables together."
              />
            </div>
            <FileUploadForm onUpload={handleFileUpload} />
          </div>
        )}

        {/* DB connection card */}
        {!pendingData && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-title">
              <span>Connect to Database</span>
              <InfoModal
                title="Connect to Database"
                body="Connect directly to a PostgreSQL or MySQL database. DataLens pulls the schema via information_schema and encrypts your connection string at rest."
              />
            </div>

            {!dbPanel ? (
              <button className="btn btn-secondary" onClick={() => setDbPanel(true)}>
                Connect Database
              </button>
            ) : (
              <form className="save-form" onSubmit={handleDbConnect}>
                <div className="field">
                  <label htmlFor="db-type">Database type</label>
                  <select
                    id="db-type"
                    value={dbType}
                    onChange={e => { setDbType(e.target.value); setConnStr(''); setConnError(null); }}
                    style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.875rem' }}
                  >
                    <option value="postgres">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="conn-str">Connection string</label>
                  <input
                    id="conn-str"
                    type="password"
                    value={connStr}
                    onChange={e => { setConnStr(e.target.value); setConnError(null); }}
                    placeholder={SOURCE_PLACEHOLDERS[dbType]}
                    autoComplete="off"
                    autoFocus
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '0.25rem', display: 'block' }}>
                    Your connection string is encrypted at rest and never exposed in API responses.
                  </span>
                </div>
                {connError && <div className="alert alert-error">{connError}</div>}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary" type="submit" disabled={!connStr.trim() || connecting}>
                    {connecting ? 'Connecting…' : 'Test & Connect'}
                  </button>
                  <button className="btn btn-ghost" type="button" onClick={() => { setDbPanel(false); setConnStr(''); setConnError(null); }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="card">
          <div className="card-title">
            <span>Saved Snapshots</span>
            <InfoModal
              title="Saved Snapshots"
              body="Your last 10 snapshots are saved here. Load one to explore it, rename it, share it, export it as JSON, or delete it."
            />
          </div>
          <SnapshotManager />
        </div>
      </main>
    </>
  );
}
