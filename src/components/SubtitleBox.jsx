import { useState, useCallback, useRef, useEffect } from "react";
import { fetchWordMeaning } from "../utils/dictionaryApi";

/**
 * SubtitleBox — displays the currently active subtitle line.
 * Hover a word → tooltip with meaning from the free Dictionary API.
 *
 * Props:
 *   subtitle    : { id, text, start, end } | null
 *   onSaveWord  : (word: string) => void
 *   videoRef    : ref to video element
 *   targetLanguage : string
 */
const SubtitleBox = ({ subtitle, onSaveWord, videoRef, targetLanguage }) => {
  const [popup, setPopup] = useState(null);
  const [translatedLine, setTranslatedLine] = useState("");
  const [translating, setTranslating] = useState(false);
  // popup: { word, data, loading, expanded, anchorIndex }
  const popupRef = useRef(null);

  // Close popup and reset translation when subtitle changes
  useEffect(() => {
    setPopup(null);
    if (!subtitle || !targetLanguage || targetLanguage === "none") {
      setTranslatedLine("");
      return;
    }

    const translateText = async () => {
      setTranslating(true);
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: subtitle.text, targetLanguage }),
        });
        const data = await res.json();
        if (data.translatedText) {
          setTranslatedLine(data.translatedText);
        }
      } catch (err) {
        console.error("Translation failed:", err);
      } finally {
        setTranslating(false);
      }
    };
    translateText();
  }, [subtitle, targetLanguage]);

  const handleWordHover = useCallback(
    async (word, idx) => {
      const clean = word.replace(/[^a-zA-Z'-]/g, "");
      if (!clean) return;

      // Pause video when word is hovered
      if (videoRef?.current) {
        videoRef.current.pause();
      }

      // If already hovering the same word, do nothing
      if (popup && popup.anchorIndex === idx) return;

      // Show loading state
      setPopup({ word: clean, data: null, loading: true, expanded: false, anchorIndex: idx });

      // Fetch from free Dictionary API directly
      const data = await fetchWordMeaning(clean);

      setPopup((prev) => {
        if (prev && prev.anchorIndex === idx) {
          return { ...prev, data, loading: false };
        }
        return prev;
      });
    },
    [popup, videoRef]
  );

  const handleExpand = () => {
    setPopup((prev) => (prev ? { ...prev, expanded: true } : prev));
  };

  const handleSave = () => {
    if (popup?.word) {
      onSaveWord(popup.word);
    }
  };

  if (!subtitle) {
    return (
      <div className="subtitle-box subtitle-empty">
        <span className="subtitle-idle">♪ Subtitles will appear here ♪</span>
      </div>
    );
  }

  const words = subtitle.text.split(" ");

  return (
    <div className="subtitle-box">
      <div className="subtitle-helper">✨ Hover any word to define</div>
      <div className="subtitle-line">
        {words.map((word, idx) => (
          <span
            key={idx}
            className="word-wrapper"
            onMouseLeave={() => {
              window.wordLeaveTimer = setTimeout(() => {
                setPopup(null);
                if (videoRef?.current) videoRef.current.play();
              }, 300);
            }}
          >
            <span
              className={`subtitle-word ${popup?.anchorIndex === idx ? "word-active" : ""}`}
              style={{ pointerEvents: "auto" }}
              onMouseEnter={() => {
                if (window.wordLeaveTimer) clearTimeout(window.wordLeaveTimer);
                handleWordHover(word, idx);
              }}
              onMouseOver={() => {
                if (window.wordLeaveTimer) clearTimeout(window.wordLeaveTimer);
              }}
              onClick={(e) => {
                e.stopPropagation();
                const clean = word.replace(/[^a-zA-Z'-]/g, "");
                if (clean) onSaveWord(clean);
              }}
            >
              {word}
            </span>

            {/* Tooltip anchored to this word */}
            {popup && popup.anchorIndex === idx && (
              <div
                className="word-popup"
                ref={popupRef}
                onMouseEnter={() => {
                  if (window.wordLeaveTimer) clearTimeout(window.wordLeaveTimer);
                }}
                onMouseLeave={() => {
                  window.wordLeaveTimer = setTimeout(() => {
                    setPopup(null);
                    if (videoRef?.current) videoRef.current.play();
                  }, 300);
                }}
              >
                {popup.loading ? (
                  <div className="popup-compact">
                    <span className="popup-spinner" />
                    <span className="popup-loading-text">Looking up…</span>
                  </div>
                ) : popup.data ? (
                  <>
                    {/* Compact one-line view */}
                    <div className="popup-compact">
                      <span className="popup-word">{popup.data.word}</span>
                      <span className="popup-brief">
                        {popup.data.definition.length > 60
                          ? popup.data.definition.slice(0, 57) + "…"
                          : popup.data.definition}
                      </span>
                    </div>

                    {/* Expanded view */}
                    {popup.expanded && (
                      <div className="popup-expanded">
                        {popup.data.partOfSpeech && (
                          <span className="popup-pos">{popup.data.partOfSpeech}</span>
                        )}
                        <p className="popup-full-def">{popup.data.definition}</p>
                        {popup.data.example && (
                          <p className="popup-example">
                            <span className="popup-ex-label">Example:</span> &ldquo;{popup.data.example}&rdquo;
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="popup-actions">
                      {!popup.expanded && (
                        <button className="popup-btn popup-btn-define" onClick={handleExpand}>
                          📖 Define
                        </button>
                      )}
                      <button className="popup-btn popup-btn-save" onClick={handleSave}>
                        💾 Save Word
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="popup-compact popup-notfound">
                    <span>Meaning not found for &ldquo;{popup.word}&rdquo;</span>
                    <button className="popup-btn popup-btn-save" onClick={handleSave}>
                      💾 Save Anyway
                    </button>
                  </div>
                )}

                {/* Arrow */}
                <div className="popup-arrow" />
              </div>
            )}
          </span>
        ))}
      </div>

      {/* ── Translated Subtitle ── */}
      {targetLanguage && targetLanguage !== "none" && subtitle?.text && (
        <div
          className="translated-subtitle"
          style={{
            fontSize: "1.2rem",
            color: "var(--yellow)",
            marginTop: "12px",
            fontWeight: 500,
            opacity: translating ? 0.5 : 1,
            fontStyle: "italic",
            background: "rgba(0,0,0,0.6)",
            padding: "6px 16px",
            borderRadius: "8px",
            display: "inline-block",
          }}
        >
          {translating ? "Translating..." : translatedLine}
        </div>
      )}
    </div>
  );
};

export default SubtitleBox;
