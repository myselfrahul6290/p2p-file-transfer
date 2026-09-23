import React from 'react';

export default function Header({ serverConnected }) {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-mark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="3" />
          </svg>
        </div>
        <div className="brand-text">
          <h1>AirLink</h1>
        </div>
      </div>
      
      <div className="status-indicator-bar">
        {serverConnected ? (
          <div className="network-badge online" id="server-status-badge">
            <span className="status-dot pulsing"></span>
            <span>Online</span>
          </div>
        ) : (
          <div className="network-badge offline" id="server-status-badge">
            <span className="status-dot"></span>
            <span>Connecting...</span>
          </div>
        )}
      </div>
    </header>
  );
}
