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
      {/* Dropzone Area */}
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
          <div className="glow-sphere"></div>
          <div className="dropzone-icon-wrap">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.8" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className={`upload-icon-anim ${dragOver ? 'pulsing' : ''}`}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <h3>Drag & Drop Files Here</h3>
          <p class="dropzone-sub">Photos, videos, folders or documents directly</p>
          <span className="btn-secondary" onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}>
            Browse Local Files
          </span>
        </div>
      </div>

      {/* Transfer History Panel */}
      <div className="transfer-history-card">
        <div className="card-header-slim">
          <h4>Active Direct Data Pipelines</h4>
          {transfersList.length > 0 && (
            <button className="btn-text-clear" onClick={clearHistory}>Clear History</button>
          )}
        </div>
        
        <div className="history-list" id="history-container">
          {transfersList.length === 0 ? (
            <div className="empty-history" id="empty-history-text">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <p>No active file transactions in this session.</p>
            </div>
          ) : (
            transfersList.map((tx) => (
              <div key={tx.id} className="transfer-item">
                <div className="item-meta">
                  <div className={`file-type-icon ${getFileClass(tx.name)}`}>
                    {tx.name.split('.').pop().slice(0, 3)}
                  </div>
                  <div className="item-details">
                    <div className="item-name" title={tx.name}>{tx.name}</div>
                    <div className="item-stats">
                      {tx.status === 'complete' ? (
                        <span style={{ color: 'var(--color-success)', fontWeight: '600' }}>Complete</span>
                      ) : tx.status === 'error' ? (
                        <span style={{ color: 'var(--color-error)', fontWeight: '600' }}>Error</span>
                      ) : (
                        <span>
                          {formatBytes(tx.bytesTransferred)} of {formatBytes(tx.size)} • <span style={{ color: 'var(--accent-cyan-solid)', fontWeight: '500' }}>{tx.speedText}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="progress-percent" style={{ color: tx.status === 'complete' ? 'var(--color-success)' : '' }}>
                    {tx.percent}%
                  </div>
                </div>
                
                <div className="progress-bar-wrap">
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      width: `${tx.percent}%`,
                      background: tx.status === 'error' ? 'var(--color-error)' : ''
                    }}
                  />
                </div>
                
                <div className="item-actions">
                  <span className="eta-label">
                    {tx.status === 'complete' 
                      ? 'Transferred Successfully' 
                      : tx.status === 'error' 
                      ? 'Pipeline broke.' 
                      : 'Active transmission'}
                  </span>
                  
                  {tx.status === 'complete' && tx.type === 'download' && (
                    <a href={tx.downloadUrl} download={tx.fileName} className="btn-save-file">
                      Save File
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
