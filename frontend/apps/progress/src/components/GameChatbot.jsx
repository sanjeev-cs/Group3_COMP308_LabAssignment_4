import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import progressClient from '../progressClient.js';

const GAME_AI_QUERY = gql`
  query GameAIQuery(
    $input: String!
    $history: [MessageInput!]
    $provider: String
    $model: String
  ) {
    gameAIQuery(
      input: $input
      history: $history
      provider: $provider
      model: $model
    ) {
      answer
      category
      notice
    }
  }
`;

const PLAYER_PROGRESS_QUERY = gql`
  query PlayerProgress($userId: ID!) {
    playerProgress(userId: $userId) {
      userId
      username
      level
      experiencePoints
      score
      failCount
    }
  }
`;

const GAME_HINT_QUERY = gql`
  query GameHint($level: Int!, $provider: String, $model: String) {
    gameHint(level: $level, provider: $provider, model: $model)
  }
`;

const RECORD_FAILURE_MUTATION = gql`
  mutation RecordFailure {
    recordFailure {
      id
      level
      failCount
    }
  }
`;

const FIXED_PROVIDER = 'groq';
const FIXED_MODEL = 'llama-3.3-70b-versatile';

const CATEGORY_COLORS = {
  tip: '#4ade80',
  warning: '#ff6b6b',
  strategy: '#60a5fa',
};

const CATEGORY_LABELS = {
  tip: 'Tip',
  warning: 'Warning',
  strategy: 'Strategy',
};

const SUGGESTED_QUESTIONS = [
  'How do I pass my current level?',
  'What items should I collect next?',
  'Give me a boss fight strategy.',
  'How should I level up faster?',
];

const classifyHintCategory = (text = '') => {
  const lower = text.toLowerCase();

  if (
    ['warning', 'danger', 'do not', 'avoid', 'careful', 'cursed'].some((term) =>
      lower.includes(term),
    )
  ) {
    return 'warning';
  }

  if (
    ['strategy', 'alternative', 'easier', 'build', 'approach', 'farming'].some((term) =>
      lower.includes(term),
    )
  ) {
    return 'strategy';
  }

  return 'tip';
};

const extractErrorMessage = (error) =>
  error?.graphQLErrors?.[0]?.message ?? error?.message ?? 'The request failed.';

const GuideGlyph = ({ className }) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M9 4.5V7.2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    <path d="M15 4.5V7.2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    <circle cx="9" cy="3.75" fill="currentColor" r="1.35" />
    <circle cx="15" cy="3.75" fill="currentColor" r="1.35" />
    <rect fill="currentColor" height="10.5" rx="3.2" width="13" x="5.5" y="7.2" />
    <rect fill="#314761" height="6.6" rx="2.1" width="9.2" x="7.4" y="9.25" />
    <circle cx="10.3" cy="12.2" fill="currentColor" r="1" />
    <circle cx="13.7" cy="12.2" fill="currentColor" r="1" />
    <path
      d="M10 14.4C10.6 15.05 11.35 15.4 12 15.4C12.65 15.4 13.4 15.05 14 14.4"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.15"
    />
    <rect fill="currentColor" height="4.2" rx="1.05" width="2.1" x="3.6" y="10.35" />
    <rect fill="currentColor" height="4.2" rx="1.05" width="2.1" x="18.3" y="10.35" />
    <rect fill="currentColor" height="2" rx="0.8" width="2.8" x="10.6" y="17.7" />
    <rect fill="currentColor" height="1.9" rx="0.95" width="7.8" x="8.1" y="19.7" />
  </svg>
);

const CloseGlyph = ({ className }) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5 5L15 15M15 5L5 15"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
    />
  </svg>
);

