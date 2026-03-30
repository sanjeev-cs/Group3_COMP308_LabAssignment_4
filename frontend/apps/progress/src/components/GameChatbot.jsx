import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import progressClient from '../progressClient.js';
import { useState, useRef, useEffect, useCallback } from 'react';

// GraphQL Operations

const GAME_AI_QUERY = gql`
  query GameAIQuery($input: String!) {
    gameAIQuery(input: $input) {
      answer
      category
      sources
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
      achievements
    }
  }
`;

// Constants

const CATEGORY_COLORS = {
  tip: '#4ade80',
  warning: '#ff6b6b',
  strategy: '#60a5fa',
};

const CATEGORY_LABELS = {
  tip: '💡 Tip',
  warning: '⚠️ Warning',
  strategy: '🎯 Strategy',
};

const SUGGESTED_QUESTIONS = [
  'How do I pass my current level?',
  'What items should I collect?',
  'Any tips for the boss fight?',
  'Best strategy for leveling up?',
];

// Component

const GameChatbot = ({ userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch player progress for the stats header
  const { data: progressData } = useQuery(PLAYER_PROGRESS_QUERY, {
    variables: { userId },
    skip: !userId,
    fetchPolicy: 'cache-and-network',
  });

  // Auto-scroll to the latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Direct client.query() — works in all Apollo Client versions
  const sendQuery = useCallback(
    async (question) => {
      setLoading(true);
      try {
        const { data } = await progressClient.query({
          query: GAME_AI_QUERY,
          variables: { input: question },
          fetchPolicy: 'no-cache',
        });
        const { answer, category, sources } = data.gameAIQuery;
        setMessages((prev) => [
          ...prev,
          { role: 'guide', text: answer, category, sources, timestamp: new Date() },
        ]);
        if (!isOpen) setHasUnread(true);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'guide',
            text: `Sorry, I couldn't process that: ${error.message}`,
            category: 'warning',
            sources: [],
            timestamp: new Date(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [isOpen],
  );

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [
      ...prev,
      { role: 'player', text: trimmed, timestamp: new Date() },
    ]);
    setInputValue('');
    sendQuery(trimmed);
  }, [inputValue, loading, sendQuery]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleSuggestionClick = useCallback(
    (question) => {
      if (loading) return;
      setMessages((prev) => [
        ...prev,
        { role: 'player', text: question, timestamp: new Date() },
      ]);
      sendQuery(question);
    },
    [loading, sendQuery],
  );

  const stats = progressData?.playerProgress;

  return (
    <div className="chatbot-floating-wrapper">
      {/* Floating toggle button */}
      <button
        className={`chatbot-fab ${isOpen ? 'chatbot-fab--open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
        aria-label={isOpen ? 'Close Game Guide' : 'Open Game Guide'}
        id="chatbot-fab"
      >
        {isOpen ? '✕' : '🤖'}
        {hasUnread && !isOpen && <span className="chatbot-fab-badge" />}
      </button>

      {/* Floating chat window */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <div className="chatbot-avatar">🤖</div>
              <div>
                <span className="chatbot-eyebrow">AI GAME GUIDE</span>
                <h3 className="chatbot-title">Game Assistant</h3>
              </div>
            </div>
            {stats && (
              <div className="chatbot-stats">
                <span className="chatbot-stat chatbot-stat--level">
                  <span className="chatbot-stat-label">LVL</span>
                  <span className="chatbot-stat-value">{stats.level}</span>
                </span>
                <span className="chatbot-stat chatbot-stat--xp">
                  <span className="chatbot-stat-label">XP</span>
                  <span className="chatbot-stat-value">{stats.experiencePoints}</span>
                </span>
                <span className="chatbot-stat chatbot-stat--score">
                  <span className="chatbot-stat-label">SCR</span>
                  <span className="chatbot-stat-value">{stats.score}</span>
                </span>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.length === 0 && (
              <div className="chatbot-empty">
                <div className="chatbot-empty-icon">🎮</div>
                <p className="chatbot-empty-title">Need help?</p>
                <p className="chatbot-empty-subtitle">Ask me anything or try:</p>
                <div className="chatbot-suggestions">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      className="chatbot-suggestion"
                      onClick={() => handleSuggestionClick(q)}
                      type="button"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-bubble chat-bubble--${msg.role}`}
                style={
                  msg.category
                    ? { '--bubble-accent': CATEGORY_COLORS[msg.category] || '#8edcff' }
                    : undefined
                }
              >
                <div className="chat-bubble-header">
                  <strong>{msg.role === 'player' ? 'You' : '🤖 Guide'}</strong>
                  {msg.category && (
                    <span className={`chat-category-badge chat-category-badge--${msg.category}`}>
                      {CATEGORY_LABELS[msg.category] || msg.category}
                    </span>
                  )}
                </div>
                <p>{msg.text}</p>
              </div>
            ))}

            {loading && (
              <div className="chat-bubble chat-bubble--guide chat-bubble--loading">
                <div className="chat-bubble-header">
                  <strong>🤖 Guide</strong>
                </div>
                <div className="chatbot-typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="chatbot-input-row">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask the Game Guide..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              id="chatbot-input"
            />
            <button
              className="chatbot-send-button"
              onClick={handleSend}
              disabled={loading || !inputValue.trim()}
              type="button"
              id="chatbot-send"
            >
              {loading ? (
                <span className="chatbot-send-spinner" />
              ) : (
                <span className="chatbot-send-arrow">➤</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameChatbot;
