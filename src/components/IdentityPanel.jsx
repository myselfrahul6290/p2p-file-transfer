import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function IdentityPanel({ localId, lanUrl, showToast }) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(() => {
    try {
      return sessionStorage.getItem('airlink_qr_data') || '';
    } catch (e) {
      return '';
    }
  });
  const prevUrlRef = useRef('');

  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  // On local machines, use the LAN URL so phones on same Wi-Fi can scan, otherwise use origin
  const baseOrigin = isLocal ? (lanUrl || window.location.origin) : (typeof window !== 'undefined' ? window.location.origin : '');
  const connectUrl = (localId && localId !== '--- - ---' && baseOrigin) ? `${baseOrigin}/?connect=${localId}` : '';

  useEffect(() => {
    if (!connectUrl) return;

    if (prevUrlRef.current === connectUrl) {
      return;
    }
    prevUrlRef.current = connectUrl;

    let active = true;
    QRCode.toDataURL(connectUrl, {
      width: 190,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then((url) => {
        if (active) {
          setQrDataUrl(url);
          try {
            sessionStorage.setItem('airlink_qr_data', url);
          } catch (e) {}
        }
      })
      .catch((err) => console.error('Failed to generate QR code', err));

    return () => {
      active = false;
    };
  }, [connectUrl]);

  const handleCopyId = () => {
    if (!localId || localId === '--- - ---') return;
    navigator.clipboard.writeText(localId).then(() => {
      setCopiedId(true);
      showToast('Desk ID Copied', 'Address saved in your clipboard.', 'success');
      setTimeout(() => setCopiedId(false), 2000);
    });
  };

  const handleCopyLink = () => {
    if (!connectUrl) return;
    navigator.clipboard.writeText(connectUrl).then(() => {
      setCopiedLink(true);
      showToast('Pairing Link Copied', 'Direct connection link copied to clipboard.', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  return (
    <section className="panel" id="identity-panel" aria-labelledby="identity-title">
      <div className="panel-header">
        <h2 id="identity-title">Your Device</h2>
        <span className="panel-badge">This Desk</span>
      </div>

      <div className="panel-body">
        {/* Large Clean Desk ID */}
        <div className="desk-id-hero">
          <div className="desk-id-number" id="local-desk-id">
            {localId || '--- - ---'}
          </div>
          <span className="desk-id-subtext">Share this 6-digit code or scan the QR</span>
        </div>

        {/* Crisp QR Code Card */}
        <div className="qr-container">
          <div className="qr-card">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR Code for Desk ID ${localId}`} className="qr-image" />
            ) : (
              <div className="qr-placeholder">
                <div className="qr-spinner"></div>
              </div>
            )}
          </div>
        </div>

        {/* Action Pills */}
        <div className="action-pills-row">
          <button 
            type="button"
            className="action-pill-btn" 
            onClick={handleCopyId}
            title="Copy Desk ID"
          >
            {!copiedId ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copy ID</span>
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Copied</span>
              </>
            )}
          </button>

          <button 
            type="button" 
            className="action-pill-btn" 
            onClick={handleCopyLink}
            disabled={!connectUrl}
            title="Copy Direct Link"
          >
            {!copiedLink ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <span>Copy Link</span>
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Copied</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
