import { createContext, useContext, useEffect, useState } from 'react';
import {
  SESSION_EVENT_NAME,
  SESSION_STORAGE_KEY,
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from '../../../shared/session/sessionStorage.js';

const SessionContext = createContext({
  token: '',
  user: null,
  isAuthenticated: false,
  setSession: () => {},
  clearSession: () => {},
});

export const SessionProvider = ({ children }) => {
  const [session, setSessionState] = useState(readStoredSession);

  useEffect(() => {
    const syncSession = (nextSession) => {
      setSessionState(nextSession?.detail ?? readStoredSession());
    };

    const handleStorage = (event) => {
      if (event.key && event.key !== SESSION_STORAGE_KEY) {
        return;
      }

      setSessionState(readStoredSession());
    };

    window.addEventListener(SESSION_EVENT_NAME, syncSession);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(SESSION_EVENT_NAME, syncSession);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setSession = (nextSession) => {
    writeStoredSession(nextSession);
    setSessionState(readStoredSession());
  };

  const resetSession = () => {
    clearStoredSession();
    setSessionState(readStoredSession());
  };

  return (
    <SessionContext.Provider
      value={{
        token: session.token,
        user: session.user,
        isAuthenticated: Boolean(session.token && session.user),
        setSession,
        clearSession: resetSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
