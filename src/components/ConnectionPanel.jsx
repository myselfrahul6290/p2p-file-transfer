import React, { useState, useEffect, useRef } from 'react';

export default function ConnectionPanel({ connectToRemote, isConnecting, initialConnectId }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (initialConnectId) {
      const clean = initialConnectId.replace(/\D/g, '').slice(0, 6);
      if (clean.length === 6) {
        setDigits(clean.split(''));
      }
    }
  }, [initialConnectId]);

  const isComplete = digits.every((d) => d.length === 1);

  const getFormattedId = () => {
    return `${digits.slice(0, 3).join('')}-${digits.slice(3, 6).join('')}`;
  };

  const handleConnect = () => {
    const rawDigits = digits.join('');
    if (rawDigits.length !== 6) return;
    connectToRemote(getFormattedId());
  };

  const handleChange = (index, e) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      setDigits(nextDigits);
      return;
    }

    // Take the last entered character if replacing
    const char = val.slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = char;
    setDigits(nextDigits);

    // Auto-advance to next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move backward if current is empty
        const nextDigits = [...digits];
        nextDigits[index - 1] = '';
        setDigits(nextDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const nextDigits = [...digits];
        nextDigits[index] = '';
        setDigits(nextDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isComplete && !isConnecting) {
        handleConnect();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const cleanDigits = pastedData.replace(/\D/g, '').slice(0, 6);
    if (!cleanDigits) return;

    const nextDigits = [...digits];
    for (let i = 0; i < cleanDigits.length; i++) {
      nextDigits[i] = cleanDigits[i];
    }
    setDigits(nextDigits);

    // Focus next empty or last box
    const focusIndex = Math.min(cleanDigits.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <section className="panel" id="connection-panel" aria-labelledby="connect-title">
      <div className="panel-header">
        <h2 id="connect-title">Connect to Device</h2>
        <span className="panel-badge">Remote Link</span>
      </div>

      <div className="panel-body">
        {/* OTP Input Section */}
        <div className="otp-container">
          <label className="input-label">Enter 6-digit Desk Code</label>
          <div className="otp-boxes-wrapper" onPaste={handlePaste}>
            <div className="otp-group">
              {[0, 1, 2].map((idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digits[idx]}
                  onChange={(e) => handleChange(idx, e)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className={`otp-digit-box ${digits[idx] ? 'filled' : ''}`}
                  autoComplete="off"
                  aria-label={`Digit ${idx + 1}`}
                />
              ))}
            </div>

            <div className="otp-separator" aria-hidden="true">—</div>

            <div className="otp-group">
              {[3, 4, 5].map((idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digits[idx]}
                  onChange={(e) => handleChange(idx, e)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className={`otp-digit-box ${digits[idx] ? 'filled' : ''}`}
                  autoComplete="off"
                  aria-label={`Digit ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Minimal Action Button */}
        <button 
          type="button"
          className={`btn-connect ${isConnecting ? 'loading' : ''}`} 
          onClick={handleConnect}
          disabled={isConnecting || !isComplete}
        >
          {isConnecting ? (
            <>
              <div className="btn-spinner"></div>
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <span>Connect</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </>
          )}
        </button>
      </div>
    </section>
  );
}
