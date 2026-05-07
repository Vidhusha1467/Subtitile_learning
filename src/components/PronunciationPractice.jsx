import { useState, useEffect, useRef } from 'react';

const PronunciationPractice = ({ word, onClose }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [score, setScore] = useState(null);
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Your browser does not support Speech Recognition. Please use Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const speechResult = event.results[0][0].transcript.toLowerCase().replace(/[.,!?]/g, '');
      setTranscript(speechResult);
      setIsListening(false);
      // Auto-submit immediately after speech is detected
      const targetWord = word.toLowerCase().replace(/[.,!?]/g, '');
      if (speechResult === targetWord) {
        setScore(100);
      } else if (speechResult.includes(targetWord) || targetWord.includes(speechResult)) {
        setScore(80);
      } else {
        setScore(30);
      }
    };

    recognition.onspeechend = () => {
      recognition.stop();
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      setError(`Microphone error: ${event.error}`);
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, [word]);

  const toggleListen = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      setScore(null);
      setError("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmit = () => {
    if (!transcript) return;
    const targetWord = word.toLowerCase().replace(/[.,!?]/g, '');
    if (transcript === targetWord) {
      setScore(100);
    } else if (transcript.includes(targetWord) || targetWord.includes(transcript)) {
      setScore(80);
    } else {
      setScore(30);
    }
  };

  const handleTryAgain = () => {
    setTranscript("");
    setScore(null);
    setError("");
  };

  const getScoreMessage = () => {
    if (score === null) return null;
    if (score === 100) return { text: "Perfect! 🎉", color: "#22c55e" };
    if (score >= 80) return { text: "Almost there! 👍", color: "#eab308" };
    return { text: "Keep practicing! 💪", color: "#ef4444" };
  };

  const scoreMsg = getScoreMessage();

  return (
    <div className="quiz-modal-overlay" style={{ zIndex: 1000 }}>
      <div className="quiz-modal practice-modal" style={{ maxWidth: '420px' }}>
        <div className="quiz-header">
          <h3>🎙️ Pronunciation Practice</h3>
          <button className="quiz-close" onClick={onClose}>✕</button>
        </div>

        <div className="quiz-body" style={{ textAlign: 'center', padding: '30px' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '10px' }}>Say this word out loud:</p>
          <h2 style={{ fontSize: '2.5rem', margin: '0 0 30px 0', color: 'var(--text-primary)' }}>{word}</h2>

          {/* Mic Button — only show when not scored yet */}
          {score === null && (
            <>
              <button
                className={`mic-btn ${isListening ? 'listening' : ''}`}
                onClick={toggleListen}
                disabled={!!error}
                style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  background: isListening
                    ? 'rgba(255, 94, 122, 0.2)'
                    : 'linear-gradient(135deg, var(--accent), #8b5cf6)',
                  border: isListening ? '2px solid #ef4444' : 'none',
                  fontSize: '2rem', cursor: 'pointer',
                  color: isListening ? '#ef4444' : 'white',
                  boxShadow: isListening
                    ? '0 0 20px rgba(255,94,122,0.4)'
                    : '0 4px 15px var(--accent-glow)',
                  transition: 'all 0.3s ease',
                  marginBottom: '12px',
                  animation: isListening ? 'pulse 1.5s infinite' : 'none'
                }}
              >
                {isListening ? '🛑' : '🎤'}
              </button>

              <p style={{
                fontSize: '0.9rem',
                color: isListening ? '#ef4444' : 'var(--text-muted)',
                minHeight: '24px',
                marginBottom: '20px'
              }}>
                {isListening
                  ? "Listening... speak now 🎙️"
                  : transcript
                    ? `You said: "${transcript}"`
                    : "Click the mic to speak"}
              </p>

          {/* Re-record button shown only after transcript captured (before score shows) */}
              {transcript && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                  <button
                    onClick={handleTryAgain}
                    style={{
                      padding: '10px 20px', borderRadius: '10px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)', cursor: 'pointer',
                      fontSize: '0.95rem', transition: 'all 0.2s ease'
                    }}
                  >
                    🔄 Re-record
                  </button>
                </div>
              )}
            </>
          )}

          {/* Error message */}
          {error && (
            <div style={{
              marginTop: '20px', padding: '10px',
              background: 'rgba(255,94,122,0.1)',
              color: '#ef4444', borderRadius: '8px', fontSize: '0.85rem'
            }}>
              {error}
            </div>
          )}

          {/* Score Result */}
          {score !== null && scoreMsg && (
            <div style={{
              marginTop: '10px', padding: '24px',
              background: 'rgba(0,0,0,0.25)',
              borderRadius: '16px', border: '1px solid var(--border)'
            }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>You said:</p>
              <p style={{
                fontSize: '1.3rem', fontWeight: 'bold',
                color: 'var(--text-primary)', margin: '0 0 20px 0'
              }}>
                "{transcript}"
              </p>

              <div style={{
                fontSize: '3rem', fontWeight: '800',
                color: scoreMsg.color,
                textShadow: `0 0 20px ${scoreMsg.color}40`
              }}>
                {score}%
              </div>
              <p style={{
                fontWeight: 'bold', color: scoreMsg.color,
                marginTop: '6px', fontSize: '1.1rem'
              }}>
                {scoreMsg.text}
              </p>

              <button
                onClick={handleTryAgain}
                style={{
                  marginTop: '20px', padding: '10px 24px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
                  border: 'none', color: 'white', cursor: 'pointer',
                  fontSize: '0.95rem', fontWeight: '700',
                  boxShadow: '0 4px 15px var(--accent-glow)'
                }}
              >
                🔄 Try Again
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0%   { transform: scale(1);   box-shadow: 0 0 0 0  rgba(255,94,122,0.4); }
          70%  { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(255,94,122,0); }
          100% { transform: scale(1);   box-shadow: 0 0 0 0  rgba(255,94,122,0); }
        }
      `}</style>
    </div>
  );
};

export default PronunciationPractice;
