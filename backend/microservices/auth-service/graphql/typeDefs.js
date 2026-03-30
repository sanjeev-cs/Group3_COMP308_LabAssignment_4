import { gql } from 'graphql-tag';

const typeDefs = gql`
  type User {
    id: ID!
    username: String!
    email: String!
    role: String!
    createdAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type LogoutPayload {
    success: Boolean!
    message: String!
  }

  type Query {
    me: User
  }

  type Mutation {
    signup(username: String!, email: String!, password: String!): AuthPayload!
    login(identifier: String!, password: String!): AuthPayload!
    logout: LogoutPayload!
  }

  type AIResponse {
    answer: String!
    category: String! # "tip" | "warning" | "strategy"
    source: [String!]!
  }

  type PlayerProgress {
    userId: ID!
    level: Int!
    experiencePoints: Int!
    score: Int!
    failCount: Int!
    achievements: [String!]!  }
`;

export default typeDefs;
