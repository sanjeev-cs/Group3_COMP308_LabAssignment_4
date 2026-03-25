import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import { useDeferredValue, useEffect, useState } from 'react';
import AchievementBadge from './components/AchievementBadge.jsx';
import SignalBeacon from './components/SignalBeacon.jsx';
import SpaceBackdrop from './components/SpaceBackdrop.jsx';
import {
  SESSION_EVENT_NAME,
  getCurrentSession,
} from '../../shared/session/sessionStorage.js';
import './styles/progress.css';

const progressFields = gql`
  fragment ProgressFields on GameProgress {
    id
    userId
    level
    experiencePoints
    score
    rank
    achievements
    progress
    lastPlayed
    updatedAt
    user {
      id
      username
      email
      role
    }
  }
`;

const MY_PROGRESS_QUERY = gql`
  ${progressFields}
  query MyProgress {
    myProgress {
      ...ProgressFields
    }
  }
`;

const LEADERBOARD_QUERY = gql`
  ${progressFields}
  query Leaderboard($limit: Int) {
    leaderboard(limit: $limit) {
      ...ProgressFields
    }
  }
`;

const UPDATE_PROGRESS_MUTATION = gql`
  ${progressFields}
  mutation UpdateMyProgress($input: UpdateMyProgressInput!) {
    updateMyProgress(input: $input) {
      ...ProgressFields
    }
  }
`;

const RESET_PROGRESS_MUTATION = gql`
  ${progressFields}
  mutation ResetMyProgress {
    resetMyProgress {
      ...ProgressFields
    }
  }
`;

const REMOVE_PLAYER_MUTATION = gql`
  mutation RemovePlayer($userId: ID!) {
    removePlayer(userId: $userId) {
      success
      removedUserId
      removedUsername
    }
  }
`;

const actionScenarios = [
  {
    label: 'Daily Training',
    message: 'Training session logged with a modest score increase.',
    input: {
      experiencePointsDelta: 90,
      scoreDelta: 120,
      progress: 'Training Grounds - Combo drills complete',
    },
  },
  {
    label: 'Quest Cleared',
    message: 'Quest results applied with a new achievement.',
    input: {
      levelDelta: 1,
      experiencePointsDelta: 180,
      scoreDelta: 320,
      progress: 'Crystal Ruins secured',
      achievement: 'Crystal Runner',
    },
  },
  {
    label: 'Boss Victory',
    message: 'Boss encounter recorded and leaderboard values refreshed.',
    input: {
      levelDelta: 1,
      experiencePointsDelta: 260,
      scoreDelta: 520,
      progress: 'Sky Citadel guardian defeated',
      achievement: 'Boss Breaker',
    },
  },
];

const extractGraphqlMessage = (error) =>
  error?.graphQLErrors?.[0]?.message ?? error?.message ?? 'The request failed.';

