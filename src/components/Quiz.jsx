/* eslint-disable react/prop-types */
import { useState, useEffect, useCallback } from "react";
import { fetchWordMeaning } from "../utils/dictionaryApi";

/**
 * Shuffles an array (Fisher-Yates).
 */
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Fun, quirky distractors to make the quiz more entertaining
const FUN_DISTRACTORS = [
  "A secret technique for folding socks perfectly",
  "The sudden urge to run away from an awkward conversation",
  "A magical spell used to summon fresh pizza",
  "The scientific name for a brain freeze",
  "A rare condition that makes you speak backwards",
  "The feeling of realizing you left the stove on",
  "A competitive sport involving extreme ironing",
  "The mysterious disappearance of left socks in the laundry",
  "An ancient tool used to communicate with dolphins",
  "The intense fear of unread emails",
  "A ninja technique for silently opening snacks at 3 AM",
  "A sophisticated method for avoiding eye contact",
  "The process of convincing yourself to go to the gym",
  "A legendary creature that eats homework",
  "The specific sound of a Wi-Fi router disconnecting",
  "An underwater breathing apparatus for hamsters"
];

const TIMER_SECONDS = 15;

const Quiz = ({ words, onClose }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // State machine for gameplay
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [answersLog, setAnswersLog] = useState([]);

  // 1. Build Quiz Data
  useEffect(() => {
    const buildQuiz = async () => {
      setLoading(true);
      const results = [];

      // Only take max 10 words for a quick fun quiz
      const selectedWords = shuffle(words).slice(0, 10);

      for (const word of selectedWords) {
        const data = await fetchWordMeaning(word);
        const correctDef = data?.definition ?? "Meaning not found.";

        const distractors = shuffle(FUN_DISTRACTORS).slice(0, 3);
        const options = shuffle([correctDef, ...distractors]);
        results.push({ word, correctDef, options });
      }

      setQuestions(results);
      setLoading(false);
    };
    buildQuiz();
  }, [words]);

  // 2. Define Handlers before using them
  const handleSelect = useCallback((option) => {
    if (isAnswering) return;
    setIsAnswering(true);
    setSelectedOpt(option);

    const q = questions[currentIndex];
    const isCorrect = option === q.correctDef;

    if (isCorrect) setScore(s => s + 1);

    // Log answer for the review screen
    setAnswersLog(prev => [...prev, {
      word: q.word,
      correct: isCorrect,
      selected: option || "Timeout ⏳",
      correctDef: q.correctDef
    }]);

    // Wait 1.5s for visual feedback before moving to next question
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(currentIndex + 1);
        setTimeLeft(TIMER_SECONDS);
        setSelectedOpt(null);
        setIsAnswering(false);
      } else {
        setQuizFinished(true);
      }
    }, 1500);
  }, [isAnswering, questions, currentIndex]);

  const handleTimeOut = useCallback(() => {
    handleSelect(null); // Time out means wrong answer
  }, [handleSelect]);

  // 3. Timer Logic
  useEffect(() => {
    if (loading || quizFinished || isAnswering || questions.length === 0) return;

    if (timeLeft === 0) {
      handleTimeOut();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, loading, quizFinished, isAnswering, questions, handleTimeOut]);

  const handleRetry = () => {
    setCurrentIndex(0);
    setScore(0);
    setTimeLeft(TIMER_SECONDS);
    setSelectedOpt(null);
    setIsAnswering(false);
    setQuizFinished(false);
    setAnswersLog([]);
  };

  if (loading) {
    return (
      <div className="quiz-overlay" onClick={onClose}>
        <div className="quiz-modal" onClick={e => e.stopPropagation()}>
          <div className="quiz-loading">
            <div className="loader" />
            <p>Summoning fun questions…</p>
          </div>
        </div>
      </div>
    );
  }

  // Finished Screen
  if (quizFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    let message = "Keep learning! 📚";
    let emoji = "🙂";
    if (percentage === 100) { message = "Flawless Victory! 👑"; emoji = "🎉"; }
    else if (percentage >= 80) { message = "Awesome Job! 🌟"; emoji = "🔥"; }
    else if (percentage >= 50) { message = "Not bad! 👍"; emoji = "🚀"; }

    return (
      <div className="quiz-overlay" onClick={onClose}>
        <div className="quiz-modal" onClick={e => e.stopPropagation()}>
          <div className="quiz-header">
            <h2>Quiz Complete {emoji}</h2>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
          <div className="quiz-results">
            <div className={`score-circle ${percentage >= 80 ? "perfect" : percentage >= 50 ? "good" : "low"}`}>
              <span className="score-num">{score}</span>
              <span className="score-denom">/{questions.length}</span>
            </div>
            <h3 className="score-label" style={{ fontSize: '1.4rem', color: 'var(--accent)', marginTop: '10px' }}>
              {message}
            </h3>

            <div className="quiz-review" style={{ marginTop: '20px' }}>
              {answersLog.map((log, i) => (
                <div key={i} className={`review-item ${log.correct ? "correct" : "wrong"}`}>
                  <strong>{log.word}</strong>
                  <span>{log.correct ? "✅ Nailed it!" : `❌ Selected: "${log.selected}"`}</span>
                  {!log.correct && <span className="correct-ans">💡 Correct: &quot;{log.correctDef}&quot;</span>}
                </div>
              ))}
            </div>

            <div className="quiz-footer-btns" style={{ marginTop: '20px' }}>
              <button className="btn btn-quiz" onClick={handleRetry}>🔁 Play Again</button>
              <button className="btn btn-clear" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Gameplay Screen
  const q = questions[currentIndex];
  const progressPct = ((currentIndex) / questions.length) * 100;

  return (
    <div className="quiz-overlay" onClick={onClose}>
      <div className="quiz-modal interactive-quiz" onClick={e => e.stopPropagation()}>
        
        {/* Progress bar at top */}
        <div className="quiz-progress-top">
          <div className="quiz-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="quiz-header">
          <h2>Question {currentIndex + 1} of {questions.length}</h2>
          <div className={`timer-badge ${timeLeft <= 5 ? "timer-danger pulse-anim" : ""}`}>
            ⏳ {timeLeft}s
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="quiz-body quiz-play-area">
          <div className="question-card">
            <span className="q-eyebrow">What does this word mean?</span>
            <h1 className="q-big-word">&quot;{q.word}&quot;</h1>
          </div>

          <div className="options-grid interactive">
            {q.options.map((opt, j) => {
              let btnClass = "option-btn interactable";
              
              if (isAnswering) {
                btnClass = "option-btn disabled-btn";
                if (opt === q.correctDef) {
                  btnClass += " correct-anim"; // Always show correct answer
                } else if (opt === selectedOpt) {
                  btnClass += " wrong-anim"; // Show red if they picked wrong
                }
              }

              return (
                <button
                  key={j}
                  className={btnClass}
                  onClick={() => handleSelect(opt)}
                  disabled={isAnswering}
                >
                  <span className="opt-letter">{String.fromCharCode(65 + j)}</span>
                  <span className="opt-text">{opt}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback Bar (pops up from bottom when answered) */}
        {isAnswering && selectedOpt !== null && (
          <div className={`feedback-bar ${selectedOpt === q.correctDef ? 'feedback-correct' : 'feedback-wrong'}`}>
            <span className="feedback-icon">{selectedOpt === q.correctDef ? '🎉' : '💥'}</span>
            <span className="feedback-text">
              {selectedOpt === q.correctDef ? "Spot on! That's correct." : "Oops! Not quite right."}
            </span>
          </div>
        )}
        {isAnswering && selectedOpt === null && (
          <div className="feedback-bar feedback-wrong">
            <span className="feedback-icon">⏰</span>
            <span className="feedback-text">Time&apos;s up! You took too long.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;
