import { Link } from 'react-router-dom';

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
      </svg>
    ),
    title: 'Schema Browser',
    desc: 'Explore every table and column. Search, pin favorites, see null rates at a glance, override types, and copy DDL in one click.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
      </svg>
    ),
    title: 'Relationship Map',
    desc: 'Live graph of how tables connect. Auto-detect FK relationships, drag nodes, add your own links, and delete stale ones.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
    title: 'Data Health',
    desc: 'Row counts, null rates, and duplicate detection across every table. Sortable, color-coded, and instantly readable.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".5" fill="currentColor"/>
      </svg>
    ),
    title: 'Ask AI',
    desc: 'Describe what you want in plain English — DataLens writes the SQL based on your actual schema using Claude AI.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
    title: 'Multi-Source Sessions',
    desc: 'Load multiple snapshots side-by-side. Tables from all sources appear together — great for comparing related datasets.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
        <polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
      </svg>
    ),
    title: 'Share & Export',
    desc: 'Share a live snapshot link with anyone — no login required to view. Export schemas as Markdown or data as CSV.',
  },
];

const FORMATS = ['CSV', 'JSON', 'Excel (.xlsx)'];

export default function LandingPage() {
  return (
    <div className="landing">

      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12"/>
              <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
            </svg>
            DataLens
          </div>
          <div className="landing-nav-actions">
            <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-bg" aria-hidden="true" />
        <div className="landing-hero-glow" aria-hidden="true" />
        <div className="landing-hero-content">
          <div className="landing-badge">No database required</div>
          <h1 className="landing-title">
            Explore your data.<br />
            <span className="landing-title-accent">Understand your schema.</span>
          </h1>
          <p className="landing-subtitle">
            Drop a CSV, JSON, or Excel file and instantly browse your schema,
            map relationships, check data health, and generate SQL — all in the browser.
          </p>
          <div className="landing-hero-actions">
            <Link to="/register" className="btn btn-primary landing-cta">
              Get Started Free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
            <Link to="/login" className="btn btn-secondary">Sign In</Link>
          </div>
          <div className="landing-formats">
            <span className="landing-formats-label">Supports</span>
            {FORMATS.map(f => (
              <span key={f} className="landing-format-chip">{f}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-features">
        <div className="landing-section-inner">
          <h2 className="landing-section-title">Everything you need to understand your data</h2>
          <p className="landing-section-sub">No SQL knowledge required. No database connection needed.</p>
          <div className="landing-feature-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="landing-feature-card">
                <div className="landing-feature-icon">{f.icon}</div>
                <h3 className="landing-feature-title">{f.title}</h3>
                <p className="landing-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="landing-cta-strip">
        <div className="landing-section-inner landing-cta-inner">
          <div>
            <h2 className="landing-cta-title">Ready to explore your data?</h2>
            <p className="landing-cta-sub">Free to use. No credit card. No database setup.</p>
          </div>
          <Link to="/register" className="btn btn-primary landing-cta">
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <span>DataLens — built as a capstone project</span>
      </footer>
    </div>
  );
}