const GameProgressExperience = ({ token, user, mode }) => {
  const [sessionSnapshot, setSessionSnapshot] = useState(getCurrentSession);
  const [statusMessage, setStatusMessage] = useState('Updates sync automatically.');
  const [errorMessage, setErrorMessage] = useState('');
  const [highlightedAchievement, setHighlightedAchievement] = useState('');
  const [pendingRemoval, setPendingRemoval] = useState(null);

  useEffect(() => {
    const handleSessionUpdate = () => {
      setSessionSnapshot(getCurrentSession());
    };

    window.addEventListener(SESSION_EVENT_NAME, handleSessionUpdate);

    return () => {
      window.removeEventListener(SESSION_EVENT_NAME, handleSessionUpdate);
    };
  }, []);

  const activeToken = token ?? sessionSnapshot.token;
  const activeUser = user ?? sessionSnapshot.user;
  const panelMode = mode ?? (activeUser?.role === 'admin' ? 'admin' : 'player');
  const shouldLoadPlayerProgress = Boolean(activeToken) && panelMode !== 'admin';

  const {
    data: progressData,
    loading: progressLoading,
    error: progressError,
    refetch: refetchProgress,
  } = useQuery(MY_PROGRESS_QUERY, {
    skip: !shouldLoadPlayerProgress,
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: leaderboardData,
    loading: leaderboardLoading,
    refetch: refetchLeaderboard,
  } = useQuery(LEADERBOARD_QUERY, {
    variables: { limit: 12 },
    skip: !activeToken,
    fetchPolicy: 'cache-and-network',
    pollInterval: 6000,
  });

  const [runUpdateProgress, { loading: updateLoading }] = useMutation(
    UPDATE_PROGRESS_MUTATION,
  );
  const [runResetProgress, { loading: resetLoading }] = useMutation(RESET_PROGRESS_MUTATION);
  const [runRemovePlayer, { loading: removeLoading }] = useMutation(REMOVE_PLAYER_MUTATION);

  const playerProgress = progressData?.myProgress ?? null;
  const leaderboard = useDeferredValue(leaderboardData?.leaderboard ?? []);
  const achievementList = playerProgress?.achievements ?? [];
  const isBusy = updateLoading || resetLoading || removeLoading;
  const topPlayer = leaderboard[0] ?? null;
  const trackedPlayers = leaderboard.length;
  const totalAchievements = leaderboard.reduce(
    (count, entry) => count + entry.achievements.length,
    0,
  );
  const averageLevel = trackedPlayers
    ? (leaderboard.reduce((total, entry) => total + entry.level, 0) / trackedPlayers).toFixed(1)
    : '0.0';
  const playerSignalIntensity = Math.min(
    1,
    (playerProgress?.level ?? 1) / 8 + (playerProgress?.score ?? 0) / 2200,
  );
  const adminSignalIntensity = Math.min(1, trackedPlayers / 8 + totalAchievements / 24);
  const currentRank = progressLoading ? '...' : playerProgress?.rank ?? 'Unranked';
  const currentLevel = progressLoading ? '...' : playerProgress?.level ?? 1;
  const currentExperience = progressLoading ? '...' : playerProgress?.experiencePoints ?? 0;
  const currentScore = progressLoading ? '...' : playerProgress?.score ?? 0;
  const currentProgress = playerProgress?.progress ?? 'Not started';

  const refreshVisibleData = async ({ includePlayerProgress = false } = {}) => {
    const refreshTasks = [refetchLeaderboard()];

    if (includePlayerProgress && shouldLoadPlayerProgress) {
      refreshTasks.push(refetchProgress());
    }

    await Promise.all(refreshTasks);
  };

  const handleAction = async (scenario) => {
    try {
      await runUpdateProgress({
        variables: {
          input: scenario.input,
        },
      });

      await refreshVisibleData({ includePlayerProgress: true });
      setStatusMessage(scenario.message);
      setErrorMessage('');
      setHighlightedAchievement(scenario.input.achievement ?? '');
    } catch (error) {
      setErrorMessage(extractGraphqlMessage(error));
      setStatusMessage('Progress update did not complete.');
    }
  };

  const handleReset = async () => {
    try {
      await runResetProgress();
      await refreshVisibleData({ includePlayerProgress: true });
      setStatusMessage('Progress reset to the default state.');
      setErrorMessage('');
      setHighlightedAchievement('');
    } catch (error) {
      setErrorMessage(extractGraphqlMessage(error));
      setStatusMessage('Progress reset did not complete.');
    }
  };

  const beginPlayerRemoval = (entry) => {
    setPendingRemoval({
      userId: entry.user.id,
      username: entry.user.username,
    });
    setErrorMessage('');
    setStatusMessage(
      `Warning: removing ${entry.user.username} deletes the account and all saved progress.`,
    );
  };

  const cancelPlayerRemoval = () => {
    setPendingRemoval(null);
    setErrorMessage('');
    setStatusMessage('Select a player below to remove an account.');
  };

  const confirmPlayerRemoval = async () => {
    if (!pendingRemoval) {
      return;
    }

    try {
      const { data } = await runRemovePlayer({
        variables: {
          userId: pendingRemoval.userId,
        },
      });

      await refreshVisibleData();
      setPendingRemoval(null);
      setErrorMessage('');
      setStatusMessage(`${data.removePlayer.removedUsername} was removed from the platform.`);
    } catch (error) {
      setErrorMessage(extractGraphqlMessage(error));
      setStatusMessage('Player removal did not complete.');
    }
  };

  if (!activeToken || !activeUser) {
    return (
      <section className="progress-empty-state">
        <span className="progress-eyebrow">Session required</span>
        <h1>Sign in first.</h1>
        <p>The dashboard opens after a successful login or sign-up.</p>
      </section>
    );
  }

  if (panelMode !== 'admin' && progressError) {
    return (
      <section className="progress-empty-state">
        <span className="progress-eyebrow">Service error</span>
        <h1>Progress data could not be loaded.</h1>
        <p>{extractGraphqlMessage(progressError)}</p>
      </section>
    );
  }

  return (
    <div className="progress-page">
      <SpaceBackdrop />

      <div className="progress-shell">
        {panelMode !== 'admin' ? (
          <section className="dashboard-top">
            <article className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <span className="progress-eyebrow">Player Panel</span>
                  <h2>{activeUser.username}</h2>
                </div>
                <span className="section-note">{currentProgress}</span>
              </div>

              <div className="progress-status-banner progress-status-banner--with-beacon">
                <div className="progress-status-copy">
                  <strong>{currentProgress}</strong>
                  <p>{statusMessage}</p>
                  {errorMessage ? <p className="progress-error">{errorMessage}</p> : null}
                </div>
                <SignalBeacon
                  className="progress-status-beacon"
                  intensity={playerSignalIntensity}
                  tint="#8edcff"
                />
              </div>
            </article>

            <article className="dashboard-panel dashboard-panel--actions">
              <div className="dashboard-panel-header">
                <div>
                  <span className="progress-eyebrow">Quick Actions</span>
                  <h2>Update progress</h2>
                </div>
              </div>

              <div className="action-grid">
                {actionScenarios.map((scenario) => (
                  <button
                    className="progress-action"
                    disabled={isBusy}
                    key={scenario.label}
                    onClick={() => handleAction(scenario)}
                    type="button"
                  >
                    {scenario.label}
                  </button>
                ))}
              </div>

              <button
                className="progress-action is-secondary"
                disabled={isBusy}
                onClick={handleReset}
                type="button"
              >
                {resetLoading ? 'Resetting...' : 'Reset Progress'}
              </button>
            </article>
          </section>
        ) : null}

        <section className="stat-grid">
          {panelMode === 'admin' ? (
            <>
              <article className="stat-card">
                <span className="progress-eyebrow">Players</span>
                <strong>{trackedPlayers}</strong>
              </article>
              <article className="stat-card">
                <span className="progress-eyebrow">Top Score</span>
                <strong>{topPlayer?.score ?? 0}</strong>
              </article>
              <article className="stat-card">
                <span className="progress-eyebrow">Average Level</span>
                <strong>{averageLevel}</strong>
              </article>
              <article className="stat-card">
                <span className="progress-eyebrow">Achievements Logged</span>
                <strong>{totalAchievements}</strong>
              </article>
            </>
          ) : (
            <>
              <article className="stat-card">
                <span className="progress-eyebrow">Rank</span>
                <strong>{currentRank}</strong>
              </article>
              <article className="stat-card">
                <span className="progress-eyebrow">Level</span>
                <strong>{currentLevel}</strong>
              </article>
              <article className="stat-card">
                <span className="progress-eyebrow">XP</span>
                <strong>{currentExperience}</strong>
              </article>
              <article className="stat-card">
                <span className="progress-eyebrow">Score</span>
                <strong>{currentScore}</strong>
              </article>
            </>
          )}
        </section>

        <section className="progress-grid">
          <article className="progress-card">
            <div className="section-header">
              <div>
                <span className="progress-eyebrow">Leaderboard</span>
                <h2>{panelMode === 'admin' ? 'Player standings' : 'Top players'}</h2>
              </div>
              <span className="section-note">
                {leaderboardLoading ? 'Refreshing...' : 'Auto-refresh every 6 seconds'}
              </span>
            </div>

            <div className="leaderboard-list">
              {leaderboard.map((entry) => (
                <div
                  className={`leaderboard-row${
                    entry.user.id === activeUser.id ? ' is-current-user' : ''
                  }`}
                  key={entry.id}
                >
                  <div>
                    <strong>#{entry.rank ?? '-'}</strong>
                    <p>{entry.user.username}</p>
                  </div>
                  <div>
                    <span>{entry.score} pts</span>
                    <p>Lvl {entry.level}</p>
                  </div>
                </div>
              ))}

              {leaderboard.length === 0 ? (
                <div className="achievement-placeholder">
                  <p>No player progress has been recorded yet.</p>
                </div>
              ) : null}
            </div>
          </article>

          <article className="progress-card">
            <div className="section-header">
              <div>
                <span className="progress-eyebrow">
                  {panelMode === 'admin' ? 'Players' : 'Achievements'}
                </span>
                <h2>{panelMode === 'admin' ? 'Manage accounts' : 'Unlocked milestones'}</h2>
              </div>
              <span className="section-note">
                {panelMode === 'admin'
                  ? `${trackedPlayers} player records`
                  : `${achievementList.length} achievements`}
              </span>
            </div>

            {panelMode === 'admin' ? (
              <>
                <div className="progress-status-banner progress-status-banner--with-beacon">
                  <div className="progress-status-copy">
                    <strong>
                      {pendingRemoval ? `Remove ${pendingRemoval.username}?` : 'Admin tools ready'}
                    </strong>
                    <p>{statusMessage}</p>
                    {errorMessage ? <p className="progress-error">{errorMessage}</p> : null}
                  </div>
                  <SignalBeacon
                    className="progress-status-beacon"
                    intensity={adminSignalIntensity}
                    tint={pendingRemoval ? '#ff8f85' : '#8edcff'}
                  />
                </div>

                {pendingRemoval ? (
                  <div className="warning-card">
                    <p>
                      This permanently deletes the player account and saved progress. This action
                      cannot be undone.
                    </p>
                    <div className="warning-actions">
                      <button
                        className="progress-action is-danger"
                        disabled={isBusy}
                        onClick={confirmPlayerRemoval}
                        type="button"
                      >
                        {removeLoading ? 'Removing...' : 'Yes, remove player'}
                      </button>
                      <button
                        className="progress-action is-secondary"
                        disabled={isBusy}
                        onClick={cancelPlayerRemoval}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : leaderboard.length > 0 ? (
                  <div className="player-card-grid">
                    {leaderboard.map((entry) => (
                      <article className="player-card" key={entry.id}>
                        <div className="player-card-header">
                          <div>
                            <strong>{entry.user.username}</strong>
                            <span className="player-card-rank">#{entry.rank ?? '-'}</span>
                          </div>
                          <button
                            className="player-remove-button"
                            disabled={isBusy}
                            onClick={() => beginPlayerRemoval(entry)}
                            type="button"
                          >
                            Remove
                          </button>
                        </div>
                        <p>{entry.progress}</p>
                        <div className="player-card-meta">
                          <span>Lvl {entry.level}</span>
                          <span>{entry.score} pts</span>
                          <span>{entry.achievements.length} badges</span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="achievement-placeholder">
                    <p>No player accounts are available yet.</p>
                  </div>
                )}
              </>
            ) : achievementList.length > 0 ? (
              <div className="achievement-grid">
                {achievementList.map((achievement) => (
                  <AchievementBadge
                    highlighted={achievement === highlightedAchievement}
                    key={achievement}
                    title={achievement}
                  />
                ))}
              </div>
            ) : (
              <div className="achievement-placeholder">
                <p>No achievements yet.</p>
              </div>
            )}
          </article>
        </section>
      </div>
    </div>
  );
};

export default GameProgressExperience;
