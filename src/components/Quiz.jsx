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

const TIMER_SECONDS = 15; // Faster pace for more excitement
const MAX_LIVES = 3;

const Quiz = ({ words, onClose }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Gameplay State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [shake, setShake] = useState(false);

  // 1. Build Quiz Data with AI Distractors
  useEffect(() => {
    const buildQuiz = async () => {
      setLoading(true);
      const results = [];
      const selectedWords = shuffle(words).slice(0, 10);

      for (const word of selectedWords) {
        try {
          // Get correct meaning
          const data = await fetchWordMeaning(word);
          const correctDef = data?.definition ?? "Meaning not found.";

          // Try to get AI distractors
          let distractors = [];
          try {
            const distRes = await fetch("/api/quiz-distractors", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ word, correctDef }),
            });
            if (distRes.ok) {
              const distData = await distRes.json();
              distractors = distData.distractors;
            }
          } catch {
            console.warn("AI distractors failed, using fallbacks");
          }

          // Fallback distractors if AI failed
          if (!distractors || distractors.length < 3) {
            distractors = [
              "A secret technique for folding socks perfectly",
              "The sudden urge to run away from an awkward conversation",
              "A magical spell used to summon fresh pizza",
            ];
          }

          const options = shuffle([correctDef, ...distractors]);
          results.push({ word, correctDef, options });
        } catch {
          console.error("Error building question for:", word);
        }
      }

      setQuestions(results);
      setLoading(false);
    };
    buildQuiz();
  }, [words]);

  // 2. Gameplay logic
  const handleSelect = useCallback((option) => {
    if (isAnswering || quizFinished) return;
    setIsAnswering(true);
    setSelectedOpt(option);

    const q = questions[currentIndex];
    const isCorrect = option === q.correctDef;

    if (isCorrect) {
      const speedBonus = Math.floor(timeLeft / 2);
      const streakBonus = streak * 5;
      setScore(s => s + 10 + speedBonus + streakBonus);
      setStreak(s => s + 1);
    } else {
      setLives(l => l - 1);
      setStreak(0);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      
      if (lives <= 1) {
        setTimeout(() => setQuizFinished(true), 1500);
        return;
      }
    }

    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(c => c + 1);
        setTimeLeft(TIMER_SECONDS);
        setSelectedOpt(null);
        setIsAnswering(false);
      } else {
        setQuizFinished(true);
      }
    }, 1500);
  }, [isAnswering, questions, currentIndex, timeLeft, streak, lives, quizFinished]);

  // Timer
  useEffect(() => {
    if (loading || quizFinished || isAnswering || questions.length === 0) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          handleSelect(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, quizFinished, isAnswering, questions, handleSelect]);

  if (loading) return (
    <div className="quiz-overlay">
      <div className="quiz-card session-end-card">
        <div className="loader-ring" />
        <p className="loading-text">Generating AI Quiz...</p>
      </div>
    </div>
  );

  if (quizFinished) {
    const isVictory = lives > 0;
    return (
      <div className="quiz-overlay">
        <div className="quiz-card session-end-card">
          <div className="se-glow" />
          <span className="se-confetti">{isVictory ? "👑" : "💀"}</span>
          <h2>{isVictory ? "Quiz Mastered!" : "Game Over"}</h2>
          <p className="se-stat">Final Score: <strong>{score}</strong></p>
          <p className="se-stat">Correct Answers: <strong>{questions.length - (MAX_LIVES - lives)}</strong></p>
          <div className="se-actions">
            <button className="btn-quiz se-btn-main" onClick={onClose}>
              Awesome!
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];

  return (
    <div className="quiz-overlay">
      <div className={`quiz-card game-quiz-card ${shake ? 'shake-anim' : ''}`}>
        <button className="quiz-close" onClick={onClose}>×</button>
        
        {/* Top Info Bar */}
        <div className="game-header">
          <div className="game-lives">
            {[...Array(MAX_LIVES)].map((_, i) => (
              <span key={i} className={`heart ${i < lives ? 'heart-full' : 'heart-empty'}`}>
                {i < lives ? '❤️' : '🖤'}
              </span>
            ))}
          </div>
          <div className="game-streak">
            {streak >= 2 && <span className="streak-badge">🔥 {streak} STREAK</span>}
          </div>
          <div className="game-score">
            <span className="score-label">POINTS</span>
            <span className="score-value">{score}</span>
          </div>
        </div>

        {/* Timer Bar */}
        <div className="timer-container">
          <div 
            className={`timer-fill ${timeLeft < 5 ? 'timer-low' : ''}`} 
            style={{ width: `${(timeLeft / TIMER_SECONDS) * 100}%` }} 
          />
        </div>

        <div className="game-content">
          <div className="question-zone">
            <span className="q-label">QUESTION {currentIndex + 1}/10</span>
            <h2 className="q-word">&quot;{q.word}&quot;</h2>
          </div>

          <div className="options-grid game-grid">
            {q.options.map((opt, i) => {
              let state = "";
              if (isAnswering) {
                if (opt === q.correctDef) state = "correct";
                else if (opt === selectedOpt) state = "wrong";
                else state = "dimmed";
              }

              return (
                <button
                  key={i}
                  className={`option-box state-${state}`}
                  onClick={() => handleSelect(opt)}
                  disabled={isAnswering}
                >
                  <span className="option-index">{String.fromCharCode(65 + i)}</span>
                  <span className="option-text">{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
