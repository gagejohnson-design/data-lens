import { useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/api-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetLink, setResetLink] = useState(null); // shown in dev when no email service
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await client.post('/api/auth/forgot-password', { email });
      setSent(true);
      if (data.resetLink) setResetLink(data.resetLink); // dev mode only
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
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
          <p className="auth-visual-tagline">
            We'll send you a link to reset your password.
          </p>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-card">
          {sent ? (
            <>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📬</div>
              <h1>Check your email</h1>
              <p className="auth-subtitle">
                If an account exists for <strong>{email}</strong>, we sent a reset link.
              </p>
              {resetLink && (
                <div className="alert alert-success" style={{ marginTop: '1.25rem', wordBreak: 'break-all', fontSize: '0.8rem' }}>
                  <strong>Dev mode — no email configured.</strong><br />
                  <a href={resetLink} style={{ color: 'inherit' }}>{resetLink}</a>
                </div>
              )}
              <p className="auth-footer" style={{ marginTop: '1.5rem' }}>
                <Link to="/login">Back to Sign In</Link>
              </p>
            </>
          ) : (
            <>
              <h1>Forgot password?</h1>
              <p className="auth-subtitle">Enter your email and we'll send you a reset link.</p>

              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    autoFocus
                  />
                </div>
                {error && <div className="alert alert-error" role="alert">{error}</div>}
                <button className="btn btn-primary auth-submit" type="submit" disabled={loading || !email.trim()}>
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>

              <p className="auth-footer">
                Remember it? <Link to="/login">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
