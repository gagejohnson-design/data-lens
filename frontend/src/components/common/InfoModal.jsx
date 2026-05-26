import { useState, useEffect, useRef } from 'react';

export default function InfoModal({ title, body }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <>
      <button
        className="info-btn"
        onClick={() => setOpen(true)}
        aria-label={`Info: ${title}`}
        type="button"
      >
        ?
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div
            className="modal-box"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            ref={dialogRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{title}</h2>
              <button className="panel-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>
            <p className="modal-body">{body}</p>
          </div>
        </div>
      )}
    </>
  );
}
