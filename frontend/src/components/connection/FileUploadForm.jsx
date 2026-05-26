import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

export default function FileUploadForm({ onUpload }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'dropzone-active' : ''} ${loading ? 'dropzone-loading' : ''}`}
      >
        <input {...getInputProps()} />
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        {loading
          ? <p>Parsing file…</p>
          : isDragActive
            ? <p>Drop it here</p>
            : <p>Drag & drop a file, or <span className="dropzone-link">browse</span></p>
        }
        <span className="dropzone-hint">CSV, JSON, XLSX — max 10 MB</span>
      </div>
      {error && <div className="alert alert-error" role="alert" style={{ marginTop: '0.75rem' }}>{error}</div>}
    </div>
  );
}
