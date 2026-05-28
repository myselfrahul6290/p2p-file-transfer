/* AirLink P2P - Core Client Application & WebRTC Slicer Engine */

(function () {
  // --- APPLICATION STATE ---
  const state = {
    localId: null,
    localPassword: '',
    localPasswordHash: '',
    
    remoteId: '',
    remotePassword: '',
    
    ws: null,
    wsConnected: false,
    pingInterval: null,
    
    peerConnection: null,
    dataChannel: null,
    connectionDirection: null, // 'sender' or 'receiver'
    activePeerId: null,
    
    // File Transfer State (Sender)
    sendingFile: null,
    senderTransferInterval: null,
    
    // File Transfer State (Receiver)
    activeReceivingFile: null,
    
    // Speed measurements helper
    activeTransfers: {} // keyed by transferId -> { bytesTransferred, lastBytes, lastTime, speedText, etaText }
  };

  const CHUNK_SIZE = 16384; // 16KB standard slice size for maximum WebRTC throughput safety

  // --- UI DOM ELEMENTS ---
  const DOM = {
    serverStatusBadge: document.getElementById('server-status-badge'),
    serverStatusText: document.getElementById('server-status-text'),
    offlineLanBadge: document.getElementById('offline-lan-badge'),
    
    localDeskId: document.getElementById('local-desk-id'),
    btnCopyId: document.getElementById('btn-copy-id'),
    localDeskPassword: document.getElementById('local-desk-password'),
    btnToggleLocalPassword: document.getElementById('btn-toggle-local-password'),
    
    remoteDeskId: document.getElementById('remote-desk-id'),
    remoteDeskPassword: document.getElementById('remote-desk-password'),
    btnToggleRemotePassword: document.getElementById('btn-toggle-remote-password'),
    btnConnectRemote: document.getElementById('btn-connect-remote'),
    btnConnectText: document.getElementById('btn-connect-text'),
    
    transferWorkspace: document.getElementById('transfer-workspace'),
    remotePeerLabel: document.getElementById('remote-peer-label'),
    rttTime: document.getElementById('rtt-time'),
    btnDisconnect: document.getElementById('btn-disconnect'),
    
    tabFiles: document.getElementById('tab-files'),
    tabChat: document.getElementById('tab-chat'),
    tabPaneFiles: document.getElementById('tab-pane-files'),
    tabPaneChat: document.getElementById('tab-pane-chat'),
    chatUnreadCount: document.getElementById('chat-unread-count'),
    
    dropzone: document.getElementById('dropzone'),
    filePicker: document.getElementById('file-picker'),
    btnBrowseFiles: document.getElementById('btn-browse-files'),
    
    historyContainer: document.getElementById('history-container'),
    emptyHistoryText: document.getElementById('empty-history-text'),
    btnClearHistory: document.getElementById('btn-clear-history'),
    
    chatMessagesContainer: document.getElementById('chat-messages-container'),
    chatForm: document.getElementById('chat-form'),
    chatInput: document.getElementById('chat-input'),
    toastContainer: document.getElementById('toast-container')
  };

  // --- STUN SERVERS CONFIGURATION ---
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  // --- INITIALIZE APPLICATION ---
  function init() {
    setupPasswordInputs();
    setupWebSocket();
    setupUIEventListeners();
    setupDragAndDrop();
    setupCopyButton();
    setupTabs();
    
    // Generate default random session passcode
    const defaultPIN = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit PIN
    DOM.localDeskPassword.value = defaultPIN;
    state.localPassword = defaultPIN;

    // Register Service Worker for PWA / Offline LAN Mode
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then((reg) => console.log('Service Worker Registered Successfully!', reg.scope))
        .catch((err) => console.warn('Service Worker Registration Failed:', err));
    }
  }

  // --- UTILITY: TOAST NOTIFICATIONS ---
  function showToast(title, message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let svgIcon = '';
    if (type === 'success') {
      svgIcon = `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      svgIcon = `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else {
      svgIcon = `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
      ${svgIcon}
      <div class="toast-info">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
    `;

    DOM.toastContainer.appendChild(toast);
    
    // Trigger animation frame
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after duration
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // --- UTILITY: ZERO-KNOWLEDGE HASHING (SHA-256) ---
  async function computeZKHash(password, salt) {
    try {
      const msgBuffer = new TextEncoder().encode(`${password}:${salt}`);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (e) {
      console.error('Error hashing password:', e);
      // Fast insecure fallback if Web Crypto is blocked by sandbox origins
      return btoa(`${password}:${salt}`);
    }
  }

  // --- SIGNALING BACKEND CONNECTION ---
  function setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:3000';
    const wsUrl = `${protocol}//${host}`;

    console.log(`Connecting signaling websocket to ${wsUrl}`);
    
    try {
      state.ws = new WebSocket(wsUrl);
    } catch (e) {
      console.error('WebSocket connection failed:', e);
      updateServerStatus(false, 'Offline / Network Error');
      return;
    }

    state.ws.onopen = async () => {
      state.wsConnected = true;
      updateServerStatus(true, 'Signaling Desk Connected');
      showToast('Connected to Signaling', 'Ready to register Desk ID.', 'info');
      
      // Auto register local Desk ID
      await registerOnServer();
      
      // Start ping loop
      if (state.pingInterval) clearInterval(state.pingInterval);
      state.pingInterval = setInterval(() => {
        if (state.ws && state.ws.readyState === WebSocket.OPEN) {
          state.ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25000);
    };

    state.ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'registered':
            if (data.success) {
              state.localId = data.peerId;
              DOM.localDeskId.textContent = data.peerId;
              
              // Recalculate hash because salt (ID) is now defined
              state.localPasswordHash = await computeZKHash(state.localPassword, state.localId);
              updateLocalPasswordOnServer();
              
              showToast('Desk Registered', `Your Desk ID is ${data.peerId}`, 'success');
            }
            break;

          case 'connect-failed':
            setConnectionLoading(false);
            showToast('Connection Refused', data.reason, 'error');
            resetWebRTC();
            break;

          case 'connect-approved':
            // SENDER SIDE approval: Target is validated! Initialize WebRTC
            state.connectionDirection = 'sender';
            state.activePeerId = data.targetId;
            showToast('Verification Passed', `Authorized. Splicing WebRTC link with Remote Desk ${data.targetId}...`, 'info');
            initiateWebRTCLink(data.targetId);
            break;

          case 'peer-linking':
            // RECEIVER SIDE notification: Another peer is starting a handshake with us
            state.connectionDirection = 'receiver';
            state.activePeerId = data.senderId;
            showToast('Incoming Connection', `Verifying Remote Desk ${data.senderId}...`, 'info');
            break;

          case 'signal-relay':
            // Relayed signaling payloads
            handleSignalingSignal(data.senderId, data.payload);
            break;

          case 'peer-offline':
            showToast('Handshake Failed', `Desk ${data.peerId} disconnected.`, 'error');
            resetWebRTC();
            break;

          case 'peer-disconnected':
            if (state.activePeerId === data.peerId) {
              showToast('Desk Offline', `Remote Desk ${data.peerId} severed the connection.`, 'error');
              disconnectActiveSession();
            }
            break;
            
          case 'pong':
            // Heartbeat response
            break;
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    };

    state.ws.onclose = () => {
      state.wsConnected = false;
      updateServerStatus(false, 'Disconnected from Server');
      if (state.pingInterval) clearInterval(state.pingInterval);
      
      // Auto-reconnect in 5 seconds
      setTimeout(setupWebSocket, 5000);
    };
  }

  // --- WEBSOCKET EVENT SENDERS ---
  async function registerOnServer() {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    
    // Hash calculated with placeholder localId or empty first.
    state.localPasswordHash = await computeZKHash(state.localPassword, state.localId || 'pending');
    
    state.ws.send(JSON.stringify({
      type: 'register-peer',
      peerId: state.localId,
      passwordHash: state.localPasswordHash
    }));
  }

  function updateLocalPasswordOnServer() {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    state.ws.send(JSON.stringify({
      type: 'update-password',
      passwordHash: state.localPasswordHash
    }));
  }

  // --- WEBRTC PROTOCOL LOGIC ---
  async function initiateWebRTCLink(targetId) {
    try {
      createPeerConnection(targetId);
      
      // Sender creates the Data Channel
      const dataChannelOptions = {
        ordered: true // guarantees reliable, ordered sequence essential for streaming binary packets
      };
      state.dataChannel = state.peerConnection.createDataChannel('airlink-data-channel', dataChannelOptions);
      bindDataChannelEvents();

      // Create SDP Offer
      const offer = await state.peerConnection.createOffer();
      await state.peerConnection.setLocalDescription(offer);
      
      // Send offer to remote peer via WebSocket
      sendSignalingSignal(targetId, { sdp: state.peerConnection.localDescription });
    } catch (e) {
      console.error('Failed to create WebRTC Offer:', e);
      showToast('WebRTC Error', 'Failed to initialize SDP connection handshake.', 'error');
      resetWebRTC();
    }
  }

  function createPeerConnection(targetId) {
    if (state.peerConnection) {
      state.peerConnection.close();
    }

    state.peerConnection = new RTCPeerConnection(rtcConfig);

    // Relay gathered ICE candidates immediately to remote peer
    state.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingSignal(targetId, { candidate: event.candidate });
      }
    };

    // Diagnostics / Latency calculator
    let lastIceState = '';
    state.peerConnection.oniceconnectionstatechange = () => {
      const iceState = state.peerConnection.iceConnectionState;
      console.log(`WebRTC ICE State changed: ${iceState}`);
      if (iceState === 'connected' || iceState === 'completed') {
        measureLatency();
      } else if (iceState === 'failed' || iceState === 'disconnected') {
        if (state.activePeerId) {
          showToast('Connection Dropped', 'The P2P tunnel collapsed.', 'error');
          disconnectActiveSession();
        }
      }
    };
    
    // Receiver-side sets up data channel listener
    if (state.connectionDirection === 'receiver') {
      state.peerConnection.ondatachannel = (event) => {
        state.dataChannel = event.channel;
        bindDataChannelEvents();
      };
    }
  }

  function bindDataChannelEvents() {
    if (!state.dataChannel) return;

    state.dataChannel.binaryType = 'arraybuffer'; // configure to receive raw binary chunks as ArrayBuffers

    state.dataChannel.onopen = () => {
      console.log('WebRTC P2P Data Channel opened successfully!');
      setConnectionLoading(false);
      showToast('P2P Direct Secured', `Connected directly to remote desk ${state.activePeerId}!`, 'success');
      
      // Expand UI Transfer Workspace
      DOM.remotePeerLabel.textContent = `Direct Desk Link: ${state.activePeerId}`;
      DOM.transferWorkspace.classList.remove('collapsed');
      
      // Focus file tab
      switchTab('tab-files');
      
      // Scroll to bottom in chat
      appendSystemMessage(`Direct P2P Secured with Desk ID ${state.activePeerId}`);
    };

    state.dataChannel.onclose = () => {
      console.log('WebRTC P2P Data Channel closed.');
      showToast('Session Ended', 'The active direct session was terminated.', 'info');
      disconnectActiveSession();
    };

    state.dataChannel.onerror = (error) => {
      console.error('Data Channel Error:', error);
      showToast('Pipeline Error', 'Data Channel encountered a transport error.', 'error');
    };

    state.dataChannel.onmessage = (event) => {
      handleDataChannelMessage(event);
    };
  }

  function sendSignalingSignal(targetId, payload) {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    state.ws.send(JSON.stringify({
      type: 'signal-relay',
      targetId: targetId,
      payload: payload
    }));
  }

  async function handleSignalingSignal(senderId, payload) {
    try {
      // Lazy initialize peer connection on receiver if not created
      if (!state.peerConnection) {
        state.connectionDirection = 'receiver';
        state.activePeerId = senderId;
        createPeerConnection(senderId);
      }

      if (payload.sdp) {
        await state.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        
        if (state.peerConnection.remoteDescription.type === 'offer') {
          // Create SDP Answer on receiver
          const answer = await state.peerConnection.createAnswer();
          await state.peerConnection.setLocalDescription(answer);
          sendSignalingSignal(senderId, { sdp: state.peerConnection.localDescription });
        }
      } else if (payload.candidate) {
        await state.peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
    } catch (e) {
      console.error('Error handling WebRTC Signal:', e);
    }
  }

  // --- DATA PIPELINE: CHUNKING & TRANSFER (MODULE 5) ---
  
  // 1. Sending Files (Slicing)
  async function streamLocalFile(file) {
    if (!state.dataChannel || state.dataChannel.readyState !== 'open') {
      showToast('Failed to Send', 'No active direct channel open.', 'error');
      return;
    }

    const transferId = `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    // Add transfer item block to UI
    renderTransferItemUI(transferId, file.name, file.size, 'upload');
    
    // Register details in state tracker
    state.activeTransfers[transferId] = {
      bytesTransferred: 0,
      lastBytes: 0,
      lastTime: Date.now(),
      startTime: Date.now(),
      speedText: '0 KB/s',
      etaText: 'Calculating...'
    };

    // STEP A: Send initial JSON metadata
    const metadata = {
      type: 'file-meta',
      transferId: transferId,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      chunksTotal: totalChunks
    };
    
    state.dataChannel.send(JSON.stringify(metadata));

    // STEP B: Start Slicing
    let offset = 0;
    let chunkIndex = 0;
    const fileReader = new FileReader();
    
    // Configure threshold backpressure
    state.dataChannel.bufferedAmountLowThreshold = 262144; // 256KB threshold to fire onbufferedamountlow

    const readNextSlice = () => {
      if (offset >= file.size) {
        console.log(`Finished sending file: ${file.name}`);
        updateTransferCompleteUI(transferId, true);
        return;
      }
      
      const slice = file.slice(offset, offset + CHUNK_SIZE);
      fileReader.readAsArrayBuffer(slice);
    };

    fileReader.onload = (e) => {
      const arrayBuffer = e.target.result;
      
      // Send raw buffer through data channel
      try {
        state.dataChannel.send(arrayBuffer);
      } catch (err) {
        console.error('Error sending arrayBuffer chunk:', err);
        showToast('Transfer Failed', 'Buffer overflowed. Try sending smaller files or reconnecting.', 'error');
        updateTransferErrorUI(transferId);
        return;
      }

      offset += arrayBuffer.byteLength;
      chunkIndex++;

      // Update progress logic
      state.activeTransfers[transferId].bytesTransferred = offset;
      updateTransferProgressUI(transferId, offset, file.size);

      if (offset < file.size) {
        // Backpressure Flow Control
        if (state.dataChannel.bufferedAmount > 1048576) { // 1MB buffer ceiling
          state.dataChannel.onbufferedamountlow = () => {
            state.dataChannel.onbufferedamountlow = null;
            readNextSlice();
          };
        } else {
          // Immediately queue next chunk (non-blocking recursion)
          setTimeout(readNextSlice, 0);
        }
      } else {
        // Finished sending all bytes
        console.log(`Stream transfer sent all chunks: ${file.name}`);
        updateTransferCompleteUI(transferId, true);
      }
    };

    fileReader.onerror = () => {
      showToast('Read Error', 'Could not read local file slice.', 'error');
      updateTransferErrorUI(transferId);
    };

    // Trigger slice stream loop
    readNextSlice();
  }

  // 2. Receiving Files (Assembly)
  function handleDataChannelMessage(event) {
    const data = event.data;

    // Check if received text (JSON Metadata or chat messages)
    if (typeof data === 'string') {
      try {
        const payload = JSON.parse(data);
        
        if (payload.type === 'chat') {
          appendChatMessage('peer', payload.text, payload.timestamp);
          // Increment unread count if chat tab not active
          if (!DOM.tabChat.classList.contains('active')) {
            const count = parseInt(DOM.chatUnreadCount.textContent) || 0;
            DOM.chatUnreadCount.textContent = count + 1;
            DOM.chatUnreadCount.classList.remove('hidden');
          }
        }
        else if (payload.type === 'file-meta') {
          // Initialize active receiving stream
          state.activeReceivingFile = {
            transferId: payload.transferId,
            name: payload.name,
            size: payload.size,
            mimeType: payload.mimeType,
            chunksTotal: payload.chunksTotal,
            chunksReceived: 0,
            bytesReceived: 0,
            buffer: [] // accumulated raw arraybuffers
          };

          state.activeTransfers[payload.transferId] = {
            bytesTransferred: 0,
            lastBytes: 0,
            lastTime: Date.now(),
            startTime: Date.now(),
            speedText: '0 KB/s',
            etaText: 'Calculating...'
          };

          // Render receiving card item
          renderTransferItemUI(payload.transferId, payload.name, payload.size, 'download');
        }
      } catch (err) {
        console.error('Error parsing text frame on Data Channel:', err);
      }
    }
    // Else, received raw binary array buffer chunk
    else if (data instanceof ArrayBuffer) {
      const stream = state.activeReceivingFile;
      if (!stream) {
        console.warn('Received raw binary data but no active file-meta transaction defined.');
        return;
      }

      stream.buffer.push(data);
      stream.bytesReceived += data.byteLength;
      stream.chunksReceived++;

      // Update speed & progress tracker
      state.activeTransfers[stream.transferId].bytesTransferred = stream.bytesReceived;
      updateTransferProgressUI(stream.transferId, stream.bytesReceived, stream.size);

      // Check if file is completely received
      if (stream.bytesReceived >= stream.size || stream.chunksReceived >= stream.chunksTotal) {
        console.log(`Reconstruction Complete for File: ${stream.name}`);
        
        // Compile accumulated ArrayBuffers into a unified Blob
        const compiledBlob = new Blob(stream.buffer, { type: stream.mimeType });
        
        // Generate temporary URL
        const downloadUrl = URL.createObjectURL(compiledBlob);
        
        // Render successful completed state on UI with save link
        updateTransferCompleteUI(stream.transferId, false, downloadUrl, stream.name);
        
        showToast('File Received', `${stream.name} is ready for download!`, 'success');
        
        // Clear active receiving file states
        state.activeReceivingFile = null;
      }
    }
  }

  // --- REAL-TIME CHAT ENGINE ---
  function sendChatMessage(text) {
    if (!state.dataChannel || state.dataChannel.readyState !== 'open') return;
    
    const timestamp = Date.now();
    const payload = {
      type: 'chat',
      text: text,
      timestamp: timestamp
    };
    
    state.dataChannel.send(JSON.stringify(payload));
    appendChatMessage('me', text, timestamp);
  }

  // --- UI DYNAMIC RENDER ACTIONS ---
  
  function updateServerStatus(online, text) {
    if (online) {
      DOM.serverStatusBadge.className = 'network-badge online';
      DOM.serverStatusText.textContent = text;
      DOM.offlineLanBadge.classList.add('hidden');
    } else {
      DOM.serverStatusBadge.className = 'network-badge offline';
      DOM.serverStatusText.textContent = text;
      DOM.offlineLanBadge.classList.remove('hidden');
    }
  }

  function setConnectionLoading(loading) {
    if (loading) {
      DOM.btnConnectRemote.disabled = true;
      DOM.btnConnectRemote.classList.add('loading');
      DOM.btnConnectText.textContent = 'Connecting Desk...';
    } else {
      DOM.btnConnectRemote.disabled = false;
      DOM.btnConnectRemote.classList.remove('loading');
      DOM.btnConnectText.textContent = 'Establish P2P Desk';
    }
  }

  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function getFileClass(name) {
    const ext = name.split('.').pop().toLowerCase();
    const images = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    const videos = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv'];
    const audio = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
    const docs = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar', '7z'];
    
    if (images.includes(ext)) return 'image';
    if (videos.includes(ext)) return 'video';
    if (audio.includes(ext)) return 'audio';
    if (docs.includes(ext)) return 'doc';
    return 'default';
  }

  function renderTransferItemUI(id, name, size, type) {
    // Hide empty state text
    DOM.emptyHistoryText.classList.add('hidden');
    
    const fileClass = getFileClass(name);
    const textLabel = type === 'upload' ? 'Sending' : 'Receiving';
    
    const transferItem = document.createElement('div');
    transferItem.className = 'transfer-item';
    transferItem.id = `item-${id}`;
    
    transferItem.innerHTML = `
      <div class="item-meta">
        <div class="file-type-icon ${fileClass}">${name.split('.').pop().slice(0, 3)}</div>
        <div class="item-details">
          <div class="item-name" title="${name}">${name}</div>
          <div class="item-stats" id="stats-${id}">
            <span class="transfer-type-label">${textLabel}</span> • <span class="transferred-bytes">0 KB</span> of <span class="total-bytes">${formatBytes(size)}</span>
          </div>
        </div>
        <div class="progress-percent" id="pct-${id}">0%</div>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" id="bar-${id}" style="width: 0%"></div>
      </div>
      <div class="item-actions" id="actions-${id}">
        <span class="eta-label" id="eta-${id}">ETA: Calculating...</span>
        <button class="btn-cancel-transfer" data-id="${id}">Cancel</button>
      </div>
    `;
    
    DOM.historyContainer.appendChild(transferItem);
    DOM.historyContainer.scrollTop = DOM.historyContainer.scrollHeight;

    // Attach cancel button listener
    transferItem.querySelector('.btn-cancel-transfer').onclick = () => {
      showToast('Transfer Cancelled', 'Direct pipeline interrupted manually.', 'info');
      transferItem.remove();
      if (DOM.historyContainer.children.length <= 1) { // includes empty state template hidden
        DOM.emptyHistoryText.classList.remove('hidden');
      }
      // If receiver, clear receiving buffer
      if (state.activeReceivingFile && state.activeReceivingFile.transferId === id) {
        state.activeReceivingFile = null;
      }
    };
  }

  function updateTransferProgressUI(id, currentBytes, totalBytes) {
    const bar = document.getElementById(`bar-${id}`);
    const pct = document.getElementById(`pct-${id}`);
    const stats = document.getElementById(`stats-${id}`);
    const eta = document.getElementById(`eta-${id}`);
    
    if (!bar || !pct) return;

    const percentVal = Math.min(Math.round((currentBytes / totalBytes) * 100), 100);
    bar.style.width = `${percentVal}%`;
    pct.textContent = `${percentVal}%`;

    // Speed calculation
    const tracker = state.activeTransfers[id];
    if (tracker) {
      const now = Date.now();
      const timeDiff = (now - tracker.lastTime) / 1000;
      
      // Calculate speed every 500ms for visual smoothness
      if (timeDiff >= 0.5) {
        const bytesDiff = currentBytes - tracker.lastBytes;
        const currentSpeed = bytesDiff / timeDiff; // bytes per second
        
        tracker.speedText = `${formatBytes(currentSpeed)}/s`;
        
        // Calculate ETA
        const bytesLeft = totalBytes - currentBytes;
        if (currentSpeed > 0) {
          const etaSecs = Math.round(bytesLeft / currentSpeed);
          if (etaSecs > 60) {
            tracker.etaText = `ETA: ${Math.floor(etaSecs / 60)}m ${etaSecs % 60}s`;
          } else {
            tracker.etaText = `ETA: ${etaSecs}s`;
          }
        } else {
          tracker.etaText = `ETA: Stuck`;
        }

        tracker.lastBytes = currentBytes;
        tracker.lastTime = now;
      }

      // Update text details
      const transferLabel = tracker.etaText.includes('Calculating') ? 'Slicing Chunks' : tracker.speedText;
      const typeLabel = tracker.etaText.includes('Stuck') ? 'Failed' : 'Transferring';
      
      stats.innerHTML = `<span class="transferred-bytes">${formatBytes(currentBytes)}</span> of <span class="total-bytes">${formatBytes(totalBytes)}</span> • <span class="transfer-speed" style="color: var(--accent-cyan-solid); font-weight: 500;">${transferLabel}</span>`;
      eta.textContent = tracker.etaText;
    }
  }

  function updateTransferCompleteUI(id, isSender, downloadUrl = '', fileName = '') {
    const bar = document.getElementById(`bar-${id}`);
    const pct = document.getElementById(`pct-${id}`);
    const stats = document.getElementById(`stats-${id}`);
    const eta = document.getElementById(`eta-${id}`);
    const actions = document.getElementById(`actions-${id}`);
    
    if (bar) bar.style.width = '100%';
    if (pct) {
      pct.textContent = '100%';
      pct.style.color = 'var(--color-success)';
    }

    if (stats) {
      stats.innerHTML = `<span class="transfer-status-success" style="color: var(--color-success); font-weight: 600;">Complete</span> • Direct pipeline secure`;
    }

    if (eta) eta.textContent = 'Transferred Successfully';

    if (actions) {
      if (isSender) {
        actions.innerHTML = `<span style="font-size: 0.7rem; color: var(--text-muted);">Uploaded Direct</span>`;
      } else {
        actions.innerHTML = `
          <a href="${downloadUrl}" download="${fileName}" class="btn-save-file">
            Save File
          </a>
        `;
      }
    }
  }

  function updateTransferErrorUI(id) {
    const bar = document.getElementById(`bar-${id}`);
    const pct = document.getElementById(`pct-${id}`);
    const stats = document.getElementById(`stats-${id}`);
    const eta = document.getElementById(`eta-${id}`);
    
    if (bar) {
      bar.style.width = '100%';
      bar.style.background = 'var(--color-error)';
    }
    if (pct) {
      pct.textContent = 'ERR';
      pct.style.color = 'var(--color-error)';
    }
    if (stats) {
      stats.innerHTML = `<span style="color: var(--color-error); font-weight: 600;">Transfer Interrupted</span>`;
    }
    if (eta) eta.textContent = 'Pipeline broke.';
  }

  // --- UI INTERACTIVE LOGICS ---

  function setupPasswordInputs() {
    // Show/hide PIN
    DOM.btnToggleLocalPassword.onclick = () => {
      const type = DOM.localDeskPassword.type === 'password' ? 'text' : 'password';
      DOM.localDeskPassword.type = type;
      DOM.btnToggleLocalPassword.querySelector('.eye-open-icon').classList.toggle('hidden');
      DOM.btnToggleLocalPassword.querySelector('.eye-closed-icon').classList.toggle('hidden');
    };

    DOM.btnToggleRemotePassword.onclick = () => {
      const type = DOM.remoteDeskPassword.type === 'password' ? 'text' : 'password';
      DOM.remoteDeskPassword.type = type;
      DOM.btnToggleRemotePassword.querySelector('.eye-open-icon').classList.toggle('hidden');
      DOM.btnToggleRemotePassword.querySelector('.eye-closed-icon').classList.toggle('hidden');
    };

    // Change dynamic password
    DOM.localDeskPassword.onchange = async () => {
      const val = DOM.localDeskPassword.value.trim();
      if (val.length < 1) {
        showToast('Password Warning', 'Password cannot be empty. Reverting.', 'error');
        DOM.localDeskPassword.value = state.localPassword;
        return;
      }
      
      state.localPassword = val;
      state.localPasswordHash = await computeZKHash(state.localPassword, state.localId || 'pending');
      updateLocalPasswordOnServer();
      showToast('PIN Configured', 'Access credentials updated successfully.', 'success');
    };
  }

  function setupUIEventListeners() {
    // Establish P2P Handshake
    DOM.btnConnectRemote.onclick = async () => {
      const targetId = DOM.remoteDeskId.value.trim();
      const targetPIN = DOM.remoteDeskPassword.value.trim();
      
      if (!state.wsConnected) {
        showToast('Offline Mode', 'You are not connected to the matchmaking server.', 'error');
        return;
      }

      if (!targetId || !targetPIN) {
        showToast('Missing Fields', 'Type both target Desk ID and validation PIN.', 'error');
        return;
      }

      setConnectionLoading(true);
      
      // Calculate Zero-Knowledge Hash matching remote peer's details
      const hashInput = await computeZKHash(targetPIN, targetId);
      
      // Send handshake check to matchmaking gatekeeper
      state.ws.send(JSON.stringify({
        type: 'initiate-connect',
        targetId: targetId,
        passwordHash: hashInput
      }));
    };

    // Disconnect active session
    DOM.btnDisconnect.onclick = () => {
      disconnectActiveSession();
    };

    // Chat sender trigger
    DOM.chatForm.onsubmit = (e) => {
      e.preventDefault();
      const msg = DOM.chatInput.value.trim();
      if (!msg) return;
      
      sendChatMessage(msg);
      DOM.chatInput.value = '';
      DOM.chatInput.focus();
    };
  }

  function setupTabs() {
    const tabs = [DOM.tabFiles, DOM.tabChat];
    tabs.forEach(tab => {
      tab.onclick = () => {
        const targetPaneId = tab.getAttribute('data-target');
        switchTab(tab.id, targetPaneId);
      };
    });
  }

  function switchTab(tabId, paneId = null) {
    if (!paneId) {
      const tab = document.getElementById(tabId);
      paneId = tab.getAttribute('data-target');
    }

    // Toggle tab active class
    [DOM.tabFiles, DOM.tabChat].forEach(t => {
      if (t.id === tabId) t.classList.add('active');
      else t.classList.remove('active');
    });

    // Toggle panes
    [DOM.tabPaneFiles, DOM.tabPaneChat].forEach(p => {
      if (p.id === paneId) p.classList.add('active');
      else p.classList.remove('active');
    });

    // If chat active, clear unread badge
    if (tabId === 'tab-chat') {
      DOM.chatUnreadCount.textContent = '0';
      DOM.chatUnreadCount.classList.add('hidden');
      DOM.chatMessagesContainer.scrollTop = DOM.chatMessagesContainer.scrollHeight;
    }
  }

  function setupCopyButton() {
    DOM.btnCopyId.onclick = () => {
      const address = DOM.localDeskId.textContent;
      if (address === '--- - ---') return;
      
      navigator.clipboard.writeText(address).then(() => {
        DOM.btnCopyId.querySelector('.copy-icon').classList.add('hidden');
        DOM.btnCopyId.querySelector('.check-icon').classList.remove('hidden');
        
        showToast('Desk ID Copied', 'Address saved in your clipboard.', 'success');
        
        setTimeout(() => {
          DOM.btnCopyId.querySelector('.copy-icon').classList.remove('hidden');
          DOM.btnCopyId.querySelector('.check-icon').classList.add('hidden');
        }, 2000);
      });
    };
  }

  function setupDragAndDrop() {
    DOM.btnBrowseFiles.onclick = () => DOM.filePicker.click();

    DOM.filePicker.onchange = (e) => {
      const files = Array.from(DOM.filePicker.files);
      files.forEach(file => streamLocalFile(file));
      DOM.filePicker.value = ''; // reset
    };

    DOM.dropzone.ondragover = (e) => {
      e.preventDefault();
      DOM.dropzone.classList.add('dragover');
    };

    DOM.dropzone.ondragleave = () => {
      DOM.dropzone.classList.remove('dragover');
    };

    DOM.dropzone.ondrop = (e) => {
      e.preventDefault();
      DOM.dropzone.classList.remove('dragover');
      
      const files = Array.from(e.dataTransfer.files);
      files.forEach(file => streamLocalFile(file));
    };
  }

  // --- CLEANUP & RESET LOGIC ---

  function disconnectActiveSession() {
    // If WebRTC is active, send disconnection alerts or simply let it close
    resetWebRTC();
    
    // Collapse Transfer Workspace UI panel with transition
    DOM.transferWorkspace.classList.add('collapsed');
    
    // Alert Remote Peer about disconnection
    if (state.wsConnected && state.ws.readyState === WebSocket.OPEN && state.activePeerId) {
      // (Server automatically detects socket close, but this provides high-speed reaction)
      state.ws.send(JSON.stringify({
        type: 'signal-relay',
        targetId: state.activePeerId,
        payload: { event: 'disconnect-peer' }
      }));
    }

    state.activePeerId = null;
    state.connectionDirection = null;
  }

  function resetWebRTC() {
    if (state.dataChannel) {
      try { state.dataChannel.close(); } catch(e){}
      state.dataChannel = null;
    }
    
    if (state.peerConnection) {
      try { state.peerConnection.close(); } catch(e){}
      state.peerConnection = null;
    }
  }

  // --- DIALOG / LATENCY MEASUREMENT ---
  function measureLatency() {
    if (!state.peerConnection) return;
    
    // Periodic RTT measuring using stats query
    const latencyQuery = setInterval(async () => {
      if (!state.peerConnection || state.peerConnection.iceConnectionState !== 'connected') {
        clearInterval(latencyQuery);
        return;
      }

      try {
        const stats = await state.peerConnection.getStats();
        stats.forEach((report) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            if (report.currentRoundTripTime !== undefined) {
              const rttMs = Math.round(report.currentRoundTripTime * 1000);
              DOM.rttTime.textContent = rttMs;
            }
          }
        });
      } catch (err) {
        clearInterval(latencyQuery);
      }
    }, 3000);
  }

  // --- CHAT APPEND ACTIONS ---
  function appendChatMessage(direction, text, timestamp) {
    const wrap = document.createElement('div');
    wrap.className = `chat-bubble-wrap ${direction}`;
    
    const formattedTime = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    wrap.innerHTML = `
      <div class="chat-bubble">${text}</div>
      <div class="chat-time">${formattedTime}</div>
    `;
    
    DOM.chatMessagesContainer.appendChild(wrap);
    DOM.chatMessagesContainer.scrollTop = DOM.chatMessagesContainer.scrollHeight;
  }

  function appendSystemMessage(text) {
    const sys = document.createElement('div');
    sys.className = 'system-message';
    sys.innerHTML = `<span>${text}</span>`;
    DOM.chatMessagesContainer.appendChild(sys);
    DOM.chatMessagesContainer.scrollTop = DOM.chatMessagesContainer.scrollHeight;
  }

  // --- START APP ---
  window.onload = init;

})();
