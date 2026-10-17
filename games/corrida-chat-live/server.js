const path = require('path');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const dotenv = require('dotenv');
const { TikTokLiveConnection, WebcastEvent } = require('tiktok-live-connector');

dotenv.config({ path: path.join(__dirname, '.env') });

const APP_NAME = 'Corrida do Chat';
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.TLG_PORT || process.env.PORT || 3001);
const liveUsername = (process.env.TLG_USERNAME || process.env.TIKTOK_USERNAME || '')
  .replace(/^@/, '')
  .trim();
const clients = new Set();
const lastChatByUser = new Map();
const lastGiftByEvent = new Map();
let tiktokConnected = false;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};

const server = http.createServer((request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname);

  if (requestPath === '/health') {
    const ready = Boolean(liveUsername && tiktokConnected);
    response.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({
      ok: ready,
      app: APP_NAME,
      status: ready ? 'ready' : liveUsername ? 'waiting_for_tiktok' : 'missing_tiktok_username',
      tiktokConnected,
      clients: clients.size,
      liveUsername: liveUsername || null,
      port: PORT
    }));
    return;
  }

  if (requestPath === '/config') {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ liveUsername: liveUsername || null, port: PORT }));
    return;
  }

  const relativePath = requestPath === '/' ? '/index.html' : requestPath.endsWith('/') ? `${requestPath}index.html` : requestPath;
  const filePath = path.resolve(__dirname, `.${relativePath}`);
  if (!filePath.startsWith(`${__dirname}${path.sep}`)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      'Content-Type': mimeTypes[extension] || 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    });
    response.end(data);
  });
});

const webSocketServer = new WebSocket.Server({ server });
webSocketServer.on('connection', socket => {
  clients.add(socket);
  socket.send(JSON.stringify({ type: 'status', connected: tiktokConnected }));
  socket.on('close', () => clients.delete(socket));
});

function broadcast(event) {
  const message = JSON.stringify(event);
  for (const socket of clients) {
    if (socket.readyState === WebSocket.OPEN) socket.send(message);
  }
}

function connectToTikTok() {
  if (!liveUsername) {
    console.warn('TIKTOK_USERNAME nao informado no .env da Corrida do Chat.');
    broadcast({ type: 'status', connected: false });
    return;
  }

  const connection = new TikTokLiveConnection(liveUsername, { processInitialData: false });

  connection.on('gift', gift => {
    if (gift.giftType === 1 && gift.repeatEnd === false) return;
    const username = gift.user?.uniqueId || gift.user?.nickname || gift.uniqueId || gift.nickname || 'Apoiador';
    const giftId = gift.giftId || gift.giftName || 'presente';
    const repeatCount = gift.repeatCount || 1;
    const eventKey = `${username.toLowerCase()}:${giftId}:${repeatCount}`;
    const now = Date.now();
    if (now - (lastGiftByEvent.get(eventKey) || 0) < 1500) return;
    lastGiftByEvent.set(eventKey, now);
    broadcast({ type: 'gift', username, giftName: gift.giftName || 'Presente', giftId: gift.giftId, repeatCount });
    console.log(`${username} enviou ${gift.giftName || 'um presente'}`);
  });

  connection.on(WebcastEvent.CHAT, chat => {
    const username = chat.user?.uniqueId || chat.user?.nickname || chat.user?.displayName || chat.uniqueId || chat.nickname || 'Apoiador';
    const comment = chat.comment || chat.text || chat.content || '';
    const now = Date.now();
    const userKey = username.toLowerCase();
    const isCommand = comment.trim().startsWith('!');
    if (!isCommand && now - (lastChatByUser.get(userKey) || 0) < 30000) return;
    if (!isCommand) lastChatByUser.set(userKey, now);
    broadcast({ type: 'chat', username, comment });
    console.log(`Chat recebido de ${username}: ${comment}`);
  });

  connection.connect().then(() => {
    tiktokConnected = true;
    broadcast({ type: 'status', connected: true });
    console.log(`Conectado a live de @${liveUsername}`);
  }).catch(error => {
    tiktokConnected = false;
    broadcast({ type: 'status', connected: false });
    console.error('Nao foi possivel conectar a live:', error.message);
    setTimeout(connectToTikTok, 5000);
  });
}

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`A porta ${PORT} ja esta em uso.`);
    process.exit(1);
  }
  throw error;
});

server.listen(PORT, HOST, () => {
  console.log(`${APP_NAME} iniciou em http://localhost:${PORT}`);
  console.log(`Live configurada: ${liveUsername ? `@${liveUsername}` : 'nao configurada'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  connectToTikTok();
});

function shutdown() {
  webSocketServer.close();
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
