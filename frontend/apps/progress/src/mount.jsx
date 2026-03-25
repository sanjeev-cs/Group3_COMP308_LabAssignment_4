import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client/react';
import GameProgressExperience from './GameProgressExperience.jsx';
import progressClient from './progressClient.js';

const renderGameProgressExperience = (props) => (
  <React.StrictMode>
    <ApolloProvider client={progressClient}>
      <GameProgressExperience {...props} />
    </ApolloProvider>
  </React.StrictMode>
);

const mountGameProgressExperience = (container, props = {}) => {
  const root = ReactDOM.createRoot(container);
  let currentProps = props;

  const render = (nextProps = currentProps) => {
    currentProps = nextProps;
    root.render(renderGameProgressExperience(currentProps));
  };

  render(currentProps);

  return {
    update: (nextProps = currentProps) => {
      render(nextProps);
    },
    unmount: () => {
      root.unmount();
    },
  };
};

export { mountGameProgressExperience };
export default mountGameProgressExperience;
