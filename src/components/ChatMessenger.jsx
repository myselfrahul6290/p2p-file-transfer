import React, { useState, useEffect, useRef } from 'react';

export default function ChatMessenger({ chatMessages, sendChatMessage }) {
  const [text, setText] = useState('');
  const msgEndRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const msg = text.trim();
    if (!msg) return;
    
    sendChatMessage(msg);
    setText('');
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
        {chatMessages.map((msg) => {
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
              <div className="chat-bubble">{msg.text}</div>
              <div className="chat-time">{formatTime(msg.timestamp || Date.now())}</div>
            </div>
          );
        })}
        <div ref={msgEndRef} />
      </div>

      <form className="chat-input-bar" onSubmit={handleSubmit}>
        <input 
          type="text" 
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a secure direct message..." 
          autoComplete="off" 
          maxLength={1000} 
        />
        <button type="submit" className="chat-send-btn" aria-label="Send Message">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}
