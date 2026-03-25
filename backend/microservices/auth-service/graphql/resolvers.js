import User from '../../shared/models/User.js';
import { requireAuthentication, signAuthToken } from '../../shared/auth.js';

const findUserByIdentifier = (identifier) =>
  User.findOne({
    $or: [{ username: identifier }, { email: identifier }],
  });

const resolvers = {
  Query: {
    me: async (_parent, _args, { authUser }) => {
      if (!authUser?.id) {
        return null;
      }

      return User.findById(authUser.id);
    },
  },
  Mutation: {
    signup: async (_parent, { username, email, password }) => {
      const normalizedUsername = username.trim().toLowerCase();
      const normalizedEmail = email.trim().toLowerCase();

      const existingUser = await User.findOne({
        $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
      });

      if (existingUser) {
        throw new Error('A user with that username or email already exists.');
      }

      const user = await User.create({
        username: normalizedUsername,
        email: normalizedEmail,
        password,
      });

      return {
        token: signAuthToken(user),
        user,
      };
    },
    login: async (_parent, { identifier, password }) => {
      const normalizedIdentifier = identifier.trim().toLowerCase();
      const user = await findUserByIdentifier(normalizedIdentifier);

      if (!user) {
        throw new Error('Invalid username/email or password.');
      }

      const passwordMatches = await user.comparePassword(password);

      if (!passwordMatches) {
        throw new Error('Invalid username/email or password.');
      }

      return {
        token: signAuthToken(user),
        user,
      };
    },
    logout: async (_parent, _args, { authUser }) => {
      if (authUser?.id) {
        requireAuthentication(authUser);
      }

      return {
        success: true,
        message: 'Session cleared on the client.',
      };
    },
  },
  User: {
    id: (user) => user._id.toString(),
    createdAt: (user) => user.createdAt.toISOString(),
  },
};

export default resolvers;
