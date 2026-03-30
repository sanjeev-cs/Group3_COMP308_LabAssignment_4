import { pathToFileURL } from 'node:url';
import config from '../shared/config.js';
import connectToDatabase from '../shared/database.js';
import createGraphqlService from '../shared/server.js';
import typeDefs from './graphql/typeDefs.js';
import resolvers from './graphql/resolvers.js';

export const startAuthService = async () => {
  await connectToDatabase('Auth Service');

  const app = await createGraphqlService({
    serviceName: 'Auth Service',
    typeDefs,
    resolvers,
  });

  return app.listen(config.authServicePort, () => {
    console.log(
      `[Auth Service] running at http://localhost:${config.authServicePort}/graphql`,
    );
  });
};

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  await startAuthService();
}
