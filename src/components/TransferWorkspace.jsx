import React, { useState, useEffect } from 'react';
import FileStreams from './FileStreams';
import ChatMessenger from './ChatMessenger';

export default function TransferWorkspace({ 
  activePeerId, 
  latency, 
  disconnectSession, 
  streamFile, 
  activeTransfers, 
  setActiveTransfers, 
  chatMessages, 
  sendChatMessage 
}) {
  const [activeTab, setActiveTab] = useState('files');
  const [unreadCount, setUnreadCount] = useState(0);

  // Monitor unread chat messages
  useEffect(() => {
    if (chatMessages.length === 0) return;
    const lastMsg = chatMessages[chatMessages.length - 1];
    
    if (activeTab !== 'chat' && lastMsg.type === 'peer') {
      setUnreadCount((prev) => prev + 1);
    }
  }, [chatMessages, activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'chat') {
      setUnreadCount(0);
    }
  };

  return (
    <section className="panel glass-panel workspace-panel" id="transfer-workspace" aria-labelledby="workspace-title">
      {/* Connected Header Info */}
      <div className="workspace-header">
        <div className="connected-info">
          <div className="badge-status-glow active"></div>
          <div className="connected-details">
            <h3 id="workspace-title">P2P Session Connected</h3>
            <span className="connection-direction" id="remote-peer-label">
              Direct Desk Link: {activePeerId}
            </span>
          </div>
        </div>
        <div className="workspace-actions">
          <div className="latency-indicator" id="latency-val" title="Round Trip Time">
            RTT: <span id="rtt-time">{latency}</span>ms
          </div>
          <button className="btn-danger" onClick={disconnectSession} aria-label="Disconnect P2P Session">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="9" x2="15" y2="15" />
              <line x1="15" y1="9" x2="9" y2="15" />
            </svg>
            <span>Disconnect</span>
          </button>
        </div>
      </div>

      {/* Tabs Selector Bar */}
      <div className="workspace-tabs-bar">
        <button 
          className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`} 
          onClick={() => handleTabChange('files')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          File Streams
        </button>
        
        <button 
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} 
          onClick={() => handleTabChange('chat')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Desk Chat
          {unreadCount > 0 && (
            <span className="badge-unread" id="chat-unread-count">{unreadCount}</span>
          )}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="workspace-content">
        {activeTab === 'files' ? (
          <FileStreams 
            streamFile={streamFile}
            activeTransfers={activeTransfers}
            setActiveTransfers={setActiveTransfers}
          />
        ) : (
          <ChatMessenger 
            chatMessages={chatMessages}
            sendChatMessage={sendChatMessage}
          />
        )}
      </div>
    </section>
  );
}
