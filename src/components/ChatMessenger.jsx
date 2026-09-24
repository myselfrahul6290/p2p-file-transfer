import React, { useState, useEffect, useRef } from 'react';

export default function ChatMessenger({ chatMessages, sendChatMessage }) {
  const [text, setText] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const msgEndRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const msg = text.trim();
    if (!msg) return;
    
    sendChatMessage(msg);
    setText('');
  };

  const handleCopy = (id, textToCopy) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  // Automated scroll to bottom when new messages arrive
  useEffect(() => {
    if (msgEndRef.current) {
      msgEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-wrapper">
      <div className="chat-messages">
        {chatMessages.length === 0 ? (
          <div className="chat-empty">
            <p>Direct Chat &amp; Clipboard Sync</p>
            <span>Send text, links, or copied notes peer-to-peer without server storage</span>
          </div>
        ) : (
          chatMessages.map((msg) => {
            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="system-message">
                  <span>{msg.text}</span>
                </div>
              );
            }

            const isMe = msg.type === 'me';
            return (
              <div key={msg.id} className={`chat-bubble-wrap ${isMe ? 'me' : 'peer'}`}>
                <div className="chat-bubble-content">
                  <div className="chat-bubble">{msg.text}</div>
                  <button 
                    type="button" 
                    className="chat-copy-btn" 
                    onClick={() => handleCopy(msg.id, msg.text)}
                    title={copiedId === msg.id ? "Copied!" : "Copy to clipboard"}
                    aria-label="Copy message"
                  >
                    {copiedId === msg.id ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    )}
                  </button>
                </div>
                <div className="chat-time">{formatTime(msg.timestamp || Date.now())}</div>
              </div>
            );
          })
        )}
        <div ref={msgEndRef} />
      </div>

      <form className="chat-input-bar" onSubmit={handleSubmit}>
        <input 
          type="text" 
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Send a message, link, or clipboard text..." 
          autoComplete="off" 
          maxLength={1000} 
        />
        <button type="submit" className="chat-send-btn" aria-label="Send Message" disabled={!text.trim()}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}
