import { gameConfig, mapConfig } from './config/gameConfig.js';
import { ArenaMap } from './game/Map.js';
import { Player } from './game/Player.js';
import { Bullet } from './game/Bullet.js';
import { PlayerAI } from './game/PlayerAI.js';
import { CombatSystem } from './game/CombatSystem.js';
import { Effects } from './game/Effects.js';
import { SoundManager } from './game/SoundManager.js';
import { LiveEventManager } from './live/LiveEventManager.js';
import { WebSocketClient } from './live/WebSocketClient.js';
import { HUD } from './ui/HUD.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menuEl = document.getElementById('menu');
const gameShellEl = document.getElementById('game-shell');
const hudEl = document.getElementById('hud');
const startBtn = document.getElementById('startBtn');
const demoBtn = document.getElementById('demoBtn');
const modeSelect = document.getElementById('mode');
const mapSelect = document.getElementById('mapSelect');
const usernameInput = document.getElementById('username');
const roundEl = document.getElementById('roundChip');
const statusEl = document.getElementById('status');
const rankingEl = document.getElementById('ranking-list');
const notificationsEl = document.getElementById('notifications');
const demoPanelEl = document.getElementById('demo-panel');
const arenaInviteEl = document.getElementById('arena-invite');

const spriteImages = {
  standard: new Image(),
  crimson: new Image(),
  toxic: new Image(),
  violet: new Image(),
  elite: new Image()
};
spriteImages.standard.src = './assets/sprites/standard-soldier.svg';
spriteImages.crimson.src = './assets/sprites/crimson-soldier.svg';
spriteImages.toxic.src = './assets/sprites/toxic-soldier.svg';
spriteImages.violet.src = './assets/sprites/violet-soldier.svg';
spriteImages.elite.src = './assets/sprites/elite-soldier.svg';

const standardSkins = [
  { id: 'standard', name: 'AZURE', color: '#58d0ff' },
  { id: 'crimson', name: 'CRIMSON', color: '#ff6b7d' },
  { id: 'toxic', name: 'TOXIC', color: '#7ee787' },
  { id: 'violet', name: 'VIOLET', color: '#bd8cff' }
];
let nextSkinIndex = 0;

const hud = new HUD({
  statusEl,
  rankingEl,
  roundEl,
  notificationsEl,
  demoPanelEl,
  arenaInviteEl
});

const effects = new Effects();
const soundManager = new SoundManager();
const combatSystem = new CombatSystem();
const aiSystem = new PlayerAI(null);
const map = new ArenaMap('urban');

const state = {
  running: false,
  mode: 'live',
  round: 1,
  players: [],
  bullets: [],
  lastTime: 0,
  liveConnected: false,
  roundTimer: gameConfig.roundDuration,
  lastSpawnAt: 0,
  nextPlayerId: 1,
  eventManager: null,
  socketClient: null,
  respawnQueue: []
};

