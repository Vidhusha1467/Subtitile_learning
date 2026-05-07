import { useEffect, useRef, useCallback } from 'react';

/**
 * VideoPlayer
 * - YouTube videos: uses the YouTube IFrame API (YT.Player)
 * - Local videos:   uses a native <video> element
 */
const VideoPlayer = ({ videoSrc, videoRef, onTimeUpdate, youtubeId }) => {
  const containerRef  = useRef(null);   // div where YT injects its iframe
  const ytPlayerRef   = useRef(null);   // YT.Player instance
  const intervalRef   = useRef(null);   // polling interval for currentTime
  const lastIdRef     = useRef(null);   // which video ID we last built a player for

  // Stop the time-polling interval
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Start polling YT player's currentTime and forwarding it to the parent
  const startPolling = useCallback(() => {
    stopPolling();
    intervalRef.current = setInterval(() => {
      const player = ytPlayerRef.current;
      if (!player || typeof player.getCurrentTime !== 'function') return;
      const t = player.getCurrentTime();
      if (videoRef) {
        videoRef.current = {
          currentTime: t,
          pause: () => player.pauseVideo?.(),
          play:  () => player.playVideo?.(),
          seeking: false,
        };
      }
      onTimeUpdate?.();
    }, 250);
  }, [stopPolling, videoRef, onTimeUpdate]);

  // Destroy the existing YT player and clear the container
  const destroyPlayer = useCallback(() => {
    stopPolling();
    try { ytPlayerRef.current?.destroy(); } catch (_) {}
    ytPlayerRef.current = null;
    if (containerRef.current) containerRef.current.innerHTML = '';
  }, [stopPolling]);

  // Build a fresh YT.Player inside containerRef
  const buildPlayer = useCallback((videoId) => {
    destroyPlayer();

    // Give the container a fresh inner div for YT to replace with an iframe
    const div = document.createElement('div');
    div.id = `yt-player-${videoId}-${Date.now()}`;
    containerRef.current.appendChild(div);

    ytPlayerRef.current = new window.YT.Player(div, {
      videoId,
      width:  '100%',
      height: '100%',
      playerVars: {
        autoplay:       1,
        modestbranding: 1,
        rel:            0,
        playsinline:    1,
        controls:       1,
        cc_load_policy: 0,
        iv_load_policy: 3,
        origin:         window.location.origin,
      },
      events: {
        onReady(e)       { e.target.playVideo(); },
        onStateChange(e) {
          if (e.data === window.YT.PlayerState.PLAYING) startPolling();
          else stopPolling();
        },
        onError(e)       { console.warn('YT Player error code:', e.data); },
      },
    });
  }, [destroyPlayer, startPolling, stopPolling]);

  useEffect(() => {
    if (!youtubeId) {
      destroyPlayer();
      lastIdRef.current = null;
      return;
    }

    // Don't rebuild if it's the same video
    if (lastIdRef.current === youtubeId && ytPlayerRef.current) return;
    lastIdRef.current = youtubeId;

    if (window.YT?.Player) {
      buildPlayer(youtubeId);
    } else {
      // Inject the IFrame API script only once
      if (!document.getElementById('yt-api-script')) {
        const s = document.createElement('script');
        s.id  = 'yt-api-script';
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
      }
      // Chain on top of any previous callback
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        buildPlayer(youtubeId);
      };
    }

    return stopPolling;          // cleanup polling on unmount / id change
  }, [youtubeId, buildPlayer, destroyPlayer, stopPolling]);

  /* ── render ─────────────────────────────────────────────────── */
  return (
    <div className="video-container">

      {/* ── YouTube container (always mounted so the player iframe persists) */}
      <div
        ref={containerRef}
        className="video-el"
        style={{
          display:      youtubeId ? 'block' : 'none',
          width:        '100%',
          height:       '100%',
          borderRadius: '12px',
          overflow:     'hidden',
          background:   '#000',
          minHeight:    '300px',
        }}
      />

      {/* ── Local file player */}
      {!youtubeId && videoSrc && (
        <video
          ref={videoRef}
          src={videoSrc}
          controls
          onTimeUpdate={onTimeUpdate}
          className="video-el"
          style={{ width: '100%', height: '100%', borderRadius: '12px', background: '#000' }}
        />
      )}

      {/* ── Empty state */}
      {!youtubeId && !videoSrc && (
        <div className="video-placeholder">
          <div className="placeholder-icon">▶</div>
          <p>Upload a video or paste a YouTube link to begin learning</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
