const buildAchievementCode = (title) =>
  title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

const AchievementBadge = ({ highlighted, title }) => {
  const achievementCode = buildAchievementCode(title);

  return (
    <article className={`achievement-card${highlighted ? ' is-highlighted' : ''}`}>
      <div className="achievement-visual">
        <div className={`achievement-emblem${highlighted ? ' is-highlighted' : ''}`}>
          <span className="achievement-state">{highlighted ? 'NEW' : 'SYNCED'}</span>
          <div className="achievement-token">{achievementCode || 'A'}</div>
        </div>
      </div>

      <div className="achievement-copy">
        <span className="progress-eyebrow">Achievement</span>
        <h3>{title}</h3>
        <p>
          {highlighted
            ? 'Recently unlocked and added to the player record.'
            : 'Saved in the player progress history.'}
        </p>
      </div>
    </article>
  );
};

export default AchievementBadge;
