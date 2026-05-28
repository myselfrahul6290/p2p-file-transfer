import React, { useState } from 'react';

export default function ConnectionPanel({ connectToRemote, isConnecting }) {
  const [remoteId, setRemoteId] = useState('');
  const [remotePIN, setRemotePIN] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleConnect = () => {
    connectToRemote(remoteId.trim(), remotePIN.trim());
  };

  return (
    <section className="panel glass-panel" id="connection-panel" aria-labelledby="connect-title">
      <div className="panel-header">
        <div className="panel-icon-wrap cyan-glow">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <h2 id="connect-title">Connect Remote Desk</h2>
      </div>

      <div className="panel-body">
        <p className="section-desc">Initiate a direct connection by typing the Remote Desk ID and active validation PIN.</p>

        {/* Input Fields */}
        <div className="connection-fields">
          <div className="field-item">
            <label htmlFor="remote-desk-id" className="input-label">Remote Desk Address</label>
            <div className="input-group-premium focus-cyan">
              <div className="input-icon">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <input 
                type="text" 
                id="remote-desk-id" 
                value={remoteId}
                onChange={(e) => setRemoteId(e.target.value)}
                placeholder="000-000" 
                maxLength={7} 
                autoComplete="off" 
              />
            </div>
          </div>

          <div className="field-item">
            <label htmlFor="remote-desk-password" className="input-label">Remote Verification PIN</label>
            <div className="input-group-premium focus-cyan">
              <div className="input-icon">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <input 
                type={showPassword ? 'text' : 'password'} 
                id="remote-desk-password" 
                value={remotePIN}
                onChange={(e) => setRemotePIN(e.target.value)}
                placeholder="Enter remote PIN" 
                maxLength={12} 
                autoComplete="off" 
              />
              <button 
                className="icon-btn toggle-password" 
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle PIN Visibility"
              >
                {!showPassword ? (
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="eye-open-icon"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    className="eye-closed-icon"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Connection Button */}
        <button 
          className={`btn-primary ${isConnecting ? 'loading' : ''}`} 
          onClick={handleConnect}
          disabled={isConnecting}
        >
          <span className="btn-ripple-effect"></span>
          <span className="btn-content">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="btn-icon"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            <span>{isConnecting ? 'Establishing P2P link...' : 'Establish P2P Desk'}</span>
          </span>
        </button>
      </div>
    </section>
  );
}
