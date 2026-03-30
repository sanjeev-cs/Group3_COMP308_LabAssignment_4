import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useState } from 'react';
import AuthLayout from './components/AuthLayout.jsx';
import Button from './components/Button.jsx';
import SpaceBackdrop from '../../shared/components/SpaceBackdrop.jsx';
import './styles/auth.css';
import {
  clearStoredSession,
  writeStoredSession,
} from '../../shared/session/sessionStorage.js';

const LOGIN_MUTATION = gql`
  mutation Login($identifier: String!, $password: String!) {
    login(identifier: $identifier, password: $password) {
      token
      user {
        id
        username
        email
        role
        createdAt
      }
    }
  }
`;

const SIGNUP_MUTATION = gql`
  mutation Signup($username: String!, $email: String!, $password: String!) {
    signup(username: $username, email: $email, password: $password) {
      token
      user {
        id
        username
        email
        role
        createdAt
      }
    }
  }
`;

const extractGraphqlMessage = (error) =>
  error?.graphQLErrors?.[0]?.message ?? error?.message ?? 'The request failed.';

const resolvePanelPath = (user) => (user?.role === 'admin' ? '/admin' : '/player');
const hostAppBaseUrl = import.meta.env.VITE_HOST_APP_URL ?? 'http://localhost:5173';

const AuthExperience = ({ onAuthenticated }) => {
  const [activeView, setActiveView] = useState('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [errorMessage, setErrorMessage] = useState('');

  const [runLogin, { loading: loginLoading }] = useMutation(LOGIN_MUTATION);
  const [runSignup, { loading: signupLoading }] = useMutation(SIGNUP_MUTATION);

  const completeAuthentication = (payload) => {
    clearStoredSession();
    writeStoredSession({
      token: payload.token,
      user: payload.user,
    });

    setErrorMessage('');

    if (typeof onAuthenticated === 'function') {
      onAuthenticated(payload.user);
      return;
    }

    if (typeof window !== 'undefined') {
      const targetUrl = new URL(resolvePanelPath(payload.user), hostAppBaseUrl).toString();
      window.location.replace(targetUrl);
    }
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();

    try {
      const { data } = await runLogin({
        variables: {
          identifier: loginForm.username.trim(),
          password: loginForm.password,
        },
      });

      completeAuthentication(data.login);
    } catch (error) {
      setErrorMessage(extractGraphqlMessage(error));
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();

    try {
      const { data } = await runSignup({
        variables: {
          username: registerForm.username.trim(),
          email: registerForm.email.trim(),
          password: registerForm.password,
        },
      });

      completeAuthentication(data.signup);
    } catch (error) {
      setErrorMessage(extractGraphqlMessage(error));
    }
  };

  const renderFooter = (nextView, prompt, label) => (
    <p className="auth-footer-text">
      {prompt}{' '}
      <button
        className="auth-switch-link"
        onClick={() => {
          setActiveView(nextView);
          setErrorMessage('');
        }}
        type="button"
      >
        {label}
      </button>
    </p>
  );

  return (
    <div className="auth-page-shell">
      <SpaceBackdrop />

      <div className="auth-stage auth-stage--compact">
        <span className="auth-page-kicker">Game Progress Hub</span>

        <div className="auth-switcher">
          <button
            className={activeView === 'login' ? 'is-active' : ''}
            onClick={() => {
              setActiveView('login');
              setErrorMessage('');
            }}
            type="button"
          >
            Login
          </button>
          <button
            className={activeView === 'register' ? 'is-active' : ''}
            onClick={() => {
              setActiveView('register');
              setErrorMessage('');
            }}
            type="button"
          >
            Sign Up
          </button>
        </div>

        {activeView === 'login' ? (
          <AuthLayout
            footer={renderFooter('register', "Don't have an account?", 'Sign up here')}
            title="Login"
          >
            <p className="auth-helper-text">Sign in to continue.</p>
            {errorMessage ? <p className="error-message">{errorMessage}</p> : null}

            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label>Username or Email</label>
                <input
                  name="username"
                  onChange={(event) =>
                    setLoginForm((currentForm) => ({
                      ...currentForm,
                      username: event.target.value,
                    }))
                  }
                  required
                  type="text"
                  value={loginForm.username}
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  name="password"
                  onChange={(event) =>
                    setLoginForm((currentForm) => ({
                      ...currentForm,
                      password: event.target.value,
                    }))
                  }
                  required
                  type="password"
                  value={loginForm.password}
                />
              </div>

              <Button className="btn-block" disabled={loginLoading} type="submit" variant="primary">
                {loginLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </AuthLayout>
        ) : null}

        {activeView === 'register' ? (
          <AuthLayout
            footer={renderFooter('login', 'Already have an account?', 'Login here')}
            title="Sign Up"
          >
            <p className="auth-helper-text">Create your account to continue.</p>
            {errorMessage ? <p className="error-message">{errorMessage}</p> : null}

            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <label>Username</label>
                <input
                  name="username"
                  onChange={(event) =>
                    setRegisterForm((currentForm) => ({
                      ...currentForm,
                      username: event.target.value,
                    }))
                  }
                  required
                  type="text"
                  value={registerForm.username}
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  name="email"
                  onChange={(event) =>
                    setRegisterForm((currentForm) => ({
                      ...currentForm,
                      email: event.target.value,
                    }))
                  }
                  required
                  type="email"
                  value={registerForm.email}
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  minLength="6"
                  name="password"
                  onChange={(event) =>
                    setRegisterForm((currentForm) => ({
                      ...currentForm,
                      password: event.target.value,
                    }))
                  }
                  required
                  type="password"
                  value={registerForm.password}
                />
              </div>

              <Button
                className="btn-block"
                disabled={signupLoading}
                type="submit"
                variant="primary"
              >
                {signupLoading ? 'Creating account...' : 'Sign Up'}
              </Button>
            </form>
          </AuthLayout>
        ) : null}
      </div>
    </div>
  );
};

export default AuthExperience;
