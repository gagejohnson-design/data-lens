import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/common/NavBar';
import { useAuth } from '../context/AuthContext';
import { updateMe, updatePassword, deleteAccount, getAiKeyStatus, saveAiKey } from '../api/users';

export default function AccountSettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const [aiKey, setAiKey] = useState('');
  const [hasAiKey, setHasAiKey] = useState(false);

  useEffect(() => {
    getAiKeyStatus().then(({ data }) => setHasAiKey(data.hasKey)).catch(() => {});
  }, []);

  const notify = (msg, isError = false) => {
    if (isError) { setError(msg); setMessage(null); }
    else { setMessage(msg); setError(null); }
    setTimeout(() => { setError(null); setMessage(null); }, 4000);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateMe({ name, email });
      notify('Profile updated');
    } catch (err) {
      notify(err.response?.data?.error || 'Update failed', true);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    try {
      await updatePassword(currentPassword, newPassword);
      notify('Password updated');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      notify(err.response?.data?.error || 'Password update failed', true);
    }
  };

  const handleAiKeySave = async (e) => {
    e.preventDefault();
    if (!aiKey.trim()) return;
    try {
      const { data } = await saveAiKey(aiKey.trim());
      setHasAiKey(data.hasKey);
      setAiKey('');
      notify('API key saved');
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to save key', true);
    }
  };

  const handleAiKeyClear = async () => {
    if (!window.confirm('Remove your Gemini API key? AI queries will stop working until you add a new one.')) return;
    try {
      await saveAiKey(null);
      setHasAiKey(false);
      notify('API key removed');
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to remove key', true);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete your account and all saved snapshots? This cannot be undone.')) return;
    try {
      await deleteAccount();
      await logout();
      navigate('/login');
    } catch (err) {
      notify(err.response?.data?.error || 'Delete failed', true);
    }
  };

  return (
    <>
      <NavBar />
      <main className="page settings-page">
        <div className="page-header">
          <h1>Account Settings</h1>
        </div>

        {message && <div className="alert alert-success" role="status" style={{ marginBottom: '1.5rem' }}>{message}</div>}
        {error && <div className="alert alert-error" role="alert" style={{ marginBottom: '1.5rem' }}>{error}</div>}

        <div className="settings-grid">
          <div className="card">
            <h2 className="card-section-title">Profile</h2>
            <form className="settings-form" onSubmit={handleProfileUpdate}>
              <div className="field">
                <label htmlFor="name">Name</label>
                <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <button className="btn btn-primary" type="submit">Save Changes</button>
            </form>
          </div>

          <div className="card">
            <h2 className="card-section-title">Change Password</h2>
            <form className="settings-form" onSubmit={handlePasswordUpdate}>
              <div className="field">
                <label htmlFor="current-pass">Current password</label>
                <input id="current-pass" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
              </div>
              <div className="field">
                <label htmlFor="new-pass">New password</label>
                <input id="new-pass" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
              </div>
              <button className="btn btn-primary" type="submit">Update Password</button>
            </form>
          </div>

          <div className="card">
            <h2 className="card-section-title">AI Integration</h2>
            <p className="settings-desc">
              DataLens uses Google Gemini to generate SQL from plain-English questions.
              Get a free API key from{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
                Google AI Studio
              </a>.
            </p>
            {hasAiKey && (
              <p className="settings-key-status">API key configured</p>
            )}
            <form className="settings-form" onSubmit={handleAiKeySave} style={{ marginTop: '1rem' }}>
              <div className="field">
                <label htmlFor="ai-key">
                  {hasAiKey ? 'Replace API Key' : 'Gemini API Key'}
                </label>
                <input
                  id="ai-key"
                  type="password"
                  value={aiKey}
                  onChange={(e) => setAiKey(e.target.value)}
                  placeholder="AIza..."
                  autoComplete="off"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" type="submit" disabled={!aiKey.trim()}>
                  Save Key
                </button>
                {hasAiKey && (
                  <button className="btn btn-ghost" type="button" onClick={handleAiKeyClear}>
                    Remove Key
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="card danger-zone">
            <h2 className="card-section-title danger-title">Danger Zone</h2>
            <p className="danger-desc">Permanently delete your account and all saved snapshots. This action cannot be undone.</p>
            <button className="btn btn-danger" onClick={handleDeleteAccount}>Delete Account</button>
          </div>
        </div>
      </main>
    </>
  );
}
