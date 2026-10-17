require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { TikTokLiveConnection, WebcastEvent } = require('tiktok-live-connector');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.TLG_PORT || process.env.CHAT_WAR_PORT || 8082);
const liveUsername = (process.env.TLG_USERNAME || process.env.TIKTOK_USERNAME || process.argv[2] || '').replace(/^@/, '').trim();
const creatorMark = 'TK';
const clients = new Set();
let tiktokConnected = false;
let tiktokConnection = null;

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((request, response) => {
  const requestPath = new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname;

  if (requestPath === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({
      ok: true,
      app: 'CHAT WAR LIVE',
      tiktokConnected: tiktokConnected,
      liveUsername: liveUsername || null,
      clients: clients.size,
      port: PORT
    }));
    return;
  }

  const requestedPath = requestPath === '/' ? '/index.html' : requestPath;
  const filePath = path.resolve(__dirname, `.${requestedPath}`);
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
    response.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath)] || 'text/plain; charset=utf-8' });
    response.end(data);
  });
});

const webSocketServer = new WebSocket.Server({ server });

function broadcast(payload) {
  const message = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  }
}

webSocketServer.on('connection', (socket) => {
  clients.add(socket);
  socket.send(JSON.stringify({ type: 'status', connected: tiktokConnected }));
  socket.on('close', () => clients.delete(socket));
});

function connectTikTok() {
  if (!liveUsername) {
    console.warn('TIKTOK_USERNAME não configurado. O jogo seguirá disponível em demo mode.');
    return;
  }

  tiktokConnection = new TikTokLiveConnection(liveUsername, { processInitialData: false });
  tiktokConnection.on(WebcastEvent.CHAT, (event) => {
    broadcast({
      type: 'chat',
      username: event.user?.uniqueId || event.user?.nickname || 'VIEWER',
      comment: event.comment || ''
    });
  });
  tiktokConnection.on('gift', (event) => {
    if (event.giftType === 1 && event.repeatEnd === false) return;
    broadcast({
      type: 'gift',
      username: event.user?.uniqueId || event.user?.nickname || 'VIEWER',
      giftName: event.giftName || 'Presente',
      giftId: event.giftId,
      repeatCount: event.repeatCount || 1
    });
  });
  tiktokConnection.connect().then(() => {
    tiktokConnected = true;
    broadcast({ type: 'status', connected: true });
    console.log(`Conectado à live de @${liveUsername}`);
  }).catch((error) => {
    tiktokConnected = false;
    broadcast({ type: 'status', connected: false });
    console.error(`TikTok indisponível: ${error.message}`);
    setTimeout(connectTikTok, 5000);
  });
}

server.listen(PORT, HOST, () => {
  console.log(`CHAT WAR LIVE em http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  connectTikTok();
});

function shutdown() {
  if (tiktokConnection) tiktokConnection.disconnect();
  webSocketServer.close();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);