// TranscriptionStatus component

/**
 * TranscriptionStatus — shows a progress banner during AI transcription.
 *
 * Props:
 *   status         : "idle" | "extracting" | "transcribing" | "done" | "error"
 *   message        : string — human-readable status message
 */
const TranscriptionStatus = ({ status, message }) => {
  if (status === "idle") return null;

  const isProcessing = status === "extracting" || status === "transcribing";
  const isDone       = status === "done";
  const isError      = status === "error";

  return (
    <div className={`tx-banner tx-banner--${status}`}>
      <div className="tx-left">
        {isProcessing && <span className="tx-spinner" />}
        {isDone       && <span className="tx-icon">✅</span>}
        {isError      && <span className="tx-icon">❌</span>}
        <span className="tx-message">{message}</span>
      </div>

      {isProcessing && (
        <div className="tx-progress-bar">
          <div className="tx-progress-fill" />
        </div>
      )}
    </div>
  );
};

export default TranscriptionStatus;