function getNewColor() {
  const palette = ['#58d0ff', '#ffd166', '#ff7a7a', '#8de59c', '#d29bff', '#fbb4d6'];
  return palette[Math.floor(Math.random() * palette.length)];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeUsername(raw) {
  return String(raw || '').replace(/^@/, '').trim().toUpperCase();
}

function isInsideObstacle(x, y, radius = 18) {
  return map.obstacles.some((obs) => {
    return x + radius > obs.x && x - radius < obs.x + obs.w && y + radius > obs.y && y - radius < obs.y + obs.h;
  });
}

function getSpawnPosition() {
  const points = map.spawns;
  for (let attempt = 0; attempt < 50; attempt++) {
    const idx = Math.floor(Math.random() * points.length);
    const point = points[idx];
    const x = point.x;
    const y = point.y;
    if (!isInsideObstacle(x, y, 18) && !state.players.some((player) => player.alive && Math.hypot(player.x - x, player.y - y) < 40)) {
      return { x, y };
    }
  }
  return { x: 270, y: 480 };
}

function getAvoidanceVector(player) {
  let avoidX = 0;
  let avoidY = 0;

  for (const obs of map.obstacles) {
    const nearestX = clamp(player.x, obs.x, obs.x + obs.w);
    const nearestY = clamp(player.y, obs.y, obs.y + obs.h);
    const dx = player.x - nearestX;
    const dy = player.y - nearestY;
    const dist = Math.hypot(dx, dy) || 1;

    if (dist < 32) {
      avoidX += (dx / dist) * (32 - dist) * 0.6;
      avoidY += (dy / dist) * (32 - dist) * 0.6;
    }
  }

  return { x: avoidX, y: avoidY };
}

function ensurePlayer(username) {
  const normalized = normalizeUsername(username);
  const existing = state.players.find((player) => normalizeUsername(player.username) === normalized);
  if (existing) {
    if (existing.alive) return existing;

    const now = performance.now();
    if (now < existing.rejoinAvailableAt) {
      return null;
    }

    respawnPlayer(existing);
    hud.notify(`${existing.username} voltou para a arena`, '#8fe7ff');
    return existing;
  }

  if (state.players.filter((player) => player.alive).length >= gameConfig.maxPlayers) {
    return null;
  }

  const spawn = getSpawnPosition();
  const skin = standardSkins[nextSkinIndex % standardSkins.length];
  nextSkinIndex += 1;
  const player = new Player({
    id: `p-${state.nextPlayerId++}`,
    username: normalized,
    x: spawn.x,
    y: spawn.y,
    color: skin.color,
    skinId: skin.id,
    skinName: skin.name,
    isBot: false
  });

  player.fireRate = gameConfig.fireRate;
  player.speed = gameConfig.moveSpeed;
  player.damage = gameConfig.bulletDamage;

  state.players.push(player);
  hud.notify(`${player.username} entrou na arena`, '#8fe7ff');
  return player;
}

function getPlayerById(id) {
  return state.players.find((player) => player.id === id);
}

function getEnemyTarget(player) {
  let best = null;
  let bestDist = Infinity;
  for (const other of state.players) {
    if (other.id === player.id || !other.alive) continue;
    const dist = Math.hypot(other.x - player.x, other.y - player.y);
    if (dist < bestDist && dist < gameConfig.aiTargetingRadius && hasLineOfSight(player, other)) {
      bestDist = dist;
      best = other;
    }
  }

  if (best) return best;
  return null;
}

function getAvoidanceX(player) {
  return getAvoidanceVector(player).x;
}

function getAvoidanceY(player) {
  return getAvoidanceVector(player).y;
}

function getPatrolPoint(player) {
  const points = map.spawns.filter((point) => {
    return !isInsideObstacle(point.x, point.y, 22) && (!player || hasLineOfSight(player, point));
  });
  return points[Math.floor(Math.random() * points.length)] || { x: player?.x || canvas.width / 2, y: player?.y || canvas.height / 2 };
}

function resolvePlayerObstacle(player, obstacle) {
  const expandedLeft = obstacle.x - player.radius;
  const expandedRight = obstacle.x + obstacle.w + player.radius;
  const expandedTop = obstacle.y - player.radius;
  const expandedBottom = obstacle.y + obstacle.h + player.radius;

  if (player.x <= expandedLeft || player.x >= expandedRight || player.y <= expandedTop || player.y >= expandedBottom) {
    return;
  }

  const pushLeft = player.x - expandedLeft;
  const pushRight = expandedRight - player.x;
  const pushTop = player.y - expandedTop;
  const pushBottom = expandedBottom - player.y;
  const smallestPush = Math.min(pushLeft, pushRight, pushTop, pushBottom);

  if (smallestPush === pushLeft) {
    player.x = expandedLeft;
    if (player.velocityX > 0) player.velocityX = 0;
  } else if (smallestPush === pushRight) {
    player.x = expandedRight;
    if (player.velocityX < 0) player.velocityX = 0;
  } else if (smallestPush === pushTop) {
    player.y = expandedTop;
    if (player.velocityY > 0) player.velocityY = 0;
  } else {
    player.y = expandedBottom;
    if (player.velocityY < 0) player.velocityY = 0;
  }
}

function segmentHitsObstacle(startX, startY, endX, endY, obstacle) {
  const steps = Math.ceil(Math.hypot(endX - startX, endY - startY) / 8);
  for (let step = 1; step < steps; step += 1) {
    const progress = step / steps;
    const x = startX + (endX - startX) * progress;
    const y = startY + (endY - startY) * progress;
    if (x > obstacle.x && x < obstacle.x + obstacle.w && y > obstacle.y && y < obstacle.y + obstacle.h) {
      return true;
    }
  }
  return false;
}

function hasLineOfSight(source, target) {
  return !map.obstacles.some((obstacle) => segmentHitsObstacle(source.x, source.y, target.x, target.y, obstacle));
}

function canShoot(source, target) {
  if (!source || !target || !source.alive || !target.alive) return false;
  const dist = Math.hypot(target.x - source.x, target.y - source.y);
  if (dist >= gameConfig.attackRange) return false;
  return hasLineOfSight(source, target);
}

function shootAt(source, target) {
  if (!source || !target || !source.alive || !target.alive) return;

  const angle = Math.atan2(target.y - source.y, target.x - source.x);
  const originX = source.x + Math.cos(angle) * (source.radius + 10);
  const originY = source.y + Math.sin(angle) * (source.radius + 10);

  const bullet = new Bullet({
    x: originX,
    y: originY,
    angle,
    ownerId: source.id,
    damage: source.getEffectiveDamage(),
    speed: gameConfig.projectileSpeed + (source.isGiftPlayer ? 1.4 : 0),
    color: source.isGiftPlayer ? '#ffd166' : '#fff7d2'
  });

  state.bullets.push(bullet);
  effects.spawnFlash(originX, originY, '#fff0a0');
  soundManager.playShot(source.isGiftPlayer);
  source.shotFlashUntil = performance.now() + 90;
}

function respawnPlayer(player) {
  if (!player) return;

  const spawn = getSpawnPosition();
  player.x = spawn.x;
  player.y = spawn.y;
  player.health = player.maxHealth;
  player.alive = true;
  player.velocityX = 0;
  player.velocityY = 0;
  player.respawnAt = 0;
  player.rejoinAvailableAt = 0;
  player.fireCooldown = 0;
    hud.notify(`${player.username} entrou novamente`, '#7ae6b2');
}

function handlePlayerDeath(player, killer) {
  player.alive = false;
  player.deaths += 1;
  effects.spawnBurst(player.x, player.y, '#ff7d7d', 30);
  hud.notify(`${killer ? killer.username : 'Arena'} eliminou ${player.username}`, '#ffb067');

  if (killer) {
    killer.kills += 1;
    killer.score += 100;
  }

  player.respawnAt = 0;
  player.rejoinAvailableAt = performance.now() + gameConfig.rejoinCooldown;
  hud.notify(`${player.username}: digite no chat para voltar`, '#ffd166');
}

function updateBullets(dt) {
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const bullet = state.bullets[i];
    bullet.update(dt);

    if (!bullet.active) {
      state.bullets.splice(i, 1);
      continue;
    }

    for (const obs of map.obstacles) {
      if (bullet.x > obs.x && bullet.x < obs.x + obs.w && bullet.y > obs.y && bullet.y < obs.y + obs.h) {
        bullet.active = false;
        effects.spawnBurst(bullet.x, bullet.y, '#dfeaff', 8);
        state.bullets.splice(i, 1);
        break;
      }
    }

    if (!bullet.active) continue;

    const hitPlayer = state.players.find((player) => {
      if (!player.alive || player.id === bullet.ownerId) return false;
      return Math.hypot(player.x - bullet.x, player.y - bullet.y) < player.radius + 5;
    });

    if (hitPlayer) {
      const owner = getPlayerById(bullet.ownerId);
      const damage = bullet.damage;
      if (hitPlayer.shieldUntil > performance.now()) {
        effects.spawnBurst(hitPlayer.x, hitPlayer.y, '#7bd6ff', 16);
      } else {
        hitPlayer.takeDamage(damage);
        effects.spawnBurst(hitPlayer.x, hitPlayer.y, '#ff6b6b', 14);
      }

      effects.spawnFlash(hitPlayer.x, hitPlayer.y, hitPlayer.shieldUntil > performance.now() ? '#7bd6ff' : '#ffb067');

      bullet.active = false;
      state.bullets.splice(i, 1);

      if (!hitPlayer.alive && owner) {
        handlePlayerDeath(hitPlayer, owner);
      }
    }
  }
}

