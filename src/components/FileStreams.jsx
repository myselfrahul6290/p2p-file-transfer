import React, { useState, useRef } from 'react';

export default function FileStreams({ streamFile, activeTransfers, setActiveTransfers }) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => streamFile(file));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => streamFile(file));
    e.target.value = ''; // reset
  };

  const clearHistory = () => {
    setActiveTransfers({});
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getFileClass = (name) => {
    const ext = name.split('.').pop().toLowerCase();
    const images = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    const videos = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv'];
    const audio = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
    const docs = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar', '7z'];
    
    if (images.includes(ext)) return 'image';
    if (videos.includes(ext)) return 'video';
    if (audio.includes(ext)) return 'audio';
    if (docs.includes(ext)) return 'doc';
    return 'default';
  };

  const transfersList = Object.values(activeTransfers);

  return (
    <div className="file-sharing-grid">
      {/* Minimal Dropzone */}
      <div 
        className={`dropzone-area ${dragOver ? 'dragover' : ''}`} 
        id="dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple 
          className="hidden-input" 
          style={{ display: 'none' }}
        />
        <div className="dropzone-content">
          <div className="dropzone-icon-wrap">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
              <path d="M12 12v9" />
              <path d="m16 16-4-4-4 4" />
            </svg>
          </div>
          <h3>Drop files here</h3>
          <p className="dropzone-sub">or <span className="browse-link">browse from device</span></p>
        </div>
      </div>

      {/* Transfer List Panel */}
      <div className="transfer-history-card">
        <div className="card-header-slim">
          <h4>Transfers</h4>
          {transfersList.length > 0 && (
            <button type="button" className="btn-text-clear" onClick={clearHistory}>Clear</button>
          )}
        </div>
        
        <div className="history-list" id="history-container">
          {transfersList.length === 0 ? (
            <div className="empty-history" id="empty-history-text">
              <p>No active transfers yet</p>
            </div>
          ) : (
            transfersList.map((tx) => (
              <div key={tx.id} className="transfer-item">
                <div className="item-meta">
                  <div className={`file-type-icon ${getFileClass(tx.name)}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="item-details">
                    <div className="item-name" title={tx.name}>{tx.name}</div>
                    <div className="item-stats">
                      {tx.status === 'complete' ? (
                        <span className="status-complete">Completed • {formatBytes(tx.size)}</span>
                      ) : tx.status === 'error' ? (
                        <span className="status-error">Failed</span>
                      ) : (
                        <span>
                          {formatBytes(tx.bytesTransferred)} / {formatBytes(tx.size)} • {tx.speedText}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="item-end-action">
                    {tx.status === 'complete' && tx.type === 'download' && (
                      <a href={tx.downloadUrl} download={tx.fileName} className="btn-save-file">
                        Save
                      </a>
                    )}
                    {tx.status === 'complete' && tx.type === 'upload' && (
                      <span className="check-badge">✓</span>
                    )}
                    {tx.status === 'active' && (
                      <span className="percent-text">{tx.percent}%</span>
                    )}
                  </div>
                </div>
                
                {tx.status === 'active' && (
                  <div className="progress-bar-wrap">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${tx.percent}%` }}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
