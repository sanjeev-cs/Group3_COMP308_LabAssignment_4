export const SESSION_STORAGE_KEY = 'game-progress.session';
export const SESSION_EVENT_NAME = 'game-progress.session.changed';

const emptySession = {
  token: '',
  user: null,
};

const isBrowser = () => typeof window !== 'undefined';

export const readStoredSession = () => {
  if (!isBrowser()) {
    return emptySession;
  }

  const serializedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (!serializedSession) {
    return emptySession;
  }

  try {
    const parsedSession = JSON.parse(serializedSession);

    if (!parsedSession?.token || !parsedSession?.user) {
      return emptySession;
    }

    return parsedSession;
  } catch {
    return emptySession;
  }
};

export const dispatchSessionChange = (session) => {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(SESSION_EVENT_NAME, {
      detail: session,
    }),
  );
};

export const writeStoredSession = (session) => {
  if (!isBrowser()) {
    return;
  }

  if (!session?.token || !session?.user) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    dispatchSessionChange(emptySession);
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  dispatchSessionChange(session);
};

export const clearStoredSession = () => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  dispatchSessionChange(emptySession);
};

export const getSessionToken = () => readStoredSession().token;
export const getCurrentSession = () => readStoredSession();
