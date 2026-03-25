import { Navigate } from 'react-router-dom';
import { useSession } from '../context/SessionProvider.jsx';

const resolvePanelPath = (user) => (user?.role === 'admin' ? '/admin' : '/player');

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { isAuthenticated, user } = useSession();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(user?.role)) {
    return <Navigate to={resolvePanelPath(user)} replace />;
  }

  return children;
};

export default ProtectedRoute;
