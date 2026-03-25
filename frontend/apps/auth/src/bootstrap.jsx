import { ApolloProvider } from '@apollo/client/react';
import authClient from './authClient.js';
import AuthExperience from './AuthExperience.jsx';

const FederatedAuthExperience = (props) => (
  <ApolloProvider client={authClient}>
    <AuthExperience {...props} />
  </ApolloProvider>
);

export default FederatedAuthExperience;
