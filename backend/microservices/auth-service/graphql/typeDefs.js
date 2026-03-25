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
`;

export default typeDefs;
