// VideoPlayer component

/**
 * VideoPlayer — renders the HTML5 video element.
 * Props:
 *   videoSrc      : object URL of the uploaded file
 *   videoRef      : forwarded ref so parent can read currentTime
 *   onTimeUpdate  : callback fired on every timeupdate event
 */
const VideoPlayer = ({ videoSrc, videoRef, onTimeUpdate }) => {
  return (
    <div className="video-wrapper">
      {videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          controls
          onTimeUpdate={onTimeUpdate}
          className="video-el"
        />
      ) : (
        <div className="video-placeholder">
          <div className="placeholder-icon">▶</div>
          <p>Upload a video to begin learning</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
