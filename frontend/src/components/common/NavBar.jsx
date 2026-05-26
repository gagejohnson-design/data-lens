import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSnapshot } from '../../context/SnapshotContext';

export default function NavBar() {
  const { user, logout } = useAuth();
  const { activeSnapshot, clearSnapshot } = useSnapshot();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    clearSnapshot();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          DataLens
        </Link>

        {user && (
          <div className="navbar-links">
            <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>Hub</Link>
            <Link to="/explorer" className={`nav-link ${isActive('/explorer') ? 'active' : ''}`}>
              Explorer
              {activeSnapshot && <span className="nav-dot" title={activeSnapshot.name} />}
            </Link>
            <Link to="/settings" className={`nav-link ${isActive('/settings') ? 'active' : ''}`}>Settings</Link>
          </div>
        )}

        {user && (
          <div className="navbar-right">
            <span className="navbar-user">{user.name}</span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Log Out</button>
          </div>
        )}
      </div>
    </nav>
  );
}
