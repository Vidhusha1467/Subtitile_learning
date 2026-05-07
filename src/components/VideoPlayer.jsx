/**
 * VideoPlayer — plays local video files using a native <video> element.
 */
const VideoPlayer = ({ videoSrc, videoRef, onTimeUpdate }) => {
  return (
    <div className="video-container">

      {/* ── Local file player */}
      {videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          controls
          onTimeUpdate={onTimeUpdate}
          className="video-el"
          style={{ width: '100%', height: '100%', borderRadius: '12px', background: '#000' }}
        />
      ) : (
        /* ── Empty state */
        <div className="video-placeholder">
          <div className="placeholder-icon">▶</div>
          <p>Upload a video to begin learning</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