function updatePlayers(dt) {
  aiSystem.game = {
    getEnemyTarget,
    canShoot,
    shootAt,
    players: state.players,
    getAvoidanceX,
    getAvoidanceY,
    getPatrolPoint
  };

  for (const player of state.players) {
    if (!player.alive) continue;

    aiSystem.update(player, dt);
    player.update(dt);

    player.x = clamp(player.x, 18, canvas.width - 18);
    player.y = clamp(player.y, 18, canvas.height - 18);

    for (const obs of map.obstacles) {
      resolvePlayerObstacle(player, obs);
    }
  }
}

function drawPlayer(player, timestamp) {
  if (!player.alive) return;

  const hpRatio = clamp(player.health / player.maxHealth, 0, 1);
  const moving = Math.hypot(player.velocityX, player.velocityY) > 0.08;
  const walkCycle = moving ? Math.sin(timestamp * 0.018) * 3 : 0;
  const recoil = player.shotFlashUntil > timestamp ? -3 : 0;
  const sprite = player.isGiftPlayer ? spriteImages.elite : spriteImages[player.skinId] || spriteImages.standard;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);

  if (sprite.complete && sprite.naturalWidth > 0) {
    const bob = moving ? Math.sin(timestamp * 0.018) * 1.5 : 0;
    ctx.translate(0, bob);
    ctx.globalAlpha = player.shotFlashUntil > timestamp ? 1 : 0.96;
    ctx.drawImage(sprite, -34 + recoil, -34, 68, 68);
    ctx.globalAlpha = 1;
    ctx.restore();
    drawPlayerOverlay(player, hpRatio);
    return;
  }

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 18, 16, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  if (player.isGiftPlayer) {
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.fillRect(-15, -1 + walkCycle, 7, 21);
  ctx.fillRect(8, -1 - walkCycle, 7, 21);

  ctx.fillStyle = player.isGiftPlayer ? '#ffe2a0' : '#dfeaf6';
  ctx.beginPath();
  ctx.arc(0, -10, player.isGiftPlayer ? 11 : 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = player.isGiftPlayer ? '#6d451e' : '#1a2732';
  ctx.beginPath();
  ctx.arc(0, -13, player.isGiftPlayer ? 12 : 11, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-12, -14, 24, 5);

  ctx.fillStyle = player.isGiftPlayer ? '#b87922' : player.color;
  ctx.beginPath();
  ctx.roundRect(player.isGiftPlayer ? -11 : -9, -1, player.isGiftPlayer ? 22 : 18, player.isGiftPlayer ? 20 : 18, 4);
  ctx.fill();

  ctx.fillStyle = player.isGiftPlayer ? '#f0b84d' : 'rgba(255,255,255,0.25)';
  ctx.fillRect(-5, 2, 10, 3);

  if (player.isGiftPlayer) {
    ctx.fillStyle = '#fff0ae';
    ctx.fillRect(-12, 4, 4, 9);
    ctx.fillRect(8, 4, 4, 9);
  }

  ctx.strokeStyle = player.isGiftPlayer ? '#f0b84d' : player.color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(4, 3);
  ctx.lineTo(13, -2);
  ctx.stroke();

  ctx.fillStyle = '#151b22';
  ctx.fillRect(9 + recoil, -3, player.isGiftPlayer ? 28 : 21, player.isGiftPlayer ? 7 : 5);
  ctx.fillStyle = player.isGiftPlayer ? '#ffd166' : '#d7e6ee';
  ctx.fillRect(12 + recoil, -2, player.isGiftPlayer ? 26 : 19, player.isGiftPlayer ? 4 : 3);

  ctx.fillStyle = player.isGiftPlayer ? '#fff1a8' : '#ffdb7d';
  ctx.beginPath();
  ctx.arc((player.isGiftPlayer ? 40 : 32) + recoil, 0, player.isGiftPlayer ? 4 : 3, 0, Math.PI * 2);
  ctx.fill();

  if (player.shotFlashUntil > timestamp) {
    ctx.fillStyle = player.isGiftPlayer ? '#fff0a0' : '#ffe3a3';
    ctx.beginPath();
    ctx.moveTo((player.isGiftPlayer ? 44 : 36) + recoil, 0);
    ctx.lineTo((player.isGiftPlayer ? 58 : 48) + recoil, -7);
    ctx.lineTo((player.isGiftPlayer ? 53 : 44) + recoil, 0);
    ctx.lineTo((player.isGiftPlayer ? 58 : 48) + recoil, 7);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();

  drawPlayerOverlay(player, hpRatio);
}

function drawPlayerOverlay(player, hpRatio) {

  const healthBarWidth = 36;
  const healthBarX = player.x - healthBarWidth / 2;
  const healthBarY = player.y - 34;
  ctx.fillStyle = 'rgba(5, 9, 14, 0.9)';
  ctx.fillRect(healthBarX, healthBarY, healthBarWidth, 6);
  ctx.fillStyle = hpRatio > 0.5 ? '#59d38a' : hpRatio > 0.25 ? '#ffd166' : '#ff5d73';
  ctx.fillRect(healthBarX + 1, healthBarY + 1, (healthBarWidth - 2) * hpRatio, 4);
  ctx.strokeStyle = player.isGiftPlayer ? '#ffd166' : 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, 6);

  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ebf5ff';
  ctx.fillText(player.username, player.x, player.y - 42);
  if (player.isGiftPlayer) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 9px Arial';
    ctx.fillText(player.weaponName, player.x, player.y - 53);
  }
}

