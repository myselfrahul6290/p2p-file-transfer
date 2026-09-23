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
    <section className="panel workspace-panel" id="transfer-workspace" aria-labelledby="workspace-title">
      {/* Sleek Minimal Header */}
      <div className="workspace-header">
        <div className="connected-info">
          <span className="status-dot pulsing"></span>
          <div className="connected-text">
            <span className="connected-label">Connected</span>
            <span className="connected-peer-id">{activePeerId}</span>
          </div>
          {latency !== '--' && (
            <span className="latency-badge" title="Round Trip Time">
              {latency}ms
            </span>
          )}
        </div>

        <button 
          type="button"
          className="btn-disconnect" 
          onClick={disconnectSession} 
          aria-label="Disconnect P2P Session"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <span>Disconnect</span>
        </button>
      </div>

      {/* Minimal Tabs */}
      <div className="workspace-tabs-bar">
        <button 
          type="button"
          className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`} 
          onClick={() => handleTabChange('files')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span>Files</span>
        </button>
        
        <button 
          type="button"
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} 
          onClick={() => handleTabChange('chat')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Chat</span>
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
