import createGraphqlClient from '../../shared/apollo/createGraphqlClient.js';
import { getSessionToken } from '../../shared/session/sessionStorage.js';

const progressClient = createGraphqlClient({
  endpoint:
    import.meta.env.VITE_PROGRESS_GRAPHQL_URL ?? 'http://localhost:4002/graphql',
  getToken: getSessionToken,
});

export default progressClient;
