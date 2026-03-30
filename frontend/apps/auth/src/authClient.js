import createGraphqlClient from '../../shared/apollo/createGraphqlClient.js';
import { getSessionToken } from '../../shared/session/sessionStorage.js';

const authClient = createGraphqlClient({
  endpoint:
    import.meta.env.VITE_AUTH_GRAPHQL_URL ?? 'http://localhost:4001/graphql',
  getToken: getSessionToken,
});

export default authClient;