function drawBullets() {
  for (const bullet of state.bullets) {
    ctx.fillStyle = bullet.color;
    ctx.shadowColor = bullet.color;
    ctx.shadowBlur = bullet.color === '#ffd166' ? 10 : 4;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawArena() {
  map.draw(ctx, canvas.width, canvas.height);
  for (const player of state.players) drawPlayer(player, performance.now());
  drawBullets();
  effects.draw(ctx);
}

function updateRanking() {
  hud.renderRanking(state.players);
  hud.setArenaInvite(!state.players.some((player) => player.alive));
}

function tick(timestamp) {
  if (!state.running) return;

  const dt = Math.min(1.5, (timestamp - state.lastTime) / 1000 || 0.016);
  state.lastTime = timestamp;

  state.roundTimer -= dt;
  if (state.roundTimer <= 0) {
    state.round += 1;
    state.roundTimer = gameConfig.roundDuration;
    hud.setRound(state.round);
    hud.notify(`Rodada ${state.round} iniciada`, '#ffd166');
  }

  updatePlayers(dt);
  updateBullets(dt);
  effects.update(dt);
  updateRanking();
  drawArena();

  requestAnimationFrame(tick);
}

function startGame({ mode = 'live', initialMap = 'urban' }) {
  soundManager.unlock();
  state.running = true;
  state.mode = mode;
  map.load(initialMap);
  hud.setRound(state.round);
  hud.showDemoPanel(mode === 'demo');
  menuEl.style.display = 'none';
  gameShellEl.classList.add('visible');
  hudEl.classList.add('visible');
  state.lastTime = performance.now();
  requestAnimationFrame(tick);
}

function setupDemoMode() {
  state.players = [];
  hud.notify('Demo mode ativado', '#7ae6b2');
  for (const name of ['TK', 'JOAO', 'MARIA', 'CARLOS', 'PEDRO']) {
    ensurePlayer(name);
  }
}

startBtn.addEventListener('click', () => {
  const mode = modeSelect.value;
  const mapName = mapSelect.value;
  const username = usernameInput.value.trim() || 'PLAYER';
  startGame({ mode, initialMap: mapName === 'urban' ? 'urban' : 'industrial' });
  if (mode === 'live') {
    const liveUser = normalizeUsername(username);
    ensurePlayer(liveUser);
    hud.setStatus(true, 'TikTok conectado');
  } else {
    setupDemoMode();
  }
});

demoBtn.addEventListener('click', () => {
  modeSelect.value = 'demo';
  startGame({ mode: 'demo', initialMap: mapSelect.value === 'urban' ? 'urban' : 'industrial' });
  setupDemoMode();
});

document.querySelectorAll('[data-demo]').forEach((button) => {
  button.addEventListener('click', () => {
    const value = button.dataset.demo;
    if (value.startsWith('add:')) {
      const username = value.replace('add:', '');
      ensurePlayer(username);
      return;
    }
    if (value.startsWith('chat:')) {
      const comment = value.replace('chat:', '');
      const player = ensurePlayer('DEMO');
      if (player) {
        player.x = 120 + Math.random() * 300;
        player.y = 140 + Math.random() * 500;
        hud.notify(`${comment} — ${player.username}`, '#8fe7ff');
      }
      return;
    }
    if (value === 'gift:Rose') {
      const player = ensurePlayer('VIP');
      if (player) {
        player.upgradeFromGift();
        hud.notify('VIP recebeu RIFLE DE OURO: dano aumentado', '#ffd166');
      }
      return;
    }
    if (value === 'clear') {
      state.players = [];
      state.bullets = [];
      hud.notify('Arena limpa', '#f0f6ff');
    }
  });
});

const eventManager = new LiveEventManager({
  onChat: (event) => {
    const username = event.username || 'VIEWER';
      ensurePlayer(username);
  },
  onGift: (event) => {
    const giver = ensurePlayer(event.username || 'VIP');
    if (!giver) return;
    giver.upgradeFromGift();
    hud.notify(`${giver.username} recebeu ${giver.weaponName}: dano aumentado`, '#ffd166');
  },
  onStatus: (event) => {
    hud.setStatus(Boolean(event.connected), event.connected ? 'TikTok conectado' : 'TikTok desconectado');
  }
});

state.eventManager = eventManager;

const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const socketUrl = window.location.protocol === 'file:' ? 'ws://localhost:3000' : `${protocol}//${window.location.host}`;

const socketClient = new WebSocketClient({
  url: socketUrl,
  onMessage: (payload) => eventManager.receiveRawEvent(payload),
  onOpen: () => hud.setStatus(true, 'TikTok conectado'),
  onClose: () => hud.setStatus(false, 'Reconectando...'),
  onError: () => hud.setStatus(false, 'Servidor offline')
});

state.socketClient = socketClient;
socketClient.connect();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('SW failed', error));
  });
}

window.addEventListener('load', () => {
  // inicialmente em menu
  hud.setStatus(false, 'Configurando arena');
});

window.__chatWar = { state, ensurePlayer, eventManager, socketClient, map, creatorMark: gameConfig.creatorMark };