const GameChatbot = ({ userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [hasUnread, setHasUnread] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const {
    data: progressData,
    refetch: refetchProgress,
  } = useQuery(PLAYER_PROGRESS_QUERY, {
    variables: { userId },
    skip: !userId,
    fetchPolicy: 'cache-and-network',
  });

  const stats = progressData?.playerProgress;
  const isBusy = loading || Boolean(actionLoading);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [messages, loading]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') {
      return undefined;
    }

    setHasUnread(false);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 60);

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const appendPlayerMessage = useCallback((text) => {
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        role: 'player',
        text,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  const appendGuideMessage = useCallback(
    ({ text, category, notice = null }) => {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: 'guide',
          text,
          category,
          notice,
          timestamp: new Date().toISOString(),
        },
      ]);

      if (!isOpen) {
        setHasUnread(true);
      }
    },
    [isOpen],
  );

  const sendQuery = useCallback(
    async (question, currentMessages) => {
      setLoading(true);

      try {
        const history = currentMessages.map((message) => ({
          role: message.role,
          text: message.text,
        }));

        const { data } = await progressClient.query({
          query: GAME_AI_QUERY,
          variables: {
            input: question,
            history,
            provider: FIXED_PROVIDER,
            model: FIXED_MODEL,
          },
          fetchPolicy: 'no-cache',
        });

        appendGuideMessage({
          text: data.gameAIQuery.answer,
          category: data.gameAIQuery.category,
          notice: data.gameAIQuery.notice,
        });
      } catch (error) {
        appendGuideMessage({
          text: `I could not process that request: ${extractErrorMessage(error)}`,
          category: 'warning',
        });
      } finally {
        setLoading(false);
      }
    },
    [appendGuideMessage],
  );

  const handleSend = useCallback(() => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue || isBusy) {
      return;
    }

    appendPlayerMessage(trimmedValue);
    setInputValue('');
    void sendQuery(trimmedValue, messages);
  }, [appendPlayerMessage, inputValue, isBusy, messages, sendQuery]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleSuggestionClick = useCallback(
    (question) => {
      if (isBusy) {
        return;
      }

      appendPlayerMessage(question);
      void sendQuery(question, messages);
    },
    [appendPlayerMessage, isBusy, messages, sendQuery],
  );

  const handleLevelHint = useCallback(async () => {
    if (!stats?.level || isBusy) {
      return;
    }

    const prompt = `Give me a quick hint for Level ${stats.level}.`;
    appendPlayerMessage(prompt);
    setActionLoading('hint');

    try {
      const { data } = await progressClient.query({
        query: GAME_HINT_QUERY,
        variables: {
          level: stats.level,
          provider: FIXED_PROVIDER,
          model: FIXED_MODEL,
        },
        fetchPolicy: 'no-cache',
      });

      appendGuideMessage({
        text: data.gameHint,
        category: classifyHintCategory(data.gameHint),
      });
    } catch (error) {
      appendGuideMessage({
        text: `I could not fetch the level hint: ${extractErrorMessage(error)}`,
        category: 'warning',
      });
    } finally {
      setActionLoading('');
    }
  }, [appendGuideMessage, appendPlayerMessage, isBusy, stats?.level]);

  const handleRecordFailure = useCallback(async () => {
    if (!userId || isBusy) {
      return;
    }

    setActionLoading('failure');

    try {
      const { data } = await progressClient.mutate({
        mutation: RECORD_FAILURE_MUTATION,
      });

      await refetchProgress();

      const updatedProgress = data?.recordFailure;
      const updatedFailCount = updatedProgress?.failCount ?? 0;
      const updatedLevel = updatedProgress?.level ?? stats?.level ?? 1;

      if (updatedFailCount >= 2) {
        const recoveryPrompt = `I just failed Level ${updatedLevel} again. Give me an easier fallback strategy that matches my current stats.`;
        appendPlayerMessage(recoveryPrompt);
        await sendQuery(recoveryPrompt, messages);
      } else {
        appendGuideMessage({
          text: `Failed attempt recorded. I will factor that into future advice for Level ${updatedLevel}.`,
          category: 'tip',
        });
      }
    } catch (error) {
      appendGuideMessage({
        text: `I could not record that failed attempt: ${extractErrorMessage(error)}`,
        category: 'warning',
      });
    } finally {
      setActionLoading('');
    }
  }, [
    appendGuideMessage,
    appendPlayerMessage,
    isBusy,
    messages,
    refetchProgress,
    sendQuery,
    stats?.level,
    userId,
  ]);

  if (typeof document === 'undefined') {
    return null;
  }

  const subtitle = stats
    ? `Lvl ${stats.level} · XP ${stats.experiencePoints} · Fails ${stats.failCount}`
    : 'Groq · Llama 3.3 70B';

  return createPortal(
    <div className="chatbot-root">
      {!isOpen ? (
        <button
          aria-label="Open Game Guide"
          className="chatbot-trigger"
          onClick={() => setIsOpen(true)}
          type="button"
        >
          <GuideGlyph className="chatbot-trigger-icon" />
          {hasUnread ? <span className="chatbot-trigger-badge" /> : null}
        </button>
      ) : null}

      {isOpen ? (
        <section
          aria-label="Game Guide"
          aria-modal="false"
          className="chatbot-panel"
          role="dialog"
        >
          <header className="chatbot-panel-header">
            <div className="chatbot-panel-brand">
              <span className="chatbot-panel-icon">
                <GuideGlyph className="chatbot-panel-icon-svg" />
              </span>

              <div className="chatbot-panel-copy">
                <p className="chatbot-panel-kicker">Game Guide</p>
                <h2 className="chatbot-panel-title">Need a route or boss plan?</h2>
                <p className="chatbot-panel-subtitle">{subtitle}</p>
              </div>
            </div>

            <button
              aria-label="Close Game Guide"
              className="chatbot-panel-close"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              <CloseGlyph className="chatbot-panel-close-icon" />
            </button>
          </header>

          <div className="chatbot-panel-actions">
            <button
              className="chatbot-panel-action"
              disabled={!stats?.level || isBusy}
              onClick={handleLevelHint}
              type="button"
            >
              {actionLoading === 'hint' ? 'Loading hint...' : `Hint for Level ${stats?.level ?? '-'}`}
            </button>

            <button
              className="chatbot-panel-action chatbot-panel-action--secondary"
              disabled={!userId || isBusy}
              onClick={handleRecordFailure}
              type="button"
            >
              {actionLoading === 'failure'
                ? 'Recording...'
                : `Record failure${stats?.failCount ? ` (${stats.failCount})` : ''}`}
            </button>
          </div>

          <div className="chatbot-panel-messages">
            {messages.length === 0 ? (
              <div className="chatbot-panel-empty">
                <p className="chatbot-panel-empty-title">
                  Ask for a route, boss tactic, or easier fallback strategy.
                </p>
                <div className="chatbot-panel-suggestions">
                  {SUGGESTED_QUESTIONS.map((question) => (
                    <button
                      className="chatbot-panel-suggestion"
                      key={question}
                      onClick={() => handleSuggestionClick(question)}
                      type="button"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((message, index) => (
              <div
                className={`chat-bubble chat-bubble--${message.role}`}
                key={`${message.timestamp}-${index}`}
                style={
                  message.category
                    ? {
                        '--bubble-accent': CATEGORY_COLORS[message.category] ?? '#8edcff',
                      }
                    : undefined
                }
              >
                <div className="chat-bubble-header">
                  <strong>{message.role === 'player' ? 'You' : 'Guide'}</strong>
                  {message.category ? (
                    <span
                      className={`chat-category-badge chat-category-badge--${message.category}`}
                    >
                      {CATEGORY_LABELS[message.category] ?? message.category}
                    </span>
                  ) : null}
                </div>

                <p>{message.text}</p>

                {message.role === 'guide' && message.notice ? (
                  <p className="chat-bubble-notice">{message.notice}</p>
                ) : null}
              </div>
            ))}

            {loading ? (
              <div className="chat-bubble chat-bubble--guide chat-bubble--loading">
                <div className="chat-bubble-header">
                  <strong>Guide</strong>
                </div>

                <div className="chatbot-typing-indicator">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ) : null}

            <div ref={chatEndRef} />
          </div>

          <div className="chatbot-panel-input">
            <input
              disabled={isBusy}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the current level, route, or boss..."
              ref={inputRef}
              type="text"
              value={inputValue}
            />

            <button
              className="chatbot-panel-send"
              disabled={isBusy || !inputValue.trim()}
              onClick={handleSend}
              type="button"
            >
              {loading ? <span className="chatbot-send-spinner" /> : <span>{'>'}</span>}
            </button>
          </div>
        </section>
      ) : null}
    </div>,
    document.body,
  );
};

export default GameChatbot;
