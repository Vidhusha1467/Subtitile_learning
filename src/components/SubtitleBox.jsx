/* eslint-disable react/prop-types */
import { useState, useCallback, useRef, useEffect } from "react";
import { fetchWordMeaning } from "../utils/dictionaryApi";

/**
 * SubtitleBox — displays the currently active subtitle line.
 * Click a word → compact tooltip with one-line meaning + "Define" / "Save" buttons.
 * "Define" expands to show full definition, part of speech, and example.
 *
 * Props:
 *   subtitle    : { id, text, start, end } | null
 *   onSaveWord  : (word: string) => void
 */
const SubtitleBox = ({ subtitle, onSaveWord }) => {
  const [popup, setPopup] = useState(null);
  // popup: { word, data, loading, expanded, anchorIndex }
  const popupRef = useRef(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setPopup(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close popup when subtitle changes
  useEffect(() => {
    setPopup(null);
  }, [subtitle?.id]);

  const handleWordClick = useCallback(async (word, idx) => {
    const clean = word.replace(/[^a-zA-Z'-]/g, "");
    if (!clean) return;

    // If clicking the same word, toggle off
    if (popup && popup.anchorIndex === idx) {
      setPopup(null);
      return;
    }

    // Show loading state
    setPopup({ word: clean, data: null, loading: true, expanded: false, anchorIndex: idx });

    // Pass the full subtitle text as context
    const data = await fetchWordMeaning(clean, subtitle?.text || "");
    setPopup({ word: clean, data, loading: false, expanded: false, anchorIndex: idx });
  }, [popup, subtitle]);

  const handleExpand = () => {
    setPopup((prev) => prev ? { ...prev, expanded: true } : prev);
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
      <div className="subtitle-line">
        {words.map((word, idx) => (
          <span key={idx} className="word-wrapper">
            <span
              className={`subtitle-word ${popup?.anchorIndex === idx ? "word-active" : ""}`}
              onClick={() => handleWordClick(word, idx)}
            >
              {word}
            </span>

            {/* Popup anchored to this word */}
            {popup && popup.anchorIndex === idx && (
              <div className="word-popup" ref={popupRef}>
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
                    <span>No definition found for &ldquo;{popup.word}&rdquo;</span>
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
    </div>
  );
};

export default SubtitleBox;
