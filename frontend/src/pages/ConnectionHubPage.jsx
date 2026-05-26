import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/common/NavBar';
import InfoModal from '../components/common/InfoModal';
import FileUploadForm from '../components/connection/FileUploadForm';
import SnapshotManager from '../components/connection/SnapshotManager';
import { uploadFile } from '../api/connections';
import { saveSnapshot } from '../api/snapshots';
import { useSnapshot } from '../context/SnapshotContext';

export default function ConnectionHubPage() {
  const { loadSnapshot } = useSnapshot();
  const navigate = useNavigate();
  const [limitError, setLimitError] = useState(null);

  const handleSave = async (data, name, sourceType) => {
    try {
      const { data: snapshot } = await saveSnapshot({ name, source_type: sourceType, snapshot_data: data });
      loadSnapshot(snapshot);
      navigate('/explorer');
    } catch (err) {
      if (err.response?.status === 409 && err.response.data?.oldest) {
        setLimitError(err.response.data);
      } else {
        throw err;
      }
    }
  };

  const handleFileUpload = async (file) => {
    const { data } = await uploadFile(file);
    await handleSave(data, `${file.name} — ${new Date().toLocaleString()}`, data.source_type);
  };

  return (
    <>
      <NavBar />
      <main className="page">
        <div className="page-header">
          <h1>Upload Data</h1>
          <InfoModal
            title="Upload Data"
            body="Upload a CSV, JSON, or Excel file to snapshot your data schema and health. Files are parsed once in memory — nothing is stored on disk."
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
            <span>Upload a File</span>
            <InfoModal
              title="Upload a File"
              body="Drag and drop a CSV, JSON, or Excel file. Each sheet in an Excel file becomes its own table. Max 10 MB."
            />
          </div>
          <FileUploadForm onUpload={handleFileUpload} />
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
