import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSnapshot } from '../../context/SnapshotContext';
import { queryAi } from '../../api/ai';

const EXAMPLES = [
  'Show me the top 10 customers by total order value',
  'Find all orders placed in the last 30 days',
  'Which products have never been ordered?',
];

const HISTORY_KEY = 'datalens_ai_history';
const MAX_HISTORY = 15;

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
}

function saveHistory(entry) {
  const prev = loadHistory();
  const deduped = prev.filter(h => h.question !== entry.question);
  const updated = [entry, ...deduped].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
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
  const [missingKey, setMissingKey] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState(loadHistory);
  const [showHistory, setShowHistory] = useState(false);

  // Refresh history display when component mounts
  useEffect(() => { setHistory(loadHistory()); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setMissingKey(false);
    setQuotaExceeded(false);
    try {
      const snapshotIds = sessionSnapshots.map(s => s.id);
      const { data } = await queryAi(question, null, snapshotIds);
      setResult(data);
      const updated = saveHistory({ question: data.question, sql: data.sql, ts: Date.now() });
      setHistory(updated);
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.missingKey) setMissingKey(true);
      if (errData?.quotaExceeded) setQuotaExceeded(true);
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

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
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

      {showHistory && history.length > 0 && (
        <div className="ai-history">
          <div className="ai-history-header">
            <span className="ai-history-title">Recent queries</span>
            <button className="btn btn-ghost btn-sm" onClick={clearHistory}>Clear</button>
          </div>
          <ul className="ai-history-list">
            {history.map((h, i) => (
              <li key={i} className="ai-history-item" onClick={() => loadFromHistory(h)}>
                <span className="ai-history-question">{h.question}</span>
                <span className="ai-history-time">{timeAgo(h.ts)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginTop: '1rem' }}>
          {error}
          {missingKey && (
            <> — <Link to="/settings" style={{ color: 'inherit', textDecoration: 'underline' }}>Add your Gemini API key in Settings</Link></>
          )}
          {quotaExceeded && (
            <> — <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>Upgrade at Google AI Studio</a></>
          )}
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
            Run this in your database client. DataLens doesn't store credentials, so it can't execute queries directly.
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
