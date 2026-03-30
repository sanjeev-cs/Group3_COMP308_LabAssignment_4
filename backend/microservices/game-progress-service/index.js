import { pathToFileURL } from 'node:url';
import config from '../shared/config.js';
import connectToDatabase from '../shared/database.js';
import createGraphqlService from '../shared/server.js';
import typeDefs from './graphql/typeDefs.js';
import resolvers from './graphql/resolvers.js';
import { initChain } from './ai/agentChain.js';

export const startGameProgressService = async () => {
  await connectToDatabase('Game Progress Service');

  // Initialize the LangChain RAG pipeline before serving requests
  await initChain();

  const app = await createGraphqlService({
    serviceName: 'Game Progress Service',
    typeDefs,
    resolvers,
  });

  return app.listen(config.gameProgressServicePort, () => {
    console.log(
      `[Game Progress Service] running at http://localhost:${config.gameProgressServicePort}/graphql`,
    );
  });
};

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  await startGameProgressService();
}
