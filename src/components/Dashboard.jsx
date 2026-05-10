
const Dashboard = ({ user, onGoToUpload }) => {
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
          <div className="dash-card" onClick={onGoToUpload} style={{ maxWidth: '600px', margin: '0 auto' }}>
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

        </div>
      </main>
    </div>
  );
};

export default Dashboard;
