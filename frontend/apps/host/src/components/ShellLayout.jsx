import { Outlet, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionProvider.jsx';

const ShellLayout = () => {
  const { user, clearSession } = useSession();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    navigate('/auth', { replace: true });
  };

  return (
    <div className="shell-frame">
      <header className="shell-header">
        <div>
          <span className="eyebrow">Game Progress Hub</span>
          <h1>{user?.role === 'admin' ? 'Admin Panel' : 'Player Panel'}</h1>
        </div>

        <div className="session-badge">
          <div className="session-badge-copy">
            <strong>{user?.username}</strong>
            <span className="session-role">{user?.role === 'admin' ? 'Administrator' : 'Player'}</span>
          </div>
          <button className="shell-logout-button" onClick={handleLogout} type="button">
            Logout
          </button>
        </div>
      </header>

      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  );
};

export default ShellLayout;
