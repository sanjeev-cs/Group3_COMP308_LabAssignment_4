import GameProgress from '../../shared/models/GameProgress.js';
import User from '../../shared/models/User.js';
import {
  requireAdministrator,
  requireAuthentication,
} from '../../shared/auth.js';

const leaderboardSort = {
  score: -1,
  experiencePoints: -1,
  level: -1,
  updatedAt: 1,
};

const getPlayerUserIds = async () => User.find({ role: 'player' }).distinct('_id');

const getPlayerLeaderboardFilter = async () => ({
  userId: {
    $in: await getPlayerUserIds(),
  },
});

const synchronizeLeaderboardRanks = async () => {
  const playerUserIds = await getPlayerUserIds();

  await GameProgress.updateMany(
    {
      userId: {
        $nin: playerUserIds,
      },
    },
    {
      rank: null,
    },
  );

  const rankedEntries = await GameProgress.find({
    userId: {
      $in: playerUserIds,
    },
  }).sort(leaderboardSort);

  const updates = rankedEntries
    .map((entry, index) => {
      const calculatedRank = index + 1;

      if (entry.rank === calculatedRank) {
        return null;
      }

      entry.rank = calculatedRank;
      return entry.save();
    })
    .filter(Boolean);

  if (updates.length > 0) {
    await Promise.all(updates);
  }
};

const getPopulatedProgressById = (progressId) =>
  GameProgress.findById(progressId).populate('userId');

const ensureUserExists = async (userId) => {
  const userExists = await User.exists({ _id: userId });

  if (!userExists) {
    throw new Error('The linked user record was not found.');
  }
};

const ensureProgressForUser = async (userId) => {
  let progressEntry = await GameProgress.findOne({ userId }).populate('userId');

  if (progressEntry) {
    return progressEntry;
  }

  await ensureUserExists(userId);
  const createdProgress = await GameProgress.create({ userId });
  await synchronizeLeaderboardRanks();
  progressEntry = await getPopulatedProgressById(createdProgress._id);
  return progressEntry;
};

const resolvers = {
  Query: {
    leaderboard: async (_parent, { limit }) => {
      await synchronizeLeaderboardRanks();
      const playerLeaderboardFilter = await getPlayerLeaderboardFilter();

      return GameProgress.find(playerLeaderboardFilter)
        .sort(leaderboardSort)
        .limit(limit)
        .populate('userId');
    },
    myProgress: async (_parent, _args, { authUser }) => {
      requireAuthentication(authUser);
      return ensureProgressForUser(authUser.id);
    },
    progressByUser: async (_parent, { userId }) => {
      await synchronizeLeaderboardRanks();
      return GameProgress.findOne({ userId }).populate('userId');
    },
  },
  Mutation: {
    initializeMyProgress: async (_parent, _args, { authUser }) => {
      requireAuthentication(authUser);
      await synchronizeLeaderboardRanks();
      return ensureProgressForUser(authUser.id);
    },
    updateMyProgress: async (_parent, { input }, { authUser }) => {
      requireAuthentication(authUser);

      const progressEntry = await ensureProgressForUser(authUser.id);

      progressEntry.level = Math.max(1, progressEntry.level + (input.levelDelta ?? 0));
      progressEntry.experiencePoints = Math.max(
        0,
        progressEntry.experiencePoints + (input.experiencePointsDelta ?? 0),
      );
      progressEntry.score = Math.max(0, progressEntry.score + (input.scoreDelta ?? 0));

      if (input.progress?.trim()) {
        progressEntry.progress = input.progress.trim();
      }

      if (input.achievement?.trim()) {
        const achievementName = input.achievement.trim();
        const achievementSet = new Set(progressEntry.achievements);
        achievementSet.add(achievementName);
        progressEntry.achievements = [...achievementSet];
      }

      progressEntry.lastPlayed = new Date();

      await progressEntry.save();
      await synchronizeLeaderboardRanks();

      return getPopulatedProgressById(progressEntry._id);
    },
    resetMyProgress: async (_parent, _args, { authUser }) => {
      requireAuthentication(authUser);

      const progressEntry = await ensureProgressForUser(authUser.id);

      progressEntry.level = 1;
      progressEntry.experiencePoints = 0;
      progressEntry.score = 0;
      progressEntry.rank = null;
      progressEntry.achievements = [];
      progressEntry.progress = 'Not started';
      progressEntry.lastPlayed = new Date();

      await progressEntry.save();
      await synchronizeLeaderboardRanks();

      return getPopulatedProgressById(progressEntry._id);
    },
    removePlayer: async (_parent, { userId }, { authUser }) => {
      requireAdministrator(authUser);

      const player = await User.findById(userId);

      if (!player) {
        throw new Error('The selected player was not found.');
      }

      if (player.role !== 'player') {
        throw new Error('Only player accounts can be removed from this panel.');
      }

      await GameProgress.deleteOne({ userId: player._id });
      await User.deleteOne({ _id: player._id });
      await synchronizeLeaderboardRanks();

      return {
        success: true,
        removedUserId: player._id.toString(),
        removedUsername: player.username,
      };
    },
  },
  GameProgress: {
    id: (progressEntry) => progressEntry._id.toString(),
    userId: (progressEntry) =>
      progressEntry.userId?._id?.toString?.() ?? progressEntry.userId.toString(),
    user: async (progressEntry) =>
      progressEntry.userId?._id ? progressEntry.userId : User.findById(progressEntry.userId),
    lastPlayed: (progressEntry) => progressEntry.lastPlayed.toISOString(),
    updatedAt: (progressEntry) => progressEntry.updatedAt.toISOString(),
  },
  ProgressUser: {
    id: (user) => user._id.toString(),
  },
};

export default resolvers;
