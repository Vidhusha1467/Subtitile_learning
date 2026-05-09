import { useState, useEffect, useRef } from "react";
import { useLang } from "../context/LangContext";

/* ── Toast ── */
const Toast = ({ msg, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, [onDone]);
  return <div className="hp2-toast">{msg}</div>;
};

/* ── Modal Shell ── */
const Modal = ({ title, icon, onClose, children }) => (
  <div className="hp2-modal-overlay" onClick={onClose}>
    <div className="hp2-modal" onClick={e => e.stopPropagation()}>
      <div className="hp2-modal-header">
        <div className="hp2-modal-header-left">
          {icon && <span className="hp2-modal-icon">{icon}</span>}
          <span className="hp2-modal-title">{title}</span>
        </div>
        <button className="hp2-modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="hp2-modal-body">{children}</div>
    </div>
  </div>
);

/* ── Account Modal ── */
const AccountModal = ({ onClose, onToast }) => {
  const { t } = useLang();
  const [name,  setName]  = useState(() => localStorage.getItem("sl_name")  || "SubLearn User");
  const [email, setEmail] = useState(() => localStorage.getItem("sl_email") || "user@sublearn.com");
  const [saved, setSaved] = useState(false);
  const save = () => {
    localStorage.setItem("sl_name", name);
    localStorage.setItem("sl_email", email);
    setSaved(true);
    onToast(t.toastSaved);
    setTimeout(() => setSaved(false), 2000);
  };
  return (
    <>
      <div className="hp2-account-avatar">
        <span className="hp2-account-initials">{name.charAt(0).toUpperCase()}</span>
      </div>
      <label className="hp2-modal-label">{t.displayName}</label>
      <input className="hp2-modal-input" value={name} onChange={e => setName(e.target.value)} />
      <label className="hp2-modal-label">{t.email}</label>
      <input className="hp2-modal-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
      <label className="hp2-modal-label">{t.password}</label>
      <input className="hp2-modal-input" type="password" defaultValue="••••••••" />
      <div className="hp2-modal-divider" />
      <button className="hp2-modal-btn" onClick={save}>{saved ? t.saved : t.saveChanges}</button>
      <button className="hp2-modal-btn hp2-modal-btn-danger" onClick={onClose}>{t.logOut}</button>
    </>
  );
};

/* ── Notifications Modal ── */
const NotifModal = ({ onToast }) => {
  const { t } = useLang();
  const defaults = Object.fromEntries(t.notifLabels.map((l, i) => [l, [true, true, false, false, true][i]]));
  const [state, setState] = useState(defaults);
  const toggle = key => {
    const next = { ...state, [key]: !state[key] };
    setState(next);
    onToast(next[key] ? `🔔 ${t.notifications}` : `🔕`);
  };
  return (
    <>
      <p className="hp2-modal-info">{t.notifInfo}</p>
      {Object.entries(state).map(([label, on]) => (
        <div key={label} className="hp2-modal-toggle-row" onClick={() => toggle(label)} style={{cursor:"pointer"}}>
          <span>{label}</span>
          <div className={`hp2-toggle ${on ? "on" : ""}`}><div className="hp2-toggle-knob" /></div>
        </div>
      ))}
    </>
  );
};

/* ── Language Modal ── */
const LangModal = ({ onToast }) => {
  const { lang, switchLang, t } = useLang();
  const langs = [
    { code: "en", label: "🇺🇸 English" },
    { code: "ta", label: "🇮🇳 தமிழ்" },
  ];
  const pick = (l) => {
    switchLang(l.code);
    onToast(`🌐 ${l.label}`);
  };
  return (
    <>
      <p className="hp2-modal-info">{t.langInfo}</p>
      <div className="hp2-lang-grid" style={{gridTemplateColumns:"1fr 1fr"}}>
        {langs.map(l => (
          <button key={l.code} className={`hp2-modal-lang ${lang === l.code ? "active" : ""}`} onClick={() => pick(l)}>
            {l.label}
          </button>
        ))}
      </div>
    </>
  );
};

/* ── Privacy Modal ── */
const PrivacyModal = ({ onToast, onClose }) => {
  const { t } = useLang();
  const [cookies, setCookies] = useState(true);
  const [stats,   setStats]   = useState(false);
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <p className="hp2-modal-info">{t.privacyInfo}</p>
      <div className="hp2-modal-toggle-row" onClick={() => { setCookies(v => !v); onToast(`🍪`); }} style={{cursor:"pointer"}}>
        <span>{t.analyticsCookies}</span>
        <div className={`hp2-toggle ${cookies ? "on" : ""}`}><div className="hp2-toggle-knob" /></div>
      </div>
      <div className="hp2-modal-toggle-row" onClick={() => { setStats(v => !v); onToast(`📊`); }} style={{cursor:"pointer"}}>
        <span>{t.usageStats}</span>
        <div className={`hp2-toggle ${stats ? "on" : ""}`}><div className="hp2-toggle-knob" /></div>
      </div>
      <div className="hp2-modal-divider" />
      <p className="hp2-modal-label">{t.dangerZone}</p>
      {!confirm ? (
        <button className="hp2-modal-btn hp2-modal-btn-danger" onClick={() => setConfirm(true)}>{t.deleteData}</button>
      ) : (
        <div className="hp2-confirm-box">
          <p>{t.deleteConfirm}</p>
          <div style={{display:"flex",gap:"8px"}}>
            <button className="hp2-modal-btn hp2-modal-btn-danger" onClick={() => { localStorage.clear(); onToast(t.toastDeleted); onClose(); }}>{t.yes}</button>
            <button className="hp2-modal-btn" style={{background:"var(--bg-glass)",color:"var(--text-primary)"}} onClick={() => setConfirm(false)}>{t.cancel}</button>
          </div>
        </div>
      )}
    </>
  );
};

