import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';

export const createGraphqlClient = ({ endpoint, getToken = () => '' }) => {
  const httpLink = new HttpLink({
    uri: endpoint,
  });

  const authLink = new SetContextLink((previousContext) => {
    const token = getToken();

    return {
      headers: {
        ...(previousContext?.headers ?? {}),
        authorization: token ? `Bearer ${token}` : '',
      },
    };
  });

  return new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
    connectToDevTools: true,
  });
};

export default createGraphqlClient;
