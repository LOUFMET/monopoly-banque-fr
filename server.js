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

app.post('/api/session', (req, res) => {
  const { session } = req.body;
  if (!session || !session.roomCode) {
    return res.status(400).json({ success: false, message: 'Session invalide' });
  }
  const roomCode = session.roomCode.toUpperCase();
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

wss.on('connection', (ws) => {
  let currentRoom = null;

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
        console.log(`[WebSocket] Joueur connecté au salon ${roomCode}`);
      } else if (data.type === 'SESSION_SYNC' && data.session) {
        const roomCode = (data.session.roomCode || '').toUpperCase();
        gameSessions[roomCode] = data.session;
        saveSessionsToDisk();

        // Broadcast to all clients in the same room EXCEPT sender
        wss.clients.forEach((client) => {
          if (
            client !== ws &&
            client.readyState === WebSocket.OPEN &&
            clientRooms.get(client) === roomCode
          ) {
            client.send(rawData.toString());
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
