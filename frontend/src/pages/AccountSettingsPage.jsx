import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/common/NavBar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { updateMe, updatePassword, deleteAccount } from '../api/users';

export default function AccountSettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const notify = (msg, isError = false) => {
    toast(msg, isError ? 'error' : 'success');
    // Keep inline alerts for accessibility too
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
            <h2 className="card-section-title">App Preferences</h2>
            <p className="settings-desc">Reset the onboarding tour to see the welcome walkthrough again.</p>
            <button
              className="btn btn-secondary"
              style={{ marginTop: '0.5rem' }}
              onClick={() => {
                localStorage.removeItem('datalens_toured');
                notify('Tour will show on next page load');
              }}
            >
              Reset Onboarding Tour
            </button>
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
