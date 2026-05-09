import { useState } from "react";

const YoutubePage = ({ onSubmit, onBackToDashboard }) => {
  const [url,   setUrl]   = useState("");
  const [error, setError] = useState("");

  const isValid = (u) =>
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/.test(u.trim());

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim()) { setError("Please paste a YouTube URL."); return; }
    if (!isValid(url)) { setError("That doesn't look like a valid YouTube link. Try again."); return; }
    setError("");
    onSubmit(url.trim());
  };

  return (
    <div className="upload-page-root">
      {/* Header */}
      <header className="dash-header">
        <div className="dash-logo">
          <span>🎬</span>
          <span className="dash-logo-text">SubLearn</span>
        </div>
        <button className="auth-back-btn" onClick={onBackToDashboard}>
          ← Back to Dashboard
        </button>
      </header>

      {/* Body */}
      <main className="upload-page-main">
        <div className="upload-page-card">

          {/* Title */}
          <div className="upload-page-title-row">
            <span className="upload-page-icon">▶️</span>
            <div>
              <h1 className="upload-page-title">YouTube Video</h1>
              <p className="upload-page-sub">Paste a YouTube URL to start learning with interactive captions</p>
            </div>
          </div>

          {/* URL form */}
          <form onSubmit={handleSubmit} className="yt-page-form">
            <label className="yt-page-label">YouTube URL</label>
            <div className={`yt-page-input-wrap ${error ? "error" : url && isValid(url) ? "valid" : ""}`}>
              <span className="yt-page-icon-left">🔗</span>
              <input
                className="yt-page-input"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(""); }}
                autoFocus
              />
              {url && isValid(url) && <span className="yt-page-valid-tick">✅</span>}
            </div>
            {error && <p className="yt-page-error">⚠️ {error}</p>}

            {/* Preview pill */}
            {url && isValid(url) && (
              <div className="yt-page-preview">
                <span className="yt-page-preview-icon">▶</span>
                <span className="yt-page-preview-text">
                  {url.length > 52 ? url.slice(0, 50) + "…" : url}
                </span>
              </div>
            )}

            {/* Tips */}
            <div className="yt-page-tips">
              <div className="yt-page-tip">✅ Any public YouTube video</div>
              <div className="yt-page-tip">✅ Auto-fetches closed captions</div>
              <div className="yt-page-tip">✅ Every word becomes interactive</div>
            </div>

            <button
              type="submit"
              className={`upload-start-btn ${!url || !isValid(url) ? "disabled" : ""}`}
              disabled={!url || !isValid(url)}
            >
              ▶ Start Learning
            </button>
          </form>

        </div>
      </main>
    </div>
  );
};

export default YoutubePage;
