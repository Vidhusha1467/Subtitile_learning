
const Dashboard = ({ user, onGoToUpload, onGoToYoutube }) => {
  const firstName = (user?.name || user?.email || "Learner").split(" ")[0];

  return (
    <div className="dash-root">
      {/* ── Header ── */}
      <header className="dash-header">
        <div className="dash-logo">
          <span>🎬</span>
          <span className="dash-logo-text">SubLearn</span>
        </div>
        <div className="dash-user-pill">
          <span className="dash-user-avatar">{firstName.charAt(0).toUpperCase()}</span>
          <span className="dash-user-name">{firstName}</span>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="dash-main">
        {/* Hero Banner */}
        <div className="dash-hero-banner">
          <div className="dash-hero-glow" />
          <div className="dash-hero-content">
            <div className="dash-hero-badge">🎬 SubLearn</div>
            <h1 className="dash-hero-title">
              Welcome back, <span className="dash-hero-name">{firstName}!</span>
            </h1>
            <p className="dash-hero-sub">
              Pick a video below and start building your vocabulary — one word at a time.
            </p>
          </div>
          <div className="dash-hero-emoji">📚</div>
        </div>

        {/* Cards row */}
        <div className="dash-cards">

          {/* ── Upload Card ── */}
          <div className="dash-card" onClick={onGoToUpload}>
            <div className="dash-card-icon">📁</div>
            <h2 className="dash-card-title">Upload a Video</h2>
            <p className="dash-card-desc">Select a local video file. AI will generate word-level subtitles automatically.</p>
            <div className="dash-card-badge-row">
              <span className="dash-badge">MP4</span>
              <span className="dash-badge">WEBM</span>
            </div>
            <button className="dash-card-btn" onClick={(e) => { e.stopPropagation(); onGoToUpload(); }}>
              📂 Choose File
            </button>
          </div>

          {/* ── Divider ── */}
          <div className="dash-divider">
            <div className="dash-divider-line" />
            <span className="dash-divider-text">OR</span>
            <div className="dash-divider-line" />
          </div>

          {/* ── YouTube Card ── */}
          <div className="dash-card" onClick={onGoToYoutube}>
            <div className="dash-card-icon">▶️</div>
            <h2 className="dash-card-title">YouTube Video</h2>
            <p className="dash-card-desc">Paste any YouTube URL and SubLearn will fetch captions and make every word interactive for learning.</p>
            <div className="dash-card-badge-row">
              <span className="dash-badge">Auto Captions</span>
              <span className="dash-badge">Any Language</span>
            </div>
            <button className="dash-card-btn dash-card-btn-yt" onClick={(e) => { e.stopPropagation(); onGoToYoutube(); }}>
              ▶ Open YouTube
            </button>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Dashboard;
