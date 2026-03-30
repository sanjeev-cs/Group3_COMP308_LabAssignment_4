import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import config from './config.js';
import { resolveAuthenticatedUser } from './auth.js';

export const createGraphqlService = async ({ serviceName, typeDefs, resolvers }) => {
  const app = express();

  app.use(
    cors({
      origin: config.frontendOrigins,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_request, response) => {
    response.json({
      service: serviceName,
      status: 'ok',
    });
  });

  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
  });

  await apolloServer.start();

  app.use(
    '/graphql',
    expressMiddleware(apolloServer, {
      context: async ({ req }) => ({
        authUser: resolveAuthenticatedUser(req.headers),
      }),
    }),
  );

  app.use((error, _request, response, _next) => {
    console.error(`[${serviceName}]`, error);
    response.status(500).json({
      message: error.message ?? 'Internal server error',
    });
  });

  return app;
};

export default createGraphqlService;
