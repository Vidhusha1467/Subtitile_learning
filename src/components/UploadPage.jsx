import { useState, useRef } from "react";

const UploadPage = ({ onFileSelect, onBackToDashboard }) => {
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "video/mp4" || file.type === "video/webm")) {
      setSelectedFile(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };

  const handleStart = () => {
    if (!selectedFile) return;
    onFileSelect({ target: { files: [selectedFile] } });
  };

  const formatSize = (bytes) => {
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="upload-page-root">
      {/* Header */}
      <header className="dash-header">
        <div className="dash-logo">
          <span>🎬</span>
          <span className="dash-logo-text">SubLearn</span>
        </div>
        <button className="auth-back-btn" onClick={onBackToDashboard}>
          ← Back to Dashboard
        </button>
      </header>

      {/* Body */}
      <main className="upload-page-main">
        <div className="upload-page-card">
          {/* Title */}
          <div className="upload-page-title-row">
            <span className="upload-page-icon">📁</span>
            <div>
              <h1 className="upload-page-title">Upload a Video</h1>
              <p className="upload-page-sub">AI will generate interactive word-level subtitles automatically</p>
            </div>
          </div>

          {/* Drop zone */}
          <div
            className={`upload-drop-zone ${dragging ? "dragging" : ""} ${selectedFile ? "has-file" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
          >
            {selectedFile ? (
              <div className="upload-file-info">
                <div className="upload-file-icon">🎬</div>
                <div className="upload-file-name">{selectedFile.name}</div>
                <div className="upload-file-meta">
                  <span className="dash-badge">{selectedFile.type === "video/mp4" ? "MP4" : "WEBM"}</span>
                  <span className="upload-file-size">{formatSize(selectedFile.size)}</span>
                </div>
                <button className="upload-change-btn" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); fileInputRef.current?.click(); }}>
                  🔄 Change File
                </button>
              </div>
            ) : (
              <div className="upload-drop-content">
                <div className="upload-drop-icon">{dragging ? "⬇️" : "☁️"}</div>
                <p className="upload-drop-text">
                  {dragging ? "Drop your video here!" : "Drag & drop your video here"}
                </p>
                <p className="upload-drop-or">— or —</p>
                <button className="dash-card-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                  📂 Browse Files
                </button>
                <div className="upload-supported">
                  <span className="dash-badge">MP4</span>
                  <span className="dash-badge">WEBM</span>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </div>

          {/* Start button */}
          <button
            className={`upload-start-btn ${!selectedFile ? "disabled" : ""}`}
            onClick={handleStart}
            disabled={!selectedFile}
          >
            {selectedFile ? "🚀 Start Learning" : "Select a file to continue"}
          </button>
        </div>
      </main>
    </div>
  );
};

export default UploadPage;
