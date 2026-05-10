import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import SubtitleBox from "./components/SubtitleBox";
import SavedWords from "./components/SavedWords";
import Quiz from "./components/Quiz";
import VideoPlayer from "./components/VideoPlayer";
import HomePage from "./components/HomePage";
import Dashboard from "./components/Dashboard";
import UploadPage from "./components/UploadPage";
import YoutubePage from "./components/YoutubePage";
import { LangProvider } from "./context/LangProvider";
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
  const [showHome, setShowHome]               = useState(true);
  const [user, setUser]                        = useState(null);
  const [showDashboard, setShowDashboard]      = useState(false);
  const [showUploadPage, setShowUploadPage]    = useState(false);
  const [showYoutubePage, setShowYoutubePage]  = useState(false);
  const [authMode, setAuthMode]       = useState("login");
  const [authForm, setAuthForm]       = useState({ name: "", email: "", password: "" });
  const [authSuccess, setAuthSuccess] = useState("");
  const [authError, setAuthError]     = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Called from HomePage with 'login' or 'signup'
  const handleGetStarted = (mode = "login") => {
    setAuthMode(mode);
    setShowHome(false);
  };

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
  const [showSessionEnd, setShowSessionEnd] = useState(false);
  const [currentView,    setCurrentView] = useState("main");
  const [userMenuOpen,   setUserMenuOpen] = useState(false);
  const [targetLanguage] = useState("none");
  


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
        setShowDashboard(true);
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
    setShowSessionEnd(false);
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

  /* ── Home Page ── */
  if (showHome) {
    return (
      <LangProvider>
        <HomePage onGetStarted={handleGetStarted} />
      </LangProvider>
    );
  }

  /* ── Dashboard ── */
  if (user && showDashboard) {
    return (
      <Dashboard
        user={user}
        onGoToUpload={()   => { setShowDashboard(false); setShowUploadPage(true); }}
        onGoToYoutube={()  => { setShowDashboard(false); setShowYoutubePage(true); }}
      />
    );
  }

  /* ── Upload Page ── */
  if (user && showUploadPage) {
    return (
      <UploadPage
        onBackToDashboard={() => { setShowUploadPage(false); setShowDashboard(true); }}
        onFileSelect={(e) => { setShowUploadPage(false); handleVideoUpload(e); }}
      />
    );
  }

  /* ── YouTube Page ── */
  if (user && showYoutubePage) {
    return (
      <YoutubePage
        onBackToDashboard={() => { setShowYoutubePage(false); setShowDashboard(true); }}
        onSubmit={(url) => { setShowYoutubePage(false); setVideoSrc(url); setVideoName(url); }}
      />
    );
  }

  /* ── Auth Screen ── */
  if (!user) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-left">
            <button
              className="auth-back-btn"
              onClick={() => setShowHome(true)}
              id="auth-back-home-btn"
              title="Back to Home"
            >
              ← Back to Home
            </button>
            <div className="logo">
              <span className="logo-icon">🎬</span>
              <span className="logo-text">SubLearn</span>
            </div>
            <p className="tagline">Real AI Captions · Vocabulary · Quiz</p>
          </div>
        </header>

        {authMode === "signup" ? (
          /* ── Create Account: centered card only ── */
          <div className="auth-only-page">
            <div className="auth-card">
              <div className="auth-header">
                <h2>Create Account</h2>
                <p className="auth-subtitle">Join SubLearn and start your vocabulary journey</p>
              </div>
              <form className="auth-form" onSubmit={handleAuthSubmit} key="signup" autoComplete="off">
                <div className="form-group">
                  <label htmlFor="auth-name">Name</label>
                  <input id="auth-name" type="text" placeholder="Your name" autoComplete="off"
                    value={authForm.name} onChange={(e) => setAuthForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label htmlFor="auth-email">Email</label>
                  <input id="auth-email" type="email" placeholder="you@example.com" autoComplete="new-password"
                    value={authForm.email} onChange={(e) => setAuthForm(p => ({ ...p, email: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label htmlFor="auth-password">Password</label>
                  <input id="auth-password" type="password" placeholder="••••••••" autoComplete="new-password"
                    value={authForm.password} onChange={(e) => setAuthForm(p => ({ ...p, password: e.target.value }))} required minLength={4} />
                </div>
                {authError   && <div className="auth-error">⚠ {authError}</div>}
                {authSuccess && <div className="auth-success">✅ {authSuccess}</div>}
                <button type="submit" className="btn btn-quiz auth-submit-btn" disabled={authLoading}>
                  {authLoading ? "Please wait…" : "Create Account →"}
                </button>
              </form>
              <div className="auth-toggle">
                <p>Already have an account?{" "}
                  <button className="link-btn" onClick={() => { setAuthMode("login"); setAuthError(""); setAuthSuccess(""); }}>Sign In</button>
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ── Login / Forgot: two-column layout with hero ── */
          <div className="landing-page">
            <div className="landing-left">
              <div className="hero-badge">✨ SubLearn 2.0 is Here</div>
              <h1 className="hero-title">Master English through your <span className="hero-highlight">favorite videos</span></h1>
              <p className="hero-desc">Upload any video, let AI generate interactive subtitles, click any word to instantly learn its meaning, and take gamified quizzes to build your vocabulary.</p>
              <div className="hero-features">
                <div className="hf-item"><span className="hf-icon">🤖</span><span className="hf-text">Smart AI Transcription</span></div>
                <div className="hf-item"><span className="hf-icon">👆</span><span className="hf-text">Interactive Hover Dictionary</span></div>
                <div className="hf-item"><span className="hf-icon">🎮</span><span className="hf-text">Gamified Vocabulary Quizzes</span></div>
              </div>
            </div>
            <div className="landing-right">
              <div className="auth-card">
                <div className="auth-header">
                  <h2>{authMode === "login" ? "Welcome Back" : "Reset Password"}</h2>
                  <p className="auth-subtitle">{authMode === "login" ? "Sign in to start learning with subtitles" : "Enter your email and a new password"}</p>
                </div>
                <form className="auth-form" onSubmit={handleAuthSubmit} key={authMode} autoComplete="off">
                  <div className="form-group">
                    <label htmlFor="auth-email">Email</label>
                    <input id="auth-email" type="email" placeholder="you@example.com" autoComplete="new-password"
                      value={authForm.email} onChange={(e) => setAuthForm(p => ({ ...p, email: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="auth-password">{authMode === "forgot" ? "New Password" : "Password"}</label>
                    <input id="auth-password" type="password" placeholder="••••••••" autoComplete="new-password"
                      value={authForm.password} onChange={(e) => setAuthForm(p => ({ ...p, password: e.target.value }))} required minLength={4} />
                  </div>
                  {authError   && <div className="auth-error">⚠ {authError}</div>}
                  {authSuccess && <div className="auth-success">✅ {authSuccess}</div>}
                  <button type="submit" className="btn btn-quiz auth-submit-btn" disabled={authLoading}>
                    {authLoading ? "Please wait…" : authMode === "login" ? "Sign In →" : "Reset Password →"}
                  </button>
                </form>
                {authMode === "login" && (
                  <div className="auth-forgot">
                    <button className="link-btn" onClick={() => { setAuthMode("forgot"); setAuthError(""); setAuthSuccess(""); }}>Forgot Password?</button>
                  </div>
                )}
                <div className="auth-toggle">
                  {authMode === "login" ? (
                    <p>Don't have an account?{" "}
                      <button className="link-btn" onClick={() => { setAuthMode("signup"); setAuthError(""); setAuthSuccess(""); }}>Sign Up</button>
                    </p>
                  ) : (
                    <p>Remember your password?{" "}
                      <button className="link-btn" onClick={() => { setAuthMode("login"); setAuthError(""); setAuthSuccess(""); }}>Sign In</button>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );

  }

  /* ── How It Works Page ── */
  if (currentView === "how-to") {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-left">
            <button className="auth-back-btn" onClick={() => { setShowDashboard(true); setVideoSrc(null); setVideoName(""); setSubtitles([]); setCurrentView("main"); }}>
              ← Back to Dashboard
            </button>
            <div className="logo">
              <span className="logo-icon">🎬</span>
              <span className="logo-text">SubLearn</span>
            </div>
            <p className="tagline">AI-Powered Subtitle Learning</p>
          </div>
          <div className="header-right">
            <button className="upload-btn" onClick={() => setCurrentView("main")}>← Back to App</button>
          </div>
        </header>

        <div className="how-to-page" style={{ maxWidth: "1000px", margin: "60px auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: "50px" }}>
            <div className="hero-badge" style={{ marginBottom: "16px" }}>✨ SubLearn 2.0</div>
            <h1 style={{ fontSize: "3rem", marginBottom: "16px", color: "var(--text-primary)", letterSpacing: "-1px" }}>
              How <span className="hero-highlight">It Works</span>
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "1.1rem", maxWidth: "600px", margin: "0 auto", lineHeight: 1.6 }}>
              A modern, AI-powered way to master new vocabulary by immersing yourself in your favorite videos.
            </p>
          </div>

          <div className="feature-grid">
            <div className="feature-card">
              <div className="fc-icon">📁</div>
              <h3>1. Upload & Process</h3>
              <p>Upload any video file. We securely extract the audio and process it directly through AssemblyAI's advanced models.</p>
            </div>
            
            <div className="feature-card">
              <div className="fc-icon">🤖</div>
              <h3>2. AI Transcription</h3>
              <p>Experience ultra-accurate speech-to-text with word-level timestamps. Captions sync perfectly with your video playback.</p>
            </div>
            
            <div className="feature-card">
              <div className="fc-icon">👆</div>
              <h3>3. Interactive Dictionary</h3>
              <p>Hover over any word in the subtitles to instantly view its meaning, context, and part of speech without pausing.</p>
            </div>

            <div className="feature-card">
              <div className="fc-icon">💾</div>
              <h3>4. Personal Vocabulary</h3>
              <p>Click on any word to save it to your personal vocabulary list. Your progress is automatically stored in your user profile.</p>
            </div>

            <div className="feature-card fc-wide">
              <div className="fc-icon quiz-icon">🎮</div>
              <div className="fc-content">
                <h3>5. Gamified Quiz & Retention</h3>
                <p>Once you've saved enough words, hit <strong>Take Quiz</strong>. Test your memory with speed bonuses, accuracy tracking, and visual feedback to lock the words into your long-term memory!</p>
              </div>
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
          <button
            className="auth-back-btn"
            onClick={() => { setShowDashboard(true); setVideoSrc(null); setVideoName(""); setSubtitles([]); }}
            title="Back to Dashboard"
          >
            ← Dashboard
          </button>
          <div className="logo">
            <span className="logo-icon">🎬</span>
            <span className="logo-text">SubLearn</span>
          </div>
          <p className="tagline">AI-Powered Subtitle Learning</p>
        </div>

        <div className="header-right">


          <button className="upload-btn" onClick={() => setCurrentView("how-to")}>
            💡 How It Works
          </button>
          <label
            className={`upload-btn ${isProcessing ? "upload-btn-disabled" : ""}`}
            htmlFor="video-upload"
          >
            <span>📁</span>
            {videoName
              ? (videoName.length > 22 ? videoName.slice(0, 20) + "…" : videoName)
              : "Upload"}
            <input
              id="video-upload"
              type="file"
              accept="video/*"
              style={{ display: "none" }}
              disabled={isProcessing}
              onChange={handleVideoUpload}
            />
          </label>

          <div className="user-badge-container">
            <div className="user-badge" onClick={() => setUserMenuOpen(!userMenuOpen)}>
              <span className="user-avatar">{user.name?.[0]?.toUpperCase() || "U"}</span>
              <span className="user-name">{user.name || user.email}</span>
              <span className="info-card-chevron" style={{ transform: userMenuOpen ? "rotate(180deg)" : "rotate(0)", marginLeft: '4px' }}>▼</span>
            </div>

            {userMenuOpen && (
              <div className="user-dropdown">
                <div className="user-dropdown-header">
                  <span className="ud-name">{user.name || "User"}</span>
                  <span className="ud-email">{user.email}</span>
                </div>
                <div className="ud-stat">
                  <span>Saved Words</span>
                  <strong>{savedWords.length}</strong>
                </div>
                <button
                  className="ud-logout"
                  onClick={() => { setUser(null); setUserMenuOpen(false); }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">

        {/* ── LEFT ── */}
        <div className="left-col">

          {/* Video player */}
          <div className="video-wrapper" ref={wrapperRef}>
            {videoSrc ? (
              <VideoPlayer
                videoSrc={videoSrc}
                videoRef={videoRef}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => {
                  // Show the premium end screen
                  setShowSessionEnd(true);
                }}
              />
            ) : (
              <div className="video-placeholder">
                <div className="placeholder-icon">▶</div>
                <h3 className="placeholder-title">Upload a video to begin learning</h3>
                <p>AI-powered captions will sync in real-time</p>
              </div>
            )}

            {/* ── Session Complete Overlay ── */}
            {showSessionEnd && (
              <div className="session-end-overlay">
                <div className="session-end-container">
                  <div className="se-header">
                    <span className="se-badge">SESSION COMPLETE</span>
                    <h1 className="se-title">Great Job, <span className="se-user">{user.name || "Explorer"}!</span></h1>
                    <p className="se-subtitle">You've just leveled up your vocabulary skills.</p>
                  </div>

                  <div className="se-stats-row">
                    <div className="se-stat-card">
                      <span className="se-stat-icon">📜</span>
                      <span className="se-stat-value">{subtitles.length}</span>
                      <span className="se-stat-label">Captions Explored</span>
                    </div>
                    <div className="se-stat-card se-stat-highlight">
                      <span className="se-stat-icon">💎</span>
                      <span className="se-stat-value">{savedWords.length}</span>
                      <span className="se-stat-label">New Words Saved</span>
                    </div>
                  </div>
                  
                  <div className="se-footer-actions">
                    {savedWords.length >= 2 ? (
                      <button className="se-main-btn" onClick={() => { setShowSessionEnd(false); setShowQuiz(true); }}>
                        <span className="btn-text">Practice with Quiz</span>
                        <span className="btn-icon">→</span>
                      </button>
                    ) : (
                      <div className="se-lock-hint">
                        <span className="lock-icon">🔒</span>
                        Save {2 - savedWords.length} more words to unlock the quiz!
                      </div>
                    )}
                    <button className="se-sub-btn" onClick={() => setShowSessionEnd(false)}>
                      ↺ Watch Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Subtitle overlay — inside the video ── */}
            {!showQuiz && !showSessionEnd && (
              <div className="subtitle-overlay">
                <SubtitleBox
                  subtitle={activeSubtitle}
                  currentTime={currentTime}
                  onSaveWord={handleSaveWord}
                  videoRef={videoRef}
                  targetLanguage={targetLanguage}
                />
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