/* ── Help Modal ── */
const HelpModal = () => {
  const { t } = useLang();
  const [open, setOpen] = useState(null);
  return (
    <>
      <p className="hp2-modal-info">{t.helpInfo}</p>
      {t.faqs.map(([q, a], i) => (
        <div key={i} className={`hp2-faq-item ${open === i ? "open" : ""}`} onClick={() => setOpen(open === i ? null : i)}>
          <div className="hp2-faq-q"><span>{q}</span><span className="hp2-faq-arrow">{open === i ? "▲" : "▼"}</span></div>
          {open === i && <p className="hp2-faq-a">{a}</p>}
        </div>
      ))}
    </>
  );
};

/* ── Contact Modal ── */
const ContactModal = ({ onToast, onClose }) => {
  const { t } = useLang();
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [msg,   setMsg]   = useState("");
  const [sent,  setSent]  = useState(false);
  const send = () => {
    if (!name || !email || !msg) { onToast(t.toastEmptyFields); return; }
    setSent(true); onToast(t.toastSent);
    setTimeout(onClose, 2000);
  };
  if (sent) return (
    <div style={{textAlign:"center",padding:"24px 0"}}>
      <div style={{fontSize:"3rem"}}>📬</div>
      <p style={{marginTop:"12px",fontWeight:700}}>{t.messageSent}</p>
      <p className="hp2-modal-info" style={{marginTop:"6px"}}>{t.replyInfo}</p>
    </div>
  );
  return (
    <>
      <p className="hp2-modal-info">{t.contactInfo}</p>
      <label className="hp2-modal-label">{t.yourName}</label>
      <input className="hp2-modal-input" value={name} onChange={e => setName(e.target.value)} placeholder={t.namePlaceholder} />
      <label className="hp2-modal-label">{t.email}</label>
      <input className="hp2-modal-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t.emailPlaceholder} />
      <label className="hp2-modal-label">{t.language}</label>
      <textarea className="hp2-modal-input" rows={4} value={msg} onChange={e => setMsg(e.target.value)} placeholder={t.messagePlaceholder} style={{resize:"vertical"}} />
      <button className="hp2-modal-btn" onClick={send}>{t.sendMessage}</button>
    </>
  );
};

/* ── Rate Modal ── */
const RateModal = ({ onToast, onClose }) => {
  const { t } = useLang();
  const [hover,    setHover]    = useState(0);
  const [selected, setSelected] = useState(0);
  const [comment,  setComment]  = useState("");
  const [done,     setDone]     = useState(false);
  const submit = () => {
    if (!selected) { onToast(t.toastNoStar); return; }
    setDone(true); onToast(t.toastStarThanks(selected));
    setTimeout(onClose, 2500);
  };
  if (done) return (
    <div style={{textAlign:"center",padding:"24px 0"}}>
      <div style={{fontSize:"3rem"}}>🎉</div>
      <p style={{marginTop:"12px",fontWeight:700}}>{t.thankYou}</p>
      <p className="hp2-modal-info" style={{marginTop:"6px"}}>{t.feedbackHelps}</p>
    </div>
  );
  return (
    <>
      <p className="hp2-modal-info" style={{textAlign:"center"}}>{t.rateInfo}</p>
      <div className="hp2-stars-row">
        {[1,2,3,4,5].map(n => (
          <button key={n} className={`hp2-star ${n <= (hover || selected) ? "lit" : ""}`}
            onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setSelected(n)}>★</button>
        ))}
      </div>
      {(hover || selected) > 0 && <p className="hp2-star-label">{t.rateLabels[hover || selected]}</p>}
      <label className="hp2-modal-label">{t.commentsLabel}</label>
      <textarea className="hp2-modal-input" rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder={t.commentPlaceholder} style={{resize:"vertical"}} />
      <button className="hp2-modal-btn" onClick={submit}>{t.submitRating}</button>
    </>
  );
};

