import { ApolloProvider } from '@apollo/client/react';
import GameProgressExperience from './GameProgressExperience.jsx';
import progressClient from './progressClient.js';

const FederatedGameProgressExperience = (props) => (
  <ApolloProvider client={progressClient}>
    <GameProgressExperience {...props} />
  </ApolloProvider>
);

export default FederatedGameProgressExperience;
