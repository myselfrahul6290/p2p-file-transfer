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
// Key: peerId (string, e.g. "482-910") -> Value: { socket, socketId }
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

// Helper to normalize IP addresses (collapse IPv6 localhost to IPv4)
function normalizeIp(ip) {
  if (!ip) return '127.0.0.1';
  if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1') return '127.0.0.1';
  return ip.replace(/^::ffff:/, '');
}

// Track sockets per IP to prevent socket storms / zombie tabs
const ipToSockets = new Map();
const MAX_SOCKETS_PER_IP = 6;

// Generate unique ID for sockets
let socketIdCounter = 0;

wss.on('connection', (ws, req) => {
  const socketId = `ws_${++socketIdCounter}`;
  const rawIp = req.socket.remoteAddress || 'unknown';
  const ip = normalizeIp(rawIp);
  const port = req.socket.remotePort;
  const origin = req.headers.origin || 'No-Origin';
  const ua = req.headers['user-agent'] || 'No-UA';

  // IP throttling: track active sockets for this IP
  if (!ipToSockets.has(ip)) {
    ipToSockets.set(ip, new Set());
  }
  const socketsForIp = ipToSockets.get(ip);

  // If IP exceeds socket limit (e.g. zombie tabs storm), reject excess immediately
  if (socketsForIp.size >= MAX_SOCKETS_PER_IP) {
    console.warn(`[Socket Rejected] IP ${ip} reached limit (${MAX_SOCKETS_PER_IP}). Rejecting ${socketId}.`);
    ws.close(1008, 'Max connections per IP exceeded');
    return;
  }

  socketsForIp.add(ws);
  console.log(`[Socket connected] ID: ${socketId} | ${ip}:${port} | Active for IP: ${socketsForIp.size}`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        // Step 1: Register peer with persistent device ID
        case 'register-peer': {
          let peerId = data.peerId;
          const localIPs = getLocalIPs();

          // Prevent a single socket from re-generating multiple IDs
          const alreadyAssignedId = socketToPeerId.get(ws);
          if (alreadyAssignedId) {
            peerId = alreadyAssignedId;
          } else if (!peerId) {
            peerId = generateDeskId();
          }

          // If an existing socket was assigned to this peerId, close old socket cleanly
          if (peers.has(peerId)) {
            const existing = peers.get(peerId);
            if (existing.socket !== ws) {
              try {
                socketToPeerId.delete(existing.socket);
                existing.socket.close(1000, 'Replaced by newer connection');
              } catch (e) {}
            }
          }

          // Register in state maps
          peers.set(peerId, {
            socket: ws,
            socketId: socketId
          });
          socketToPeerId.set(ws, peerId);

          console.log(`[Peer Registered] Desk ID: ${peerId} (Socket: ${socketId})`);

          // Respond to registering client
          ws.send(JSON.stringify({
            type: 'registered',
            success: true,
            peerId: peerId,
            lanIp: localIPs.length > 0 ? localIPs[0] : null,
            port: PORT
          }));
          break;
        }

        // Step 2: Validate target and initiate WebRTC handshakes
        case 'initiate-connect': {
          const senderId = socketToPeerId.get(ws);
          let targetId = data.targetId;

          // Normalize if 6 consecutive digits without hyphen were passed
          if (typeof targetId === 'string' && /^\d{6}$/.test(targetId.trim())) {
            targetId = `${targetId.slice(0, 3)}-${targetId.slice(3, 6)}`;
          }

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
    // Untrack from IP map
    const socketsForIp = ipToSockets.get(ip);
    if (socketsForIp) {
      socketsForIp.delete(ws);
      if (socketsForIp.size === 0) {
        ipToSockets.delete(ip);
      }
    }

    const peerId = socketToPeerId.get(ws);
    console.log(`[Socket Closed] ID: ${socketId}, Associated Desk ID: ${peerId || 'None'}`);

    if (peerId) {
      socketToPeerId.delete(ws);
      // Only delete from peers map if this socket is still the registered socket for peerId
      if (peers.get(peerId)?.socket === ws) {
        peers.delete(peerId);

        // Proactively notify any active peers trying to link with this ID
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'peer-disconnected',
              peerId: peerId
            }));
          }
        });
      }
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