/* ════════════════ MAIN ════════════════ */
const HomePage = ({ onGetStarted }) => {
  const { t } = useLang();
  const [dark, setDark] = useState(() => localStorage.getItem("sublearnTheme") !== "light");
  const [showSettings, setShowSettings] = useState(false);
  const [showDots,     setShowDots]     = useState(false);
  const [modal,  setModal]  = useState(null);
  const [toast,  setToast]  = useState(null);
  const settingsRef = useRef(null);
  const dotsRef     = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) { root.removeAttribute("data-theme"); localStorage.setItem("sublearnTheme", "dark"); }
    else       { root.setAttribute("data-theme", "light"); localStorage.setItem("sublearnTheme", "light"); }
  }, [dark]);

  useEffect(() => {
    const h = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false);
      if (dotsRef.current     && !dotsRef.current.contains(e.target))     setShowDots(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const openModal = (name) => { setModal(name); setShowSettings(false); setShowDots(false); };

  const MODAL_META = {
    account:       { title: t.accountTitle,  icon: "👤" },
    notifications: { title: t.notifTitle,    icon: "🔔" },
    language:      { title: t.langTitle,     icon: "🌐" },
    privacy:       { title: t.privacyTitle,  icon: "🔒" },
    help:          { title: t.helpTitle,     icon: "❓" },
    contact:       { title: t.contactTitle,  icon: "📧" },
    rate:          { title: t.rateTitle,     icon: "⭐" },
  };

  const renderModal = () => {
    const p = { onClose: () => setModal(null), onToast: setToast };
    switch (modal) {
      case "account":       return <AccountModal  {...p} />;
      case "notifications": return <NotifModal    {...p} />;
      case "language":      return <LangModal     {...p} />;
      case "privacy":       return <PrivacyModal  {...p} />;
      case "help":          return <HelpModal     {...p} />;
      case "contact":       return <ContactModal  {...p} />;
      case "rate":          return <RateModal     {...p} />;
      default: return null;
    }
  };

  return (
    <div className="hp2-root">
      <div className="hp2-glow" aria-hidden="true" />

      {/* ── Top bar ── */}
      <div className="hp2-topbar">
        <div className="hp2-topbar-logo">
          <span>🎬</span>
          <span className="hp2-logo-text">SubLearn</span>
        </div>
        <div className="hp2-topbar-right">
          <button className="hp2-theme-toggle" onClick={() => setDark(d => !d)} id="hp2-theme-btn">
            {dark ? t.light : t.dark}
          </button>
          {/* ⚙️ Settings */}
          <div className="hp2-dropdown-wrap" ref={settingsRef}>
            <button className="hp2-icon-btn" id="hp2-settings-btn" onClick={() => { setShowSettings(v => !v); setShowDots(false); }}>⚙️</button>
            {showSettings && (
              <div className="hp2-dropdown">
                <div className="hp2-dropdown-title">{t.settings}</div>
                <button className="hp2-dropdown-item" onClick={() => openModal("account")}>{t.account}</button>
                <button className="hp2-dropdown-item" onClick={() => openModal("notifications")}>{t.notifications}</button>
                <button className="hp2-dropdown-item" onClick={() => openModal("language")}>{t.language}</button>
                <button className="hp2-dropdown-item" onClick={() => openModal("privacy")}>{t.privacy}</button>
              </div>
            )}
          </div>
          {/* ⋮ More */}
          <div className="hp2-dropdown-wrap" ref={dotsRef}>
            <button className="hp2-icon-btn" id="hp2-dots-btn" onClick={() => { setShowDots(v => !v); setShowSettings(false); }}>⋮</button>
            {showDots && (
              <div className="hp2-dropdown">
                <div className="hp2-dropdown-title">{t.more}</div>
                <button className="hp2-dropdown-item" onClick={() => openModal("help")}>{t.helpFaq}</button>
                <button className="hp2-dropdown-item" onClick={() => openModal("contact")}>{t.contactUs}</button>
                <button className="hp2-dropdown-item" onClick={() => openModal("rate")}>{t.rateApp}</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="hp2-center">
        <div className="hp2-badge">{t.badge}</div>
        <h1 className="hp2-title">
          {t.title1}{" "}<span className="hp2-hl">{t.title2}</span>
        </h1>
        <p className="hp2-sub">{t.sub}</p>
        <div className="hp2-pills">
          {t.pills.map(p => <span key={p} className="hp2-pill">{p}</span>)}
        </div>
        <div className="hp2-actions">
          <button className="hp2-btn-primary" onClick={() => onGetStarted("signup")} id="hp2-cta-main">{t.getStarted}</button>
          <button className="hp2-btn-secondary" onClick={() => onGetStarted("login")} id="hp2-cta-login">{t.signIn}</button>
        </div>
      </div>

      {/* ── Modal ── */}
      {modal && MODAL_META[modal] && (
        <Modal title={MODAL_META[modal].title} icon={MODAL_META[modal].icon} onClose={() => setModal(null)}>
          {renderModal()}
        </Modal>
      )}

      {/* ── Toast ── */}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
};

export default HomePage;
