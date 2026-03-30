import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import FederatedMount from './components/FederatedMount.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RemoteBoundary from './components/RemoteBoundary.jsx';
import ShellLayout from './components/ShellLayout.jsx';
import { useSession } from './context/SessionProvider.jsx';

const loadAuthRemote = () =>
  import.meta.env.DEV
    ? import('../../auth/src/mount.jsx')
    : import('authApp/mount');

const loadProgressRemote = () =>
  import.meta.env.DEV
    ? import('../../progress/src/mount.jsx')
    : import('progressApp/mount');

const resolvePanelPath = (user) => (user?.role === 'admin' ? '/admin' : '/player');

const LandingRedirect = () => {
  const { isAuthenticated, user } = useSession();
  return <Navigate replace to={isAuthenticated ? resolvePanelPath(user) : '/auth'} />;
};

const AuthPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSession();

  if (isAuthenticated) {
    return <Navigate replace to={resolvePanelPath(user)} />;
  }

  return (
    <RemoteBoundary label="Authentication">
      <FederatedMount
        label="Authentication"
        loader={loadAuthRemote}
        remoteProps={{
          onAuthenticated: (signedInUser) =>
            navigate(resolvePanelPath(signedInUser), { replace: true }),
        }}
      />
    </RemoteBoundary>
  );
};

const ProgressPage = ({ mode }) => {
  const { token, user } = useSession();

  return (
    <RemoteBoundary label="Game Progress">
      <FederatedMount
        label="Game Progress"
        loader={loadProgressRemote}
        remoteProps={{ mode, token, user }}
      />
    </RemoteBoundary>
  );
};

const App = () => (
  <Routes>
    <Route index element={<LandingRedirect />} />
    <Route path="auth" element={<AuthPage />} />
    <Route element={<ShellLayout />}>
      <Route
        path="player"
        element={
          <ProtectedRoute allowedRoles={['player']}>
            <ProgressPage mode="player" />
          </ProtectedRoute>
        }
      />
      <Route
        path="admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ProgressPage mode="admin" />
          </ProtectedRoute>
        }
      />
    </Route>
    <Route path="*" element={<LandingRedirect />} />
  </Routes>
);

export default App;
