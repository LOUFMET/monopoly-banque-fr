import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const SESSIONS_FILE = path.join(__dirname, 'game_sessions.json');

// In-memory rooms cache
let gameSessions = {};

// Load sessions from disk if available
if (fs.existsSync(SESSIONS_FILE)) {
  try {
    gameSessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    console.log(`[Banque Server] ${Object.keys(gameSessions).length} parties chargées depuis le disque.`);
  } catch (e) {
    console.error('Erreur lecture sessions:', e);
  }
}

const saveSessionsToDisk = () => {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(gameSessions, null, 2));
  } catch (e) {
    console.error('Erreur écriture sessions:', e);
  }
};

app.use(express.json());

// API Endpoints for Room Discovery & Sync across multiple devices
app.get('/api/session/:roomCode', (req, res) => {
  const roomCode = (req.params.roomCode || '').toUpperCase();
  const session = gameSessions[roomCode];
  if (!session) {
    return res.status(404).json({ success: false, message: `Salon ${roomCode} introuvable` });
  }
  return res.json({ success: true, session });
});

app.post('/api/session/:roomCode/join', (req, res) => {
  const roomCode = (req.params.roomCode || '').toUpperCase();
  const session = gameSessions[roomCode];
  if (!session) {
    return res.status(404).json({ success: false, message: `Salon ${roomCode} introuvable` });
  }

  const { playerName, color, token, existingPlayerId } = req.body;
  const requestedName = (playerName || '').trim();

  // If existingPlayerId provided, check if player already exists
  let targetPlayer = null;
  if (existingPlayerId) {
    targetPlayer = session.players.find((p) => p.id === existingPlayerId);
  }

  // If not found by ID, check if name matches an existing player
  if (!targetPlayer && requestedName) {
    targetPlayer = session.players.find(
      (p) => p.name.toLowerCase() === requestedName.toLowerCase()
    );
  }

  if (targetPlayer) {
    // Reconnecting as existing player
    if (color && targetPlayer.color !== color) {
      targetPlayer.color = color;
    }
    if (token) {
      targetPlayer.token = token;
    }
    session.version = (session.version || 0) + 1;
    session.updatedAt = Date.now();
    saveSessionsToDisk();

    // Broadcast update
    const payload = JSON.stringify({
      type: 'SESSION_SYNC',
      session,
      senderId: 'SERVER',
    });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && clientRooms.get(client) === roomCode) {
        client.send(payload);
      }
    });

    return res.json({ success: true, session, player: targetPlayer, isNew: false });
  }

  // Create new player
  const finalName = requestedName || `Joueur ${session.players.length + 1}`;
  const newPlayerId = 'p_' + Math.random().toString(36).substring(2, 8);
  const newPlayer = {
    id: newPlayerId,
    name: finalName,
    token: token || '',
    color: color || '#10B981',
    balance: session.startingCash,
    isBanker: false,
    isHost: false,
    isBankrupt: false,
    joinedAt: Date.now(),
  };

  const joinTx = {
    id: 'tx_' + Math.random().toString(36).substring(2, 8),
    timestamp: Date.now(),
    type: 'BANK_DISBURSEMENT',
    fromId: 'BANK',
    fromName: 'La Banque',
    toId: newPlayerId,
    toName: newPlayer.name,
    amount: session.startingCash,
    title: 'Entrée en jeu',
    description: `Mise de départ distribuée à ${newPlayer.name}`,
  };

  session.players.push(newPlayer);
  session.transactions = [joinTx, ...(session.transactions || [])];
  session.version = (session.version || 0) + 1;
  session.updatedAt = Date.now();
  saveSessionsToDisk();

  // Broadcast update to all WebSocket clients in the room
  const payload = JSON.stringify({
    type: 'SESSION_SYNC',
    session,
    senderId: 'SERVER',
  });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && clientRooms.get(client) === roomCode) {
      client.send(payload);
    }
  });

  console.log(`[Banque Server] Nouveau joueur "${newPlayer.name}" (${newPlayer.id}) ajouté au salon ${roomCode}. Total: ${session.players.length} joueurs.`);
  return res.json({ success: true, session, player: newPlayer, isNew: true });
});

