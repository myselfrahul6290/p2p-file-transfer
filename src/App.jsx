import React from 'react';
import { useWebRTC } from './hooks/useWebRTC';
import Header from './components/Header';
import IdentityPanel from './components/IdentityPanel';
import ConnectionPanel from './components/ConnectionPanel';
import TransferWorkspace from './components/TransferWorkspace';
import ToastContainer from './components/ToastContainer';

export default function App() {
  const {
    localId,
    serverConnected,
    activePeerId,
    isWorkspaceOpen,
    isConnecting,
    latency,
    chatMessages,
    activeTransfers,
    toasts,
    
    registerLocalPIN,
    connectToRemote,
    sendChatMessage,
    streamFile,
    disconnectSession,
    removeToast,
    setActiveTransfers,
    showToast
  } = useWebRTC();

  return (
    <>
      {/* Mesh Moving Background */}
      <div className="mesh-bg"></div>

      {/* App Container */}
      <div className="app-container">
        
        {/* Header Badges */}
        <Header serverConnected={serverConnected} />

        <main className="dashboard-grid">
          {/* Conditional Layout Dashboard */}
          {!isWorkspaceOpen ? (
            <>
              <IdentityPanel 
                localId={localId} 
                registerLocalPIN={registerLocalPIN} 
                showToast={showToast} 
              />
              <ConnectionPanel 
                connectToRemote={connectToRemote} 
                isConnecting={isConnecting} 
              />
            </>
          ) : (
            <TransferWorkspace 
              activePeerId={activePeerId}
              latency={latency}
              disconnectSession={disconnectSession}
              streamFile={streamFile}
              activeTransfers={activeTransfers}
              setActiveTransfers={setActiveTransfers}
              chatMessages={chatMessages}
              sendChatMessage={sendChatMessage}
            />
          )}
        </main>

        {/* Footer info pills */}
        <footer className="app-footer">
          <div className="footer-links">
            <span className="footer-status-pills">
              <span className="dot-indicator green"></span> WebRTC Secure (DTLS/SRTP)
            </span>
            <span className="footer-status-pills">
              <span className="dot-indicator blue"></span> Peer-To-Peer Direct (No Server Storage)
            </span>
          </div>
          <div className="copy-text">AirLink Desk • Designed in React for visual speed</div>
        </footer>

        {/* Floating alerts queue */}
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    </>
  );
}
