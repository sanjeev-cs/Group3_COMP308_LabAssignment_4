import jwt from 'jsonwebtoken';
import config from './config.js';

export const signAuthToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      username: user.username,
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: '7d' },
  );

export const getTokenFromHeaders = (headers = {}) => {
  const authorizationHeader = headers.authorization ?? headers.Authorization;

  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.slice(7).trim();
};

export const resolveAuthenticatedUser = (headers = {}) => {
  const token = getTokenFromHeaders(headers);

  if (!token) {
    return null;
  }

  try {
    const decodedToken = jwt.verify(token, config.jwtSecret);
    return {
      id: decodedToken.sub,
      username: decodedToken.username,
      role: decodedToken.role,
    };
  } catch {
    return null;
  }
};

export const requireAuthentication = (authUser) => {
  if (!authUser?.id) {
    throw new Error('Authentication required.');
  }
};

export const requireAdministrator = (authUser) => {
  requireAuthentication(authUser);

  if (authUser.role !== 'admin') {
    throw new Error('Administrator access required.');
  }
};
