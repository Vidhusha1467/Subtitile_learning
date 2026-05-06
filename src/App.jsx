import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import SubtitleBox from "./components/SubtitleBox";
import SavedWords from "./components/SavedWords";
import Quiz from "./components/Quiz";
import "./index.css";

// API base path: Vite proxy forwards /api/* → http://localhost:3000/api/*

const STATUS = {
  IDLE:         "idle",
  UPLOADING:    "uploading",
  TRANSCRIBING: "transcribing",
  DONE:         "done",
  ERROR:        "error",
};

const App = () => {
  const videoRef = useRef(null);
  const wrapperRef = useRef(null);

  // ── Auth State ──
  const [user, setUser]           = useState(null);
  const [authMode, setAuthMode]   = useState("login");  // "login" | "signup" | "forgot"
  const [authForm, setAuthForm]   = useState({ name: "", email: "", password: "" });
  const [authSuccess, setAuthSuccess] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // ── App State ──
  const [videoSrc,       setVideoSrc]    = useState(null);
  const [videoName,      setVideoName]   = useState("");
  const [currentTime,    setCurrentTime] = useState(0);
  const [subtitles,      setSubtitles]   = useState([]);

  const [txStatus,       setTxStatus]    = useState(STATUS.IDLE);
  const [txMessage,      setTxMessage]   = useState("");
  const [progress,       setProgress]    = useState(0);
  const [savedWords,     setSavedWords]  = useState([]);
  const [showQuiz,       setShowQuiz]    = useState(false);

  /* ── Derive active subtitle (computed during render) ── */
  const activeSubtitle = useMemo(() => {
    return subtitles.find(
      s => currentTime >= s.start && currentTime < s.end
    ) ?? null;
  }, [currentTime, subtitles]);

  /* ── Auth handlers ── */
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);

    try {
      let endpoint, body;

      if (authMode === "forgot") {
        endpoint = "/api/forgot-password";
        body = { email: authForm.email, newPassword: authForm.password };
      } else if (authMode === "signup") {
        endpoint = "/signup";
        body = { name: authForm.name, email: authForm.email, password: authForm.password };
      } else {
        endpoint = "/login";
        body = { email: authForm.email, password: authForm.password };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Authentication failed");
      }

      if (authMode === "forgot") {
        setAuthSuccess("Password reset successful! You can now sign in.");
        setAuthForm({ name: "", email: "", password: "" });
        setTimeout(() => { setAuthMode("login"); setAuthSuccess(""); }, 2000);
      } else {
        setUser(data.user || { name: authForm.name || authForm.email, email: authForm.email });
        setAuthForm({ name: "", email: "", password: "" });
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  /* ── Upload + transcribe ── */
  const handleVideoUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Revoke previous object URL if any
    setVideoSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setVideoName(file.name);
    setCurrentTime(0);
    setSubtitles([]);
    setSavedWords([]);
    setShowQuiz(false);
    setProgress(0);

    // ── Upload to backend ──
    setTxStatus(STATUS.UPLOADING);
    setTxMessage("📤 Uploading video to server…");

    const formData = new FormData();
    formData.append("video", file);

    try {
      // Track upload progress via XHR
      const subs = await uploadWithProgress(formData, (pct) => {
        setProgress(pct);
        if (pct < 100) {
          setTxMessage(`📤 Uploading… ${pct}%`);
        } else {
          setTxStatus(STATUS.TRANSCRIBING);
          setTxMessage("🎙 Transcribing with AssemblyAI — this may take 1–2 minutes…");
        }
      });

      setSubtitles(subs);
      setTxStatus(STATUS.DONE);
      setTxMessage(`✅ ${subs.length} captions generated from your video!`);

    } catch (err) {
      setTxStatus(STATUS.ERROR);
      setTxMessage(`❌ ${err.message}`);
    }
  }, []);

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleSaveWord = (word) => {
    setSavedWords(prev => prev.includes(word) ? prev : [...prev, word]);
  };

  const isProcessing = txStatus === STATUS.UPLOADING || txStatus === STATUS.TRANSCRIBING;

  /* ── Fullscreen: toggle on the wrapper so subtitles stay visible ── */
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (wrapperRef.current) {
      wrapperRef.current.requestFullscreen();
    }
  };

  /* ── Auth Screen ── */
  if (!user) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-left">
            <div className="logo">
              <span className="logo-icon">🎬</span>
              <span className="logo-text">SubLearn</span>
            </div>
            <p className="tagline">Real AI Captions · Vocabulary · Quiz</p>
          </div>
        </header>

        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <h2>
                {authMode === "login" ? "Welcome Back"
                  : authMode === "signup" ? "Create Account"
                  : "Reset Password"}
              </h2>
              <p className="auth-subtitle">
                {authMode === "login"
                  ? "Sign in to start learning with subtitles"
                  : authMode === "signup"
                  ? "Join SubLearn and start your vocabulary journey"
                  : "Enter your email and a new password"}
              </p>
            </div>

            <form className="auth-form" onSubmit={handleAuthSubmit} key={authMode}>
              {authMode === "signup" && (
                <div className="form-group">
                  <label htmlFor="auth-name">Name</label>
                  <input
                    id="auth-name"
                    type="text"
                    placeholder="Your name"
                    autoComplete="name"
                    value={authForm.name}
                    onChange={(e) => setAuthForm(p => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="auth-email">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm(p => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="auth-password">
                  {authMode === "forgot" ? "New Password" : "Password"}
                </label>
                <input
                  id="auth-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete={authMode === "login" ? "current-password" : "new-password"}
                  value={authForm.password}
                  onChange={(e) => setAuthForm(p => ({ ...p, password: e.target.value }))}
                  required
                  minLength={4}
                />
              </div>

              {authError && <div className="auth-error">⚠ {authError}</div>}
              {authSuccess && <div className="auth-success">✅ {authSuccess}</div>}

              <button
                type="submit"
                className="btn btn-quiz auth-submit-btn"
                disabled={authLoading}
              >
                {authLoading
                  ? "Please wait…"
                  : authMode === "login" ? "Sign In →"
                  : authMode === "signup" ? "Create Account →"
                  : "Reset Password →"}
              </button>
            </form>

            {authMode === "login" && (
              <div className="auth-forgot">
                <button className="link-btn" onClick={() => { setAuthMode("forgot"); setAuthError(""); setAuthSuccess(""); }}>
                  Forgot Password?
                </button>
              </div>
            )}

            <div className="auth-toggle">
              {authMode === "login" ? (
                <p>
                  Don't have an account?{" "}
                  <button className="link-btn" onClick={() => { setAuthMode("signup"); setAuthError(""); setAuthSuccess(""); }}>
                    Sign Up
                  </button>
                </p>
              ) : (
                <p>
                  {authMode === "forgot" ? "Remember your password?" : "Already have an account?"}{" "}
                  <button className="link-btn" onClick={() => { setAuthMode("login"); setAuthError(""); setAuthSuccess(""); }}>
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main App ── */
  return (
    <div className="app">

      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">🎬</span>
            <span className="logo-text">SubLearn</span>
          </div>
          <p className="tagline">AI-Powered Subtitle Learning</p>
        </div>

        <div className="header-right">
          <label
            className={`upload-btn ${isProcessing ? "upload-btn-disabled" : ""}`}
            htmlFor="video-upload"
          >
            <span>📁</span>
            {videoName
              ? (videoName.length > 22 ? videoName.slice(0, 20) + "…" : videoName)
              : "Upload Video"}
            <input
              id="video-upload"
              type="file"
              accept="video/*"
              style={{ display: "none" }}
              disabled={isProcessing}
              onChange={handleVideoUpload}
            />
          </label>

          <div className="user-badge">
            <span className="user-avatar">{user.name?.[0]?.toUpperCase() || "U"}</span>
            <span className="user-name">{user.name || user.email}</span>
            <button
              className="logout-btn"
              onClick={() => setUser(null)}
              title="Logout"
            >
              ↗
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">

        {/* ── LEFT ── */}
        <div className="left-col">

          {/* Video player */}
          <div className="video-wrapper" ref={wrapperRef}>
            {videoSrc ? (
              <video
                ref={videoRef}
                src={videoSrc}
                controls
                className="video-el"
                onTimeUpdate={handleTimeUpdate}
              />
            ) : (
              <div className="video-placeholder">
                <div className="placeholder-icon">▶</div>
                <h3 className="placeholder-title">Upload a video to get started</h3>
                <p>AI-powered captions will sync in real-time</p>
              </div>
            )}

            {/* Custom fullscreen button */}
            {videoSrc && (
              <button
                className="custom-fs-btn"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? "⊠" : "⛶"}
              </button>
            )}

            {/* Subtitle overlay inside video */}
            {subtitles.length > 0 && (
              <div className="subtitle-overlay">
                <SubtitleBox subtitle={activeSubtitle} onSaveWord={handleSaveWord} />
              </div>
            )}
          </div>

          {/* Status banner */}
          {txStatus !== STATUS.IDLE && (
            <div className={`tx-banner tx-banner--${isProcessing ? "transcribing" : txStatus}`}>
              <div className="tx-left">
                {isProcessing && <span className="tx-spinner" />}
                {txStatus === STATUS.DONE && <span className="tx-icon">✅</span>}
                {txStatus === STATUS.ERROR && <span className="tx-icon">❌</span>}
                <span className="tx-message">{txMessage}</span>
              </div>
              {isProcessing && (
                <div className="tx-progress-bar">
                  <div
                    className="tx-progress-fill"
                    style={progress > 0 && progress < 100
                      ? { width: `${progress}%`, animation: "none" }
                      : {}}
                  />
                </div>
              )}
            </div>
          )}

          {/* Caption info bar */}
          {subtitles.length > 0 && (
            <div className="subtitle-track">
              <div className="subtitle-progress">
                <div className="sub-info-left">
                  <span className="sub-ai-badge">🤖 AssemblyAI</span>
                  <span className="sub-caption-count">{subtitles.length} captions</span>
                </div>
                {activeSubtitle && (
                  <span className="sub-timer">
                    {activeSubtitle.start.toFixed(1)}s – {activeSubtitle.end.toFixed(1)}s
                  </span>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ── RIGHT ── */}
        <div className="right-col">

          <SavedWords
            words={savedWords}
            onClear={() => { setSavedWords([]); setShowQuiz(false); }}
            onStartQuiz={() => setShowQuiz(true)}
          />

          {/* Stats card */}
          {subtitles.length > 0 && (
            <div className="stats-card">
              <h3><span className="stats-icon">📊</span> Session Stats</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-value">{subtitles.length}</span>
                  <span className="stat-label">Captions</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{savedWords.length}</span>
                  <span className="stat-label">Saved</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">
                    {Math.ceil(subtitles[subtitles.length - 1].end)}s
                  </span>
                  <span className="stat-label">Duration</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">AI</span>
                  <span className="stat-label">Universal-2</span>
                </div>
              </div>
            </div>
          )}

          <div className="info-card">
            <h3>💡 How It Works</h3>
            <ol className="how-to-list">
              <li>Upload any video — audio is extracted automatically.</li>
              <li>AssemblyAI transcribes speech with timestamps.</li>
              <li>Captions sync live as your video plays.</li>
              <li>Hover any word for its dictionary meaning.</li>
              <li>Click a word to save it to your list.</li>
              <li>Hit <strong>Take Quiz</strong> to test yourself!</li>
            </ol>
          </div>

          {txStatus === STATUS.IDLE && (
            <div className="whisper-card">
              <div className="whisper-icon">🤖</div>
              <h4>Powered by AssemblyAI</h4>
              <p>Real speech-to-text with word-level timestamps from your actual video audio.</p>
              <p className="whisper-note">⚠ Requires internet · Transcription ~1–2 min</p>
            </div>
          )}
        </div>
      </main>

      {showQuiz && savedWords.length >= 2 && (
        <Quiz words={savedWords} onClose={() => setShowQuiz(false)} />
      )}
    </div>
  );
};

/* ── XHR upload with progress tracking ── */
function uploadWithProgress(formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.error) reject(new Error(data.error));
          else resolve(data.subtitles || []);
        } catch {
          reject(new Error("Invalid server response"));
        }
      } else {
        let msg = "Server error";
        try { msg = JSON.parse(xhr.responseText).error || msg; } catch { /* ignore parse errors */ }
        reject(new Error(msg));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error — is the backend running?")));
    xhr.addEventListener("timeout", () => reject(new Error("Upload timed out — try a smaller video")));
    xhr.timeout = 15 * 60 * 1000;  // 15 minutes — supports up to 200MB videos
    xhr.open("POST", `/api/transcribe`);
    xhr.send(formData);
  });
}

export default App;
