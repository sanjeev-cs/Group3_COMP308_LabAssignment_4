import { gql } from 'graphql-tag';

const typeDefs = gql`
  type ProgressUser {
    id: ID!
    username: String!
    email: String!
    role: String!
  }

  type GameProgress {
    id: ID!
    userId: ID!
    user: ProgressUser!
    level: Int!
    experiencePoints: Int!
    score: Int!
    rank: Int
    failCount: Int!
    achievements: [String!]!
    progress: String!
    lastPlayed: String!
    updatedAt: String!
  }

  type RemovePlayerPayload {
    success: Boolean!
    removedUserId: ID!
    removedUsername: String!
  }

  # ─── AI Agent Types ──────────────────────────────────────────────────────────

  type AIResponse {
    answer: String!
    category: String!
    sources: [String!]!
  }

  type PlayerProgressInfo {
    userId: ID!
    username: String!
    level: Int!
    experiencePoints: Int!
    score: Int!
    failCount: Int!
    achievements: [String!]!
  }

  # ─── Inputs ──────────────────────────────────────────────────────────────────

  input UpdateMyProgressInput {
    levelDelta: Int
    experiencePointsDelta: Int
    scoreDelta: Int
    progress: String
    achievement: String
  }

  # ─── Queries ─────────────────────────────────────────────────────────────────

  type Query {
    leaderboard(limit: Int = 10): [GameProgress!]!
    myProgress: GameProgress!
    progressByUser(userId: ID!): GameProgress

    # AI Game Guide Agent queries
    gameAIQuery(input: String!): AIResponse!
    playerProgress(userId: ID!): PlayerProgressInfo!
    gameHint(level: Int!): String!
  }

  # ─── Mutations ───────────────────────────────────────────────────────────────

  type Mutation {
    initializeMyProgress: GameProgress!
    updateMyProgress(input: UpdateMyProgressInput!): GameProgress!
    resetMyProgress: GameProgress!
    removePlayer(userId: ID!): RemovePlayerPayload!
    recordFailure: GameProgress!
  }
`;

export default typeDefs;
