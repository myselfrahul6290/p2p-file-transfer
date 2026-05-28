import React, { useState, useEffect } from 'react';

export default function IdentityPanel({ localId, registerLocalPIN, showToast }) {
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate a random 4-digit PIN once on startup
  useEffect(() => {
    const randomPIN = Math.floor(1000 + Math.random() * 9000).toString();
    setPin(randomPIN);
    registerLocalPIN(randomPIN);
  }, [registerLocalPIN]);

  const handlePINChange = (e) => {
    const val = e.target.value.trim();
    setPin(val);
    registerLocalPIN(val);
  };

  const handleCopyId = () => {
    if (!localId || localId === '--- - ---') return;
    navigator.clipboard.writeText(localId).then(() => {
      setCopied(true);
      showToast('Desk ID Copied', 'Address saved in your clipboard.', 'success');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <section className="panel glass-panel" id="identity-panel" aria-labelledby="identity-title">
      <div className="panel-header">
        <div className="panel-icon-wrap violet-glow">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h2 id="identity-title">This Desk ID</h2>
      </div>

      <div className="panel-body">
        <p className="section-desc">Share these credentials to allow another device to securely initiate a direct P2P link with your browser.</p>

        {/* Desk ID Display */}
        <div className="desk-id-display">
          <label className="input-label">Your Unique Desk Address</label>
          <div class="id-screen-container">
            <div className="id-screen-value" id="local-desk-id">{localId || '--- - ---'}</div>
            <button 
              className="icon-btn copy-btn" 
              onClick={handleCopyId}
              title="Copy Desk ID" 
              aria-label="Copy Desk ID"
            >
              {!copied ? (
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="copy-icon"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              ) : (
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  className="check-icon"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Password Settings */}
        <div className="password-setup-block">
          <div className="label-row">
            <label htmlFor="local-desk-password" className="input-label">Desk Session PIN</label>
            <span className="sec-badge" title="Zero-Knowledge Auth">Zero-Knowledge</span>
          </div>
          <div className="input-group-premium">
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
              id="local-desk-password" 
              value={pin}
              onChange={handlePINChange}
              placeholder="Set Session PIN" 
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
          <p className="input-tip">PIN auto-updates on server dynamically. Remote peers need this exact PIN to link.</p>
        </div>
      </div>
    </section>
  );
}
