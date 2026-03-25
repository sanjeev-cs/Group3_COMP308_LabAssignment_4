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

  input UpdateMyProgressInput {
    levelDelta: Int
    experiencePointsDelta: Int
    scoreDelta: Int
    progress: String
    achievement: String
  }

  type Query {
    leaderboard(limit: Int = 10): [GameProgress!]!
    myProgress: GameProgress!
    progressByUser(userId: ID!): GameProgress
  }

  type Mutation {
    initializeMyProgress: GameProgress!
    updateMyProgress(input: UpdateMyProgressInput!): GameProgress!
    resetMyProgress: GameProgress!
    removePlayer(userId: ID!): RemovePlayerPayload!
  }
`;

export default typeDefs;
