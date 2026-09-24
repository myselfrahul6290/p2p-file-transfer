import React from 'react';
import { useWebRTC } from './hooks/useWebRTC';
import Header from './components/Header';
import IdentityPanel from './components/IdentityPanel';
import ConnectionPanel from './components/ConnectionPanel';
import TransferWorkspace from './components/TransferWorkspace';
import ToastContainer from './components/ToastContainer';

import SeoContentSection from './components/SeoContentSection';

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
    lanUrl,
    initialConnectId,
    
    connectToRemote,
    sendChatMessage,
    streamFile,
    disconnectSession,
    removeToast,
    setActiveTransfers,
    showToast
  } = useWebRTC();

  return (
    <div className="app-container">
      {/* Header */}
      <Header serverConnected={serverConnected} />

      <main className="dashboard-grid">
        {!isWorkspaceOpen ? (
          <>
            <IdentityPanel 
              localId={localId} 
              lanUrl={lanUrl}
              showToast={showToast} 
            />
            <ConnectionPanel 
              connectToRemote={connectToRemote} 
              isConnecting={isConnecting} 
              initialConnectId={initialConnectId}
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

      {/* SEO Informational & FAQ Section (Shown on Landing Screen) */}
      {!isWorkspaceOpen && <SeoContentSection />}

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-status-pills">
          <div className="footer-status-pill">
            <span className="dot-indicator green"></span>
            <span>End-to-End Encrypted</span>
          </div>
          <span className="footer-divider">•</span>
          <div className="footer-status-pill">
            <span>Direct P2P (WebRTC)</span>
          </div>
          <span className="footer-divider">•</span>
          <div className="footer-status-pill">
            <span>Zero Cloud Storage</span>
          </div>
        </div>
        <div className="footer-credits">
          <span>AirLink &bull; P2P File Sharing by <a href="https://iamrahulshaw.in/" target="_blank" rel="noopener noreferrer">Rahul Shaw</a></span>
        </div>
      </footer>

      {/* Floating notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
