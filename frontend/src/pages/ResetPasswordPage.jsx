import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import client from '../api/api-client';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!token) {
    return (
      <div className="auth-shell">
        <div className="auth-form-panel" style={{ flex: 1 }}>
          <div className="auth-card">
            <h1>Invalid link</h1>
            <p className="auth-subtitle">This reset link is missing a token.</p>
            <p className="auth-footer"><Link to="/forgot-password">Request a new link</Link></p>
          </div>
        </div>
      </div>
    );
  }

  const mismatch = confirm && password !== confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mismatch) return;
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await client.post('/api/auth/reset-password', { token, password });
      navigate('/login?reset=1');
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed — the link may have expired');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-visual">
        <div className="auth-visual-content">
          <div className="auth-visual-logo">
            <div className="auth-visual-logo-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <span className="auth-visual-name">DataLens</span>
          </div>
          <p className="auth-visual-tagline">Choose a strong password — at least 8 characters.</p>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-card">
          <h1>Set new password</h1>
          <p className="auth-subtitle">Enter and confirm your new password below.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="password">New password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Repeat password"
                style={mismatch ? { borderColor: 'var(--color-danger)' } : {}}
              />
              {mismatch && (
                <span style={{ fontSize: '0.8rem', color: 'var(--color-danger)' }}>Passwords don't match</span>
              )}
            </div>
            {error && <div className="alert alert-error" role="alert">{error}</div>}
            <button
              className="btn btn-primary auth-submit"
              type="submit"
              disabled={loading || !password || !confirm || mismatch}
            >
              {loading ? 'Updating…' : 'Reset Password'}
            </button>
          </form>

          <p className="auth-footer"><Link to="/login">Back to Sign In</Link></p>
        </div>
      </div>
    </div>
  );
}
