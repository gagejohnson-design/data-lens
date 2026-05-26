import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/common/NavBar';
import InfoModal from '../components/common/InfoModal';
import FileUploadForm from '../components/connection/FileUploadForm';
import SnapshotManager from '../components/connection/SnapshotManager';
import { uploadFiles } from '../api/connections';
import { saveSnapshot } from '../api/snapshots';
import { useSnapshot } from '../context/SnapshotContext';

export default function ConnectionHubPage() {
  const { loadSnapshot } = useSnapshot();
  const navigate = useNavigate();
  const [limitError, setLimitError] = useState(null);
  const [pendingData, setPendingData] = useState(null); // { data, defaultName }
  const [snapshotName, setSnapshotName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handleSave = async () => {
    if (!pendingData || !snapshotName.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { data: snapshot } = await saveSnapshot({
        name: snapshotName.trim(),
        description: description.trim() || undefined,
        source_type: pendingData.data.source_type,
        snapshot_data: pendingData.data,
      });
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
            body="Upload one or more CSV, JSON, or Excel files. Drop multiple files at once to combine them into a single snapshot. Each Excel sheet becomes its own table."
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

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title">
            <span>Upload Files</span>
            <InfoModal
              title="Upload Files"
              body="Drop one or multiple CSV, JSON, or Excel files. Multi-file drops are combined into one snapshot — great for loading related tables together."
            />
          </div>

          {!pendingData ? (
            <FileUploadForm onUpload={handleFileUpload} />
          ) : (
            <div className="save-form">
              <div className="save-form-preview">
                <span className="save-form-tables">
                  {pendingData.data.tables?.length} table{pendingData.data.tables?.length !== 1 ? 's' : ''} parsed
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
          )}
        </div>

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
