import GameProgress from '../../shared/models/GameProgress.js';
import GameHint from '../../shared/models/GameHint.js';
import User from '../../shared/models/User.js';
import {
  requireAdministrator,
  requireAuthentication,
} from '../../shared/auth.js';
import {
  askAgent,
  generateHintForLevel,
  resolveAgentSelection,
} from '../ai/agentChain.js';

// ─── Leaderboard Utilities ───────────────────────────────────────────────────

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

// ─── Progress Helpers ────────────────────────────────────────────────────────

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

// ─── Resolvers ───────────────────────────────────────────────────────────────

const resolvers = {
  Query: {
    // ── Existing Queries ──────────────────────────────────────────────────

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

    // ── AI Game Guide Queries ─────────────────────────────────────────────

    /**
     * Main AI chatbot query. Accepts a player question, retrieves relevant
     * game knowledge, and returns a context-aware AI response.
     */
    gameAIQuery: async (_parent, { input, history, provider, model }, { authUser }) => {
      requireAuthentication(authUser);

      // Fetch the authenticated player's current progress for context
      const progress = await GameProgress.findOne({ userId: authUser.id });
      const playerStats = {
        level: progress?.level ?? 1,
        experiencePoints: progress?.experiencePoints ?? 0,
        score: progress?.score ?? 0,
        failCount: progress?.failCount ?? 0,
      };

      const result = await askAgent(input, playerStats, history, {
        provider,
        model,
      });
      return result;
    },

    /**
     * Fetches a player's progress summary for display in the chatbot header.
     */
    playerProgress: async (_parent, { userId }) => {
      const progress = await GameProgress.findOne({ userId }).populate('userId');

      if (!progress) {
        throw new Error('No progress found for this user.');
      }

      return {
        userId: progress.userId?._id?.toString() ?? userId,
        username: progress.userId?.username ?? 'Unknown',
        level: progress.level,
        experiencePoints: progress.experiencePoints,
        score: progress.score,
        failCount: progress.failCount ?? 0,
        achievements: progress.achievements,
      };
    },

    /**
     * Returns an AI-generated hint for a specific game level.
     * Checks MongoDB for a cached hint first; generates and stores a new one if needed.
     */
    gameHint: async (_parent, { level, provider, model }) => {
      const selection = resolveAgentSelection({ provider, model });

      if (selection.error) {
        throw new Error(selection.error);
      }

      const cached = await GameHint.findOne({
        level,
        provider: selection.provider,
        model: selection.model,
      }).sort({ generatedAt: -1 });

      if (cached) {
        return cached.hint;
      }

      const result = await generateHintForLevel(level, selection);

      await GameHint.create({
        level,
        hint: result.hint,
        category: result.category,
        provider: result.provider,
        model: result.model,
        generatedAt: new Date(),
      });

      return result.hint;
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
      progressEntry.failCount = 0;
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

    /**
     * Records a level failure. Increments the failCount so the AI agent
     * can detect repeated failures and proactively suggest easier strategies.
     */
    recordFailure: async (_parent, _args, { authUser }) => {
      requireAuthentication(authUser);

      const progressEntry = await ensureProgressForUser(authUser.id);
      progressEntry.failCount = (progressEntry.failCount ?? 0) + 1;
      progressEntry.lastPlayed = new Date();

      await progressEntry.save();

      return getPopulatedProgressById(progressEntry._id);
    },
  },

  GameProgress: {
    id: (progressEntry) => progressEntry._id.toString(),
    userId: (progressEntry) =>
      progressEntry.userId?._id?.toString?.() ?? progressEntry.userId.toString(),
    user: async (progressEntry) =>
      progressEntry.userId?._id ? progressEntry.userId : User.findById(progressEntry.userId),
    failCount: (progressEntry) => progressEntry.failCount ?? 0,
    lastPlayed: (progressEntry) => progressEntry.lastPlayed.toISOString(),
    updatedAt: (progressEntry) => progressEntry.updatedAt.toISOString(),
  },
  ProgressUser: {
    id: (user) => user._id.toString(),
  },
};

export default resolvers;
