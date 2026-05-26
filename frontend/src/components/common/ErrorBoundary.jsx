import { Component } from 'react';
import { Link } from 'react-router-dom';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        textAlign: 'center',
        gap: '1rem',
        fontFamily: 'var(--font)',
        color: 'var(--color-text)',
        background: 'var(--color-bg)',
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Something went wrong</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', maxWidth: 400 }}>
          {this.state.error?.message || 'An unexpected error occurred.'}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => this.setState({ error: null })}
          >
            Try Again
          </button>
          <Link to="/" className="btn btn-ghost">Go Home</Link>
        </div>
        <details style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)', maxWidth: 600, textAlign: 'left', marginTop: '0.5rem' }}>
          <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>Stack trace</summary>
          <pre style={{ overflow: 'auto', fontFamily: 'var(--mono)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {this.state.error?.stack}
          </pre>
        </details>
      </div>
    );
  }
}
