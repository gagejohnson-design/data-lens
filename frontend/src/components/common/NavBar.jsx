import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSnapshot } from '../../context/SnapshotContext';
import { useTheme } from '../../utils/useTheme';

export default function NavBar() {
  const { user, logout } = useAuth();
  const { activeSnapshot, clearSnapshot } = useSnapshot();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggle } = useTheme();

  const handleLogout = async () => {
    await logout();
    clearSnapshot();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;
  const initial = user?.name?.charAt(0).toUpperCase() || '?';

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12"/>
            <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
          </svg>
          DataLens
        </Link>

        {user && (
          <div className="navbar-links">
            <Link to="/hub" className={`nav-link ${isActive('/hub') ? 'active' : ''}`}>Hub</Link>
            <Link to="/explorer" className={`nav-link ${isActive('/explorer') ? 'active' : ''}`}>
              Explorer
              {activeSnapshot && (
                <span className="nav-dot" title={`Loaded: ${activeSnapshot.name}`} />
              )}
            </Link>
            <Link to="/settings" className={`nav-link ${isActive('/settings') ? 'active' : ''}`}>Settings</Link>
          </div>
        )}

        {user && (
          <div className="navbar-right">
            <button
              className="btn btn-ghost btn-sm theme-toggle"
              onClick={toggle}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀︎' : '☽'}
            </button>
            <div className="navbar-avatar" title={user.name}>{initial}</div>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Log Out</button>
          </div>
        )}
      </div>
    </nav>
  );
}
