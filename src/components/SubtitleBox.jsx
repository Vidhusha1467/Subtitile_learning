import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { fetchWordMeaning } from "../utils/dictionaryApi";

/**
 * SubtitleBox — subtitle overlay inside the video.
 * • Each word is hoverable → rich popup (phonetic, POS, definition).
 * • Video NEVER pauses — immersive learning.
 * • The current spoken word is highlighted in real-time.
 */
const SubtitleBox = ({ subtitle, currentTime, onSaveWord, videoRef, targetLanguage }) => {
  const [popup,          setPopup]          = useState(null);
  const [translatedLine, setTranslatedLine] = useState("");
  const [translating,    setTranslating]    = useState(false);
  const hideTimer = useRef(null);

  // ── Translation ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!subtitle || !targetLanguage || targetLanguage === "none") {
      // Use setTimeout to avoid "cascading renders" synchronous warning
      const timer = setTimeout(() => setTranslatedLine(""), 0);
      return () => clearTimeout(timer);
    }
    const run = async () => {
      setTranslating(true);
      try {
        const res  = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: subtitle.text, targetLanguage }),
        });
        const data = await res.json();
        if (data.translatedText) setTranslatedLine(data.translatedText);
      } catch {/* silent */} finally { setTranslating(false); }
    };
    run();
  }, [subtitle, targetLanguage, setTranslatedLine]);

  // ── Real-time active word index ────────────────────────────────────────
  const activeWordIdx = useMemo(() => {
    if (!subtitle || currentTime == null) return -1;
    const words = subtitle.words; // AssemblyAI word-level timestamps (ms)
    if (words?.length) {
      const ms  = currentTime * 1000;
      const idx = words.findIndex(w => ms >= w.start && ms <= w.end);
      return idx;
    }
    const progress  = (currentTime - subtitle.start) / (subtitle.end - subtitle.start);
    const wordCount = subtitle.text.trim().split(/\s+/).length;
    return Math.min(Math.floor(progress * wordCount), wordCount - 1);
  }, [subtitle, currentTime]);

  // ── Hover — pause video on hover, resume on leave ──────────────────
  const handleWordHover = useCallback(async (word, idx) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const clean = word.replace(/[^a-zA-Z'-]/g, "");
    if (!clean) return;

    // Pause video
    if (videoRef?.current) {
      videoRef.current.pause();
    }

    // Show loading state immediately
    setPopup({ word: clean, data: null, loading: true, anchorIndex: idx });

    const data = await fetchWordMeaning(clean, subtitle?.text || "");
    // Only update if user is still hovering the same word
    setPopup(prev =>
      prev?.anchorIndex === idx ? { ...prev, data, loading: false } : prev
    );
  }, [videoRef, subtitle, setPopup]);

  const handleWordLeave = useCallback(() => {
    hideTimer.current = setTimeout(() => {
      setPopup(null);
      // Resume video
      if (videoRef?.current) {
        videoRef.current.play();
      }
    }, 250);
  }, [videoRef, setPopup]);

  const handlePopupEnter = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const handleSave = useCallback(() => { 
    if (popup?.word) onSaveWord(popup.word); 
  }, [popup, onSaveWord]);

  // ── Empty state ────────────────────────────────────────────────────────
  if (!subtitle) {
    return (
      <div className="subtitle-track subtitle-track--empty">
        <span className="subtitle-idle-icon">♪</span>
        <span className="subtitle-idle-text">Subtitles will appear here</span>
      </div>
    );
  }

  const rawWords = subtitle.text.trim().split(/\s+/);

  return (
    <div className="subtitle-track">
      {/* Hint */}
      <div className="subtitle-hint">✨ Hover any word for instant definition</div>

      {/* Words */}
      <div className="subtitle-line">
        {rawWords.map((word, idx) => {
          const isCurrent = idx === activeWordIdx;
          const isActive  = popup?.anchorIndex === idx;
          return (
            <span key={idx} className="word-wrapper">
              <span
                className={[
                  "subtitle-word",
                  isCurrent ? "word-current" : "",
                  isActive   ? "word-active"   : "",
                ].join(" ").trim()}
                onMouseEnter={() => handleWordHover(word, idx)}
                onMouseLeave={handleWordLeave}
                onClick={e => {
                  e.stopPropagation();
                  const clean = word.replace(/[^a-zA-Z'-]/g, "");
                  if (clean) onSaveWord(clean);
                }}
              >
                {word}
              </span>

              {/* ── Rich Definition Popup ── */}
              {isActive && (
                <div
                  className="word-popup"
                  onMouseEnter={handlePopupEnter}
                  onMouseLeave={handleWordLeave}
                >
                  {popup.loading ? (
                    <div className="popup-loading-row">
                      <span className="popup-spinner" />
                      <span className="popup-loading-text">Looking up <em>{popup.word}</em>…</span>
                    </div>
                  ) : popup.data ? (
                    <>
                      {/* Header row */}
                      <div className="popup-header">
                        <div className="popup-word-row">
                          <span className="popup-word">{popup.data.word}</span>
                        </div>
                        {popup.data.partOfSpeech && (
                          <span className="popup-pos">{popup.data.partOfSpeech}</span>
                        )}
                      </div>

                      {/* Definition */}
                      <div className="popup-body">
                        <p className="popup-definition">{popup.data.definition}</p>
                        {popup.data.example && (
                          <p className="popup-example">
                            <span className="popup-ex-label">Example</span>
                            &ldquo;{popup.data.example}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="popup-actions">
                        <button className="popup-btn popup-btn-save" onClick={handleSave}>
                          💾 Save Word
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="popup-loading-row popup-notfound">
                      <span>No definition found for &ldquo;{popup.word}&rdquo;</span>
                      <button className="popup-btn popup-btn-save" onClick={handleSave}>
                        💾 Save Anyway
                      </button>
                    </div>
                  )}
                  <div className="popup-arrow" />
                </div>
              )}
            </span>
          );
        })}
      </div>

      {/* Translation */}
      {targetLanguage && targetLanguage !== "none" && subtitle?.text && (
        <div className="subtitle-translation">
          {translating ? "Translating…" : translatedLine}
        </div>
      )}
    </div>
  );
};

export default SubtitleBox;
