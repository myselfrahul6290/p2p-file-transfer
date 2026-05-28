import React from 'react';

export default function Header({ serverConnected }) {
  return (
    <header className="app-header">
      <div className="brand">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="brand-icon"
        >
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
        <div className="brand-text">
          <h1>AirLink <span className="accent-text">P2P</span></h1>
          <span className="tagline">Direct Peer-to-Peer Desk</span>
        </div>
      </div>
      
      <div className="status-indicator-bar">
        {serverConnected ? (
          <div className="network-badge online" id="server-status-badge">
            <span className="status-dot pulsing"></span>
            <span>Signaling Desk Connected</span>
          </div>
        ) : (
          <div className="network-badge offline" id="server-status-badge">
            <span className="status-dot"></span>
            <span>Connecting Server...</span>
          </div>
        )}
      </div>
    </header>
  );
}
