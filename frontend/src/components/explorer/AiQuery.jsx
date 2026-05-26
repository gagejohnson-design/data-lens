import { useState } from 'react';
import { useSnapshot } from '../../context/SnapshotContext';
import { queryAi } from '../../api/ai';

const EXAMPLES = [
  'Show me the top 10 customers by total order value',
  'Find all orders placed in the last 30 days',
  'Which products have never been ordered?',
];

export default function AiQuery() {
  const { activeSnapshot } = useSnapshot();
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await queryAi(question, activeSnapshot.id);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate query');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result.sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="ai-query">
      <div className="ai-query-header">
        <h2>Ask a Question</h2>
        <p className="ai-query-subtitle">
          Describe what you want to know — DataLens writes the SQL based on your schema.
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
      </form>

      {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>}

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

      {!result && !error && !loading && (
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
