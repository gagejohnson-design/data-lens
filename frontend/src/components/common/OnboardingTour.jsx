import { useState, useEffect } from 'react';

const TOURED_KEY = 'datalens_toured';

const STEPS = [
  {
    title: 'Welcome to DataLens',
    body: 'DataLens lets you upload CSV, JSON, or Excel files and instantly explore your schema — no database required. This quick tour shows you what\'s possible.',
    icon: '🔍',
  },
  {
    title: 'Upload & Combine Files',
    body: 'Drop one or more files onto the upload zone. Multiple files are combined into a single snapshot — perfect for uploading related tables together. Each Excel sheet becomes its own table.',
    icon: '📂',
  },
  {
    title: 'Schema Browser',
    body: 'Explore every table and column. Press / to search, use ★ to pin favorite tables, override column types with the dropdown, and copy CREATE TABLE DDL in one click.',
    icon: '🗂️',
  },
  {
    title: 'Relationship Map & AI',
    body: 'The Relationship Map shows FK connections as a live graph. Use "Suggest Relationships" to auto-detect joins. The AI tab lets you ask plain-English questions and get SQL back instantly — powered by Claude.',
    icon: '🤖',
  },
  {
    title: 'Multi-Source Sessions',
    body: 'In the Explorer, click "+ Add Source" to load a second snapshot alongside the first. Tables from both appear together in every tab — great for comparing related datasets.',
    icon: '🔗',
  },
];

export default function OnboardingTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(TOURED_KEY)) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(TOURED_KEY, '1');
    setVisible(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else dismiss();
  };

  const prev = () => setStep(s => Math.max(s - 1, 0));

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <div className="tour-backdrop" onClick={e => { if (e.target === e.currentTarget) dismiss(); }}>
      <div className="tour-modal" role="dialog" aria-modal="true" aria-label="Welcome tour">
        <button className="tour-close" onClick={dismiss} aria-label="Skip tour">✕</button>

        <div className="tour-icon">{current.icon}</div>
        <h2 className="tour-title">{current.title}</h2>
        <p className="tour-body">{current.body}</p>

        <div className="tour-dots">
          {STEPS.map((_, i) => (
            <button
              key={i}
              className={`tour-dot ${i === step ? 'tour-dot-active' : ''}`}
              onClick={() => setStep(i)}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>

        <div className="tour-actions">
          {step > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={prev}>Back</button>
          )}
          <button className="btn btn-primary" onClick={next}>
            {step < STEPS.length - 1 ? 'Next' : 'Get Started'}
          </button>
          {step === 0 && (
            <button className="btn btn-ghost btn-sm" onClick={dismiss}>Skip tour</button>
          )}
        </div>
      </div>
    </div>
  );
}
