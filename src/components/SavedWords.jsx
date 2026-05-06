// SavedWords component

/**
 * SavedWords — displays the list of words saved by the user.
 *
 * Props:
 *   words        : string[]
 *   onClear      : () => void
 *   onStartQuiz  : () => void
 */
const SavedWords = ({ words, onClear, onStartQuiz }) => {
  return (
    <section className="saved-words-section">
      <div className="section-header">
        <h2 className="section-title">
          <span className="section-icon">📖</span> Saved Words
          <span className="word-count">{words.length}</span>
        </h2>
        <div className="header-actions">
          {words.length >= 2 && (
            <button className="btn btn-quiz" onClick={onStartQuiz}>
              🎯 Take Quiz
            </button>
          )}
          {words.length > 0 && (
            <button className="btn btn-clear" onClick={onClear}>
              🗑 Clear All
            </button>
          )}
        </div>
      </div>

      {words.length === 0 ? (
        <div className="empty-state">
          <p>Click any subtitle word to save it here.</p>
        </div>
      ) : (
        <div className="word-chips">
          {words.map((word, i) => (
            <span key={i} className="word-chip">
              {word}
            </span>
          ))}
        </div>
      )}
    </section>
  );
};

export default SavedWords;
