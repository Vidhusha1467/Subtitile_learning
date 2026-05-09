import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { fetchWordMeaning } from "../utils/dictionaryApi";

/**
 * SubtitleBox — displays the current subtitle line BELOW the video.
 * • Each word is individually wrapped.
 * • The currently spoken word is highlighted in real-time using either
 *   word-level timestamps (if `subtitle.words` is provided by AssemblyAI)
 *   or a proportional estimate based on playback position.
 *
 * Props:
 *   subtitle       : { id, text, start, end, words? } | null
 *   currentTime    : number  (seconds, from video.currentTime)
 *   onSaveWord     : (word: string) => void
 *   videoRef       : ref to <video> element
 *   targetLanguage : string
 */
const SubtitleBox = ({ subtitle, currentTime, onSaveWord, videoRef, targetLanguage }) => {
  const [popup,          setPopup]          = useState(null);
  const [translatedLine, setTranslatedLine] = useState("");
  const [translating,    setTranslating]    = useState(false);
  const popupRef = useRef(null);

  // ── Close popup & reset translation when subtitle changes ──────────────
  useEffect(() => {
    setPopup(null);
    if (!subtitle || !targetLanguage || targetLanguage === "none") {
      setTranslatedLine("");
      return;
    }
    const translateText = async () => {
      setTranslating(true);
      try {
        const res  = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: subtitle.text, targetLanguage }),
        });
        const data = await res.json();
        if (data.translatedText) setTranslatedLine(data.translatedText);
      } catch (err) {
        console.error("Translation failed:", err);
      } finally {
        setTranslating(false);
      }
    };
    translateText();
  }, [subtitle, targetLanguage]);

  // ── Real-time active word index ─────────────────────────────────────────
  const activeWordIdx = useMemo(() => {
    if (!subtitle || currentTime == null) return -1;

    const words = subtitle.words; // array of { text, start, end } in ms — from AssemblyAI

    if (words && words.length > 0) {
      // Precise: use AssemblyAI word-level timestamps (ms → sec)
      const ms = currentTime * 1000;
      const idx = words.findIndex(w => ms >= w.start && ms <= w.end);
      return idx;
    }

    // Fallback: proportional estimate across subtitle duration
    const progress = (currentTime - subtitle.start) / (subtitle.end - subtitle.start);
    const wordCount = subtitle.text.trim().split(/\s+/).length;
    return Math.min(Math.floor(progress * wordCount), wordCount - 1);
  }, [subtitle, currentTime]);

  // ── Hover handlers ──────────────────────────────────────────────────────
  const handleWordHover = useCallback(async (word, idx) => {
    const clean = word.replace(/[^a-zA-Z'-]/g, "");
    if (!clean) return;
    if (videoRef?.current) videoRef.current.pause();

    let alreadyActive = false;
    setPopup(prev => {
      if (prev && prev.anchorIndex === idx) { alreadyActive = true; return prev; }
      return { word: clean, data: null, loading: true, expanded: false, anchorIndex: idx };
    });
    if (alreadyActive) return;

    const data = await fetchWordMeaning(clean);
    setPopup(prev =>
      prev && prev.anchorIndex === idx ? { ...prev, data, loading: false } : prev
    );
  }, [videoRef]);

  const handleExpand = () => setPopup(prev => prev ? { ...prev, expanded: true } : prev);
  const handleSave   = () => { if (popup?.word) onSaveWord(popup.word); };

  // ── Empty state ─────────────────────────────────────────────────────────
  if (!subtitle) {
    return (
      <div className="subtitle-track subtitle-track--empty">
        <span className="subtitle-idle-icon">♪</span>
        <span className="subtitle-idle-text">Subtitles will appear here as the video plays</span>
      </div>
    );
  }

  const rawWords = subtitle.text.trim().split(/\s+/);

  return (
    <div className="subtitle-track">
      {/* Helper hint */}
      <div className="subtitle-hint">✨ Hover any word for instant definition</div>

      {/* Word-by-word line */}
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
                onMouseEnter={() => {
                  if (window.wordLeaveTimer) clearTimeout(window.wordLeaveTimer);
                  handleWordHover(word, idx);
                }}
                onMouseLeave={() => {
                  window.wordLeaveTimer = setTimeout(() => {
                    setPopup(null);
                    if (videoRef?.current) videoRef.current.play();
                  }, 300);
                }}
                onClick={e => {
                  e.stopPropagation();
                  const clean = word.replace(/[^a-zA-Z'-]/g, "");
                  if (clean) onSaveWord(clean);
                }}
              >
                {word}
              </span>

              {/* Dictionary popup anchored to this word */}
              {isActive && (
                <div
                  className="word-popup"
                  ref={popupRef}
                  onMouseEnter={() => { if (window.wordLeaveTimer) clearTimeout(window.wordLeaveTimer); }}
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
                      <div className="popup-compact">
                        <span className="popup-word">{popup.data.word}</span>
                        <span className="popup-brief">
                          {popup.data.definition.length > 60
                            ? popup.data.definition.slice(0, 57) + "…"
                            : popup.data.definition}
                        </span>
                      </div>
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
                  <div className="popup-arrow" />
                </div>
              )}
            </span>
          );
        })}
      </div>

      {/* Translation line */}
      {targetLanguage && targetLanguage !== "none" && subtitle?.text && (
        <div className="subtitle-translation">
          {translating ? "Translating…" : translatedLine}
        </div>
      )}
    </div>
  );
};

export default SubtitleBox;
