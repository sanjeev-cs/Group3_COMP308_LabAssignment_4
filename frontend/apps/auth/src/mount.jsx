import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client/react';
import authClient from './authClient.js';
import AuthExperience from './AuthExperience.jsx';

const renderAuthExperience = (props) => (
  <React.StrictMode>
    <ApolloProvider client={authClient}>
      <AuthExperience {...props} />
    </ApolloProvider>
  </React.StrictMode>
);

const mountAuthExperience = (container, props = {}) => {
  const root = ReactDOM.createRoot(container);
  let currentProps = props;

  const render = (nextProps = currentProps) => {
    currentProps = nextProps;
    root.render(renderAuthExperience(currentProps));
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

export { mountAuthExperience };
export default mountAuthExperience;
