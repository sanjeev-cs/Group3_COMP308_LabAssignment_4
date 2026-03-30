import { getCurrentSession } from '../../shared/session/sessionStorage.js';

const hostAppBaseUrl = import.meta.env.VITE_HOST_APP_URL ?? 'http://localhost:5173';
const resolvePanelPath = (user) => (user?.role === 'admin' ? '/admin' : '/player');

const session = getCurrentSession();
const targetPath = session.token && session.user ? resolvePanelPath(session.user) : '/auth';

window.location.replace(new URL(targetPath, hostAppBaseUrl).toString());
