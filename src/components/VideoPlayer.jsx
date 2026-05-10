
/**
 * VideoPlayer — plays local video files or YouTube videos.
 */
const VideoPlayer = ({ videoSrc, videoRef, onTimeUpdate, onEnded }) => {
  return (
    <div className="video-container" style={{ width: '100%', height: '100%', background: '#000', position: 'relative' }}>
      {videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          controls
          onTimeUpdate={(e) => onTimeUpdate(e.target.currentTime)}
          onEnded={onEnded}
          className="video-el"
          style={{ width: '100%', height: '100%', borderRadius: '12px' }}
        />
      ) : (
        <div className="video-placeholder">
          <div className="placeholder-icon">▶</div>
          <p>Upload a video to begin</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
