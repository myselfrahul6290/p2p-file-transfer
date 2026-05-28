const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'dist')));

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocket.Server({ server });

// Live In-Memory State: Map of Desk IDs to Peer Info
// Key: peerId (string, e.g. "482-910") -> Value: { socket, passwordHash, socketId }
const peers = new Map();

// Map to associate WebSocket connections to Desk IDs
const socketToPeerId = new Map();

// Helper to generate a unique 6-digit desk ID (XXX-XXX)
function generateDeskId() {
  let attempts = 0;
  while (attempts < 1000) {
    const segment1 = Math.floor(100 + Math.random() * 900); // 100-999
    const segment2 = Math.floor(100 + Math.random() * 900); // 100-999
    const generatedId = `${segment1}-${segment2}`;
    if (!peers.has(generatedId)) {
      return generatedId;
    }
    attempts++;
  }
  // Fallback to timestamp if extremely crowded
  return String(Date.now()).slice(-6).replace(/(\d{3})(\d{3})/, '$1-$2');
}

// Generate unique ID for sockets
let socketIdCounter = 0;

wss.on('connection', (ws) => {
  const socketId = `ws_${++socketIdCounter}`;
  console.log(`[Socket connected] ID: ${socketId}`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        // Step 1: Register new peer with optional custom ID & password hash
        case 'register-peer': {
          let peerId = data.peerId;
          const passwordHash = data.passwordHash;

          // If no peer ID is supplied or if already in use, generate a new one
          if (!peerId || peers.has(peerId)) {
            peerId = generateDeskId();
          }

          // Register in state maps
          peers.set(peerId, {
            socket: ws,
            passwordHash: passwordHash,
            socketId: socketId
          });
          socketToPeerId.set(ws, peerId);

          console.log(`[Peer Registered] Desk ID: ${peerId} (Socket: ${socketId})`);

          // Respond to registering client
          ws.send(JSON.stringify({
            type: 'registered',
            success: true,
            peerId: peerId
          }));
          break;
        }

        // Live Password Update
        case 'update-password': {
          const peerId = socketToPeerId.get(ws);
          if (peerId && peers.has(peerId)) {
            const peerInfo = peers.get(peerId);
            peerInfo.passwordHash = data.passwordHash;
            peers.set(peerId, peerInfo);
            console.log(`[Credentials Updated] Desk ID: ${peerId}`);
            ws.send(JSON.stringify({ type: 'password-updated', success: true }));
          }
          break;
        }

        // Step 2: Validate credentials and initiate WebRTC handshakes
        case 'initiate-connect': {
          const senderId = socketToPeerId.get(ws);
          const targetId = data.targetId;
          const providedPasswordHash = data.passwordHash;

          console.log(`[Link Request] Sender ${senderId} -> Receiver ${targetId}`);

          if (!senderId) {
            ws.send(JSON.stringify({
              type: 'connect-failed',
              reason: 'You must be registered first.'
            }));
            return;
          }

          if (senderId === targetId) {
            ws.send(JSON.stringify({
              type: 'connect-failed',
              reason: 'Cannot establish a connection to your own desk address.'
            }));
            return;
          }

          // Check if target exists and is online
          if (!peers.has(targetId)) {
            ws.send(JSON.stringify({
              type: 'connect-failed',
              reason: 'Remote Desk is offline or does not exist.'
            }));
            return;
          }

          const targetPeer = peers.get(targetId);

          // Verify Password Hash (Zero-Knowledge verification)
          if (targetPeer.passwordHash !== providedPasswordHash) {
            console.log(`[Link Refused] Invalid password PIN for ${targetId}`);
            ws.send(JSON.stringify({
              type: 'connect-failed',
              reason: 'Verification failed. Incorrect Remote PIN.'
            }));
            return;
          }

          // Approved! Notify the initiator to prepare and generate Offer
          console.log(`[Link Approved] Handshake authorized: ${senderId} <-> ${targetId}`);
          ws.send(JSON.stringify({
            type: 'connect-approved',
            targetId: targetId
          }));

          // Notify the target that a peer is opening connection (to prepare answers)
          targetPeer.socket.send(JSON.stringify({
            type: 'peer-linking',
            senderId: senderId
          }));
          break;
        }

        // Relay signaling payloads securely (SDP Offers/Answers and ICE candidates)
        case 'signal-relay': {
          const senderId = socketToPeerId.get(ws);
          const targetId = data.targetId;
          const payload = data.payload;

          if (!senderId) return;

          if (peers.has(targetId)) {
            const targetPeer = peers.get(targetId);
            targetPeer.socket.send(JSON.stringify({
              type: 'signal-relay',
              senderId: senderId,
              payload: payload
            }));
          } else {
            console.log(`[Relay Failed] Destination ${targetId} went offline during handshake.`);
            ws.send(JSON.stringify({
              type: 'peer-offline',
              peerId: targetId
            }));
          }
          break;
        }

        // Heartbeat to sustain persistent WebSocket connection
        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        }
        
        default:
          console.log(`[Unknown message type]`, data.type);
      }
    } catch (err) {
      console.error(`[Error parsing socket payload]`, err);
    }
  });

  // Purge records on disconnect
  ws.on('close', () => {
    const peerId = socketToPeerId.get(ws);
    console.log(`[Socket Closed] ID: ${socketId}, Associated Desk ID: ${peerId || 'None'}`);

    if (peerId) {
      peers.delete(peerId);
      socketToPeerId.delete(ws);

      // Proactively notify any active peers trying to link with this ID
      // (Clients can also monitor via WebRTC Connection State transitions)
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'peer-disconnected',
            peerId: peerId
          }));
        }
      });
    }
  });
});

// Retrieve IPv4 LAN Addresses for offline execution
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

// Start Server listening
server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`AirLink P2P Signaling Engine Active!`);
  console.log(`---------------------------------------------------`);
  console.log(`Local Access:  http://localhost:${PORT}`);
  
  const localIPs = getLocalIPs();
  if (localIPs.length > 0) {
    console.log(`LAN Access:`);
    localIPs.forEach(ip => {
      console.log(`               http://${ip}:${PORT}`);
    });
  }
  console.log(`===================================================`);
});