app.post('/api/session', (req, res) => {
  const { session } = req.body;
  if (!session || !session.roomCode) {
    return res.status(400).json({ success: false, message: 'Session invalide' });
  }
  const roomCode = session.roomCode.toUpperCase();
  const existing = gameSessions[roomCode];

  if (existing) {
    // Version check: do not overwrite if incoming version is strictly older
    if ((session.version || 0) < (existing.version || 0)) {
      console.log(`[POST /api/session] Session rejetée (version reçue obsolète: ${session.version} < ${existing.version})`);
      return res.json({ success: true, roomCode, session: existing, ignored: true });
    }

    // Safety check: ensure existing players are preserved if omitted by a stale packet
    if (Array.isArray(existing.players) && Array.isArray(session.players)) {
      const missingPlayers = existing.players.filter(
        (ep) => !session.players.some((sp) => sp.id === ep.id)
      );
      if (missingPlayers.length > 0) {
        console.warn(`[POST /api/session] Préservation de ${missingPlayers.length} joueur(s) manquant(s) dans le salon ${roomCode}`);
        session.players.push(...missingPlayers);
      }
    }
  }

  gameSessions[roomCode] = session;
  saveSessionsToDisk();

  // Notify WebSocket clients connected to this room
  const payload = JSON.stringify({
    type: 'SESSION_SYNC',
    session,
    senderId: 'API_SERVER',
  });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && clientRooms.get(client) === roomCode) {
      client.send(payload);
    }
  });

  return res.json({ success: true, roomCode });
});

// Serve static build from dist
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('L’application n’est pas encore compilée. Lancez "npm run build" d’abord.');
  });
}

// Map client socket -> roomCode
const clientRooms = new Map();

// WebSocket Heartbeat / Ping-Pong (prevents proxy & tunnel timeouts)
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      clientRooms.delete(ws);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 25000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

wss.on('connection', (ws) => {
  let currentRoom = null;
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (rawData) => {
    try {
      const data = JSON.parse(rawData.toString());

      if (data.type === 'JOIN_ROOM') {
        const roomCode = (data.roomCode || '').toUpperCase();
        currentRoom = roomCode;
        clientRooms.set(ws, roomCode);

        // If session exists in server memory, send current state to newly joined client
        if (gameSessions[roomCode]) {
          ws.send(
            JSON.stringify({
              type: 'SESSION_SYNC',
              session: gameSessions[roomCode],
              senderId: 'SERVER',
            })
          );
        }
        console.log(`[WebSocket] Client connecté au salon ${roomCode} (Total clients WS: ${wss.clients.size})`);
      } else if (data.type === 'SESSION_SYNC' && data.session) {
        const roomCode = (data.session.roomCode || '').toUpperCase();
        const incoming = data.session;
        const current = gameSessions[roomCode];

        if (current && (incoming.version || 0) < (current.version || 0)) {
          // Reject stale update and send current server version back to client
          ws.send(
            JSON.stringify({
              type: 'SESSION_SYNC',
              session: current,
              senderId: 'SERVER',
            })
          );
          return;
        }

        // Safety check: preserve existing players if incoming packet accidentally omitted any
        if (current && Array.isArray(current.players) && Array.isArray(incoming.players)) {
          const missingPlayers = current.players.filter(
            (ep) => !incoming.players.some((sp) => sp.id === ep.id)
          );
          if (missingPlayers.length > 0) {
            incoming.players.push(...missingPlayers);
          }
        }

        gameSessions[roomCode] = incoming;
        saveSessionsToDisk();

        // Broadcast to all clients in the same room EXCEPT sender
        const broadcastPayload = JSON.stringify({
          type: 'SESSION_SYNC',
          session: incoming,
          senderId: data.senderId || 'SERVER',
        });
        wss.clients.forEach((client) => {
          if (
            client !== ws &&
            client.readyState === WebSocket.OPEN &&
            clientRooms.get(client) === roomCode
          ) {
            client.send(broadcastPayload);
          }
        });
      } else if (data.type === 'TRANSACTION_NOTIFY') {
        const roomCode = currentRoom;
        // Broadcast to all clients in the room
        wss.clients.forEach((client) => {
          if (
            client !== ws &&
            client.readyState === WebSocket.OPEN &&
            clientRooms.get(client) === roomCode
          ) {
            client.send(rawData.toString());
          }
        });
      }
    } catch (e) {
      console.error('[WebSocket] Erreur traitement message:', e);
    }
  });

  ws.on('close', () => {
    clientRooms.delete(ws);
  });
});

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log(`=============================================================`);
  console.log(`🎩 SERVEUR MONOPOLY BANQUE FR DÉMARRÉ SUR LE PORT ${PORT}`);
  console.log(`=============================================================`);
  console.log(`• Sur votre PC :          http://localhost:${PORT}`);
  console.log(`• Sur votre Wi-Fi maison: http://${localIp}:${PORT}`);
  console.log(`-------------------------------------------------------------`);
  console.log(`🌐 POUR JOUER CHEZ VOS AMIS (EXTÉRIEUR) :`);
  console.log(`  Dans un autre terminal, lancez : npm run tunnel`);
  console.log(`  Puis partagez le lien généré (https://...) à vos amis !`);
  console.log(`=============================================================`);
});
