import { useState, useEffect, useCallback } from 'react';
import { useSnapshot } from '../../context/SnapshotContext';
import { queryAi } from '../../api/ai';
import { getSavedQueries, saveQuery, deleteQuery, clearAllQueries } from '../../api/queries';

const EXAMPLES = [
  'Show me the top 10 customers by total order value',
  'Find all orders placed in the last 30 days',
  'Which products have never been ordered?',
];

// localStorage fallback used when backend is unreachable
const LS_KEY = 'datalens_ai_history';

function lsLoad() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AiQuery() {
  const { mergedSnapshot, sessionSnapshots } = useSnapshot();
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data } = await getSavedQueries();
      setHistory(data);
    } catch {
      setHistory(lsLoad());
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const snapshotIds = sessionSnapshots.map(s => s.id);
      const { data } = await queryAi(question, null, snapshotIds);
      setResult(data);

      try {
        const { data: saved } = await saveQuery(data.question, data.sql, snapshotIds);
        setHistory(prev => [saved, ...prev.filter(h => h.question !== data.question)]);
      } catch {
        const entry = { question: data.question, sql: data.sql, created_at: new Date().toISOString() };
        const prev = lsLoad().filter(h => h.question !== entry.question);
        const updated = [entry, ...prev].slice(0, 50);
        localStorage.setItem(LS_KEY, JSON.stringify(updated));
        setHistory(updated);
      }
    } catch (err) {
      const errData = err.response?.data;
      setError(errData?.error || 'Failed to generate query');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result.sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadFromHistory = (entry) => {
    setQuestion(entry.question);
    setResult({ sql: entry.sql, question: entry.question });
    setError(null);
    setShowHistory(false);
  };

  const handleDeleteEntry = async (e, entry) => {
    e.stopPropagation();
    if (entry.id) {
      try { await deleteQuery(entry.id); } catch {}
    }
    setHistory(prev => prev.filter(h => h !== entry));
  };

  const handleClearAll = async () => {
    try { await clearAllQueries(); } catch { localStorage.removeItem(LS_KEY); }
    setHistory([]);
  };

  const tableCount = mergedSnapshot?.snapshot_data?.tables?.length || 0;
  const sourceCount = sessionSnapshots.length;

  return (
    <div className="ai-query">
      <div className="ai-query-header">
        <h2>Ask a Question</h2>
        <p className="ai-query-subtitle">
          Describe what you want to know — DataLens writes the SQL based on your schema.
          {sourceCount > 1 && ` Querying across ${sourceCount} sources (${tableCount} tables).`}
        </p>
      </div>

      <form className="ai-query-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="ai-query-input"
          placeholder="e.g. Show me customers who haven't ordered in 90 days"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
        />
        <button className="btn btn-primary" type="submit" disabled={loading || !question.trim()}>
          {loading ? 'Generating…' : 'Generate SQL'}
        </button>
        {history.length > 0 && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowHistory(v => !v)}
            title="Query history"
          >
            History ({history.length})
          </button>
        )}
      </form>

      {showHistory && (
        <div className="ai-history">
          <div className="ai-history-header">
            <span className="ai-history-title">Recent queries</span>
            <button className="btn btn-ghost btn-sm" onClick={handleClearAll}>Clear all</button>
          </div>
          {historyLoading ? (
            <p className="ai-history-empty">Loading…</p>
          ) : history.length === 0 ? (
            <p className="ai-history-empty">No saved queries yet.</p>
          ) : (
            <ul className="ai-history-list">
              {history.map((h, i) => (
                <li key={h.id || i} className="ai-history-item" onClick={() => loadFromHistory(h)}>
                  <span className="ai-history-question">{h.question}</span>
                  <span className="ai-history-time">{timeAgo(h.created_at || h.ts)}</span>
                  <button
                    className="ai-history-delete"
                    onClick={(e) => handleDeleteEntry(e, h)}
                    title="Remove"
                    aria-label="Remove query"
                  >×</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginTop: '1rem' }}>
          {error}
        </div>
      )}

      {result && (
        <div className="ai-result">
          <div className="ai-result-header">
            <span className="ai-result-label">Generated SQL</span>
            <button className="btn btn-ghost btn-sm" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="ai-result-sql">{result.sql}</pre>
          <p className="ai-result-note">
            Copy this into the <strong>Query</strong> tab to run it against a live database connection, or paste it into your own database client.
          </p>
        </div>
      )}

      {!result && !error && !loading && !showHistory && (
        <div className="ai-examples">
          <p className="ai-examples-label">Try asking:</p>
          <ul>
            {EXAMPLES.map((ex) => (
              <li key={ex} onClick={() => setQuestion(ex)}>
                "{ex}"
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
