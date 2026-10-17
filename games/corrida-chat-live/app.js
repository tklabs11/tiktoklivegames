const canvas = document.querySelector('#raceCanvas');
const ctx = canvas.getContext('2d');
const modeMenu = document.querySelector('#modeMenu');
const appShell = document.querySelector('.app-shell');
const W = canvas.width;
const H = canvas.height;
const TOTAL_LAPS = 20;
const LIVE_BOT_COOLDOWN = 20;
const MAX_LIVE_BOTS = 5;
const POWER_PICKUP_COOLDOWN = 6;
const MAX_POWER_PICKUPS = 3;
const MAX_LANE_OFFSET = 24;
const COLORS = ['#35e7ff','#ff3f72','#ffd34f','#67e58c','#b77cff','#ff8b3d','#f3f5f7'];
const POWER_LABELS = { turbo:'TURBO', nitro:'NITRO', shield:'ESCUDO', bomb:'BOMBA', magnet:'IMÃ', push:'EMPURRÃO', freeze:'CONGELAR', lightning:'RAIO' };
const POWER_PICKUP_TYPES = Object.keys(POWER_LABELS);
const POWER_PICKUP_COLORS = { turbo:'#ffd34f', nitro:'#ff8b3d', shield:'#53e8ff', bomb:'#ff477e', magnet:'#b77cff', push:'#c18cff', freeze:'#8dd8ff', lightning:'#fff17a' };
const LIVE_BOT_NAMES = ['Lucas', 'Mariana', 'Gabriel', 'Ana', 'Rafael', 'Julia', 'Pedro', 'Larissa', 'Miguel', 'Camila'];
const state = { players: [], race: 'idle', mode: 'menu', weather: 'clear', weatherTimer: 18, weatherEvent: '', startAt: 0, raceStartedAt: 0, elapsed: 0, finishOrder: [], bombs: [], powerPickups: [], powerPickupTimer: POWER_PICKUP_COOLDOWN, particles: [], events: [], lastFrame: performance.now(), selected: null, liveConnected: false, liveBotTimer: LIVE_BOT_COOLDOWN, liveRestartTimer: null };

function setModeMenuVisible(visible) {
  modeMenu.classList.toggle('hidden', !visible);
  modeMenu.toggleAttribute('hidden', !visible);
  modeMenu.style.setProperty('display', visible ? 'grid' : 'none', 'important');
  modeMenu.style.setProperty('visibility', visible ? 'visible' : 'hidden', 'important');
  modeMenu.style.setProperty('opacity', visible ? '1' : '0', 'important');
  modeMenu.style.setProperty('pointer-events', visible ? 'auto' : 'none', 'important');
  appShell.dataset.mode = visible ? 'menu' : state.mode || 'demo';
}
const track = { x: 84, y: 92, width: 372, height: 806, radius: 92, road: 78 };
const keys = new Set();
const sound = { context: null, engineTimer: 0 };
function unlockAudio() { if (!window.AudioContext) return; sound.context ||= new AudioContext(); if (sound.context.state === 'suspended') sound.context.resume(); }
function tone(frequency, duration, type = 'square', volume = .045, endFrequency = frequency / 2) { if (!sound.context || sound.context.state !== 'running') return; const now = sound.context.currentTime; const oscillator = sound.context.createOscillator(); const gain = sound.context.createGain(); oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, now); oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), now + duration); gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(volume, now + .01); gain.gain.exponentialRampToValueAtTime(.0001, now + duration); oscillator.connect(gain); gain.connect(sound.context.destination); oscillator.start(now); oscillator.stop(now + duration + .02); }
function playSound(name) { const sounds = { crash: () => tone(100, .2, 'sawtooth', .11, 38), turbo: () => tone(260, .3, 'sawtooth', .07, 720), nitro: () => tone(150, .55, 'sawtooth', .11, 980), shield: () => tone(520, .35, 'sine', .07, 820), bomb: () => tone(90, .45, 'sawtooth', .13, 28), power: () => tone(420, .18, 'square', .05, 860), lap: () => { tone(520, .14, 'square', .06, 780); setTimeout(() => tone(780, .2, 'square', .06, 1040), 110); }, finish: () => { tone(440, .18, 'square', .07, 660); setTimeout(() => tone(660, .25, 'square', .07, 990), 150); } }; sounds[name]?.(); }
function engineSound(dt) { if (!sound.context || sound.context.state !== 'running' || state.race !== 'running') return; sound.engineTimer -= dt; if (sound.engineTimer <= 0) { sound.engineTimer = .22; tone(72, .09, 'sawtooth', .012, 52); } }

function logEvent(text, color = '#ffd34f') {
  state.events.unshift({ text, color, life: 3.2 });
  state.events = state.events.slice(0, 4);
  document.querySelector('#eventLog').textContent = text;
}
function addLiveBot() {
  const freeName = LIVE_BOT_NAMES.find(name => !state.players.some(player => player.name === name.toUpperCase()));
  const name = freeName || `Convidado ${state.players.length + 1}`;
  const player = addPlayer(name);
  if (player && state.race === 'running') {
    player.isBot = true;
    player.status = 'racing';
    player.progress = 0;
    player.speed = 0;
    player.lives = 5;
    player.finished = false;
  }
  if (player) player.isBot = true;
  return player;
}

function updateLiveBots(dt) {
  if (state.mode !== 'live' || state.race !== 'running') return;
  state.liveBotTimer -= dt;
  if (state.liveBotTimer <= 0) {
    const activeBotCount = state.players.filter(player => player.isBot && player.status !== 'eliminated' && !player.finished).length;
    if (activeBotCount < MAX_LIVE_BOTS) addLiveBot();
    state.liveBotTimer = LIVE_BOT_COOLDOWN;
  }
}

function startMode(mode) {
  state.mode = mode;
  state.liveBotTimer = LIVE_BOT_COOLDOWN;
  appShell.dataset.mode = mode;
  setModeMenuVisible(false);
  document.querySelector('#testPanel').classList.toggle('hidden', mode !== 'demo');
  document.querySelector('#testPanel').style.display = mode === 'demo' ? 'block' : 'none';
  document.querySelector('.live-status').textContent = mode === 'live' ? '● LIVE' : '● DEMO';
  logEvent(mode === 'live' ? '🔴 TikTok LIVE selecionado. Aguardando o chat...' : '🧪 Modo Demo ativado.', mode === 'live' ? '#ff477e' : '#53e8ff');
  if (mode === 'live') {
    if (state.players.length === 0) {
      addLiveBot();
    }
    if (state.race === 'idle') startRace();
    connectLiveBridge();
  }
}

function resetToMenu() {
  if (state.liveRestartTimer) {
    clearTimeout(state.liveRestartTimer);
    state.liveRestartTimer = null;
  }
  state.mode = 'menu';
  state.race = 'idle';
  appShell.dataset.mode = 'menu';
  setModeMenuVisible(true);
  document.querySelector('#testPanel').classList.add('hidden');
  document.querySelector('#testPanel').style.display = 'none';
  document.querySelector('#results').classList.add('hidden');
}
function addPlayer(username) {
  const clean = String(username || '').trim().toUpperCase().slice(0, 12);
  if (!clean || state.players.some(player => player.name === clean)) return null;
  const laneSlot = state.players.length % 5;
  const player = { id: `r-${Date.now()}-${Math.random()}`, name: clean, color: COLORS[state.players.length % COLORS.length], number: state.players.length + 1, progress: 0, speed: 0, baseSpeed: 0.055 + Math.random() * 0.012, lane: (laneSlot - 2) * 12, lives: 5, score: 0, status: 'ready', shield: 0, turbo: 0, nitro: 0, freeze: 0, magnet: 0, heldPower: null, pendingPower: null, lastTargetId: null, isBot: false, driftTimer: 0, driftCooldown: 4 + Math.random() * 7, driftDirection: 1, damageFlash: 0, collisionCooldown: 0, smoke: 0, wobble: Math.random() * 10, finished: false };
  state.players.push(player);
  if (state.mode === 'live' && state.race === 'running') player.status = 'racing';
  state.selected ||= player;
  logEvent(`💬 ${clean} entrou na corrida`, '#53f3ff');
  return player;
}
function connectLiveBridge() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(`${protocol}//${window.location.host}`);

  socket.addEventListener('open', () => {
    state.liveConnected = true;
    logEvent('🟢 Ponte TikTok conectada', '#66e39a');
  });

  socket.addEventListener('message', event => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type === 'status') {
        state.liveConnected = Boolean(payload.connected);
        if (!payload.connected) {
          logEvent('⏳ Aguardando conexão da live do TikTok...', '#ffd34f');
        }
        return;
      }

      if (payload.type === 'chat') {
        const username = String(payload.username || '').trim();
        if (!username) return;
        addPlayer(username);
        if (state.race === 'idle') startRace();
        return;
      }

      if (payload.type === 'gift') handleGift(payload);
    } catch (error) {
      console.warn('Evento de live inválido', error);
    }
  });

  socket.addEventListener('close', () => {
    state.liveConnected = false;
    if (state.mode === 'live') {
      logEvent('🔌 Conexão da live perdida. Reconnectando...', '#ff8b3d');
      setTimeout(connectLiveBridge, 3000);
    }
  });
}
function randomGiftPower() {
  return POWER_PICKUP_TYPES[Math.floor(Math.random() * POWER_PICKUP_TYPES.length)];
}
function handleGift(payload) {
  const username = String(payload.username || '').trim();
  const player = username ? addPlayer(username) : null;
  const targetName = player?.name || username || state.selected?.name || 'TK';
  const power = randomGiftPower();
  if (username) logEvent(`🎁 ${username} mandou ${payload.giftName || 'presente'} e ganhou ${POWER_LABELS[power]}!`, '#ffb703');
  if (state.race === 'idle' && state.mode === 'live') startRace();
  if (state.race === 'running') usePower(power, targetName);
  else if (player) player.pendingPower = power;
}
function resetPlayers() { state.players = []; state.bombs = []; state.powerPickups = []; state.finishOrder = []; state.race = 'idle'; state.selected = null; document.querySelector('#results').classList.add('hidden'); logEvent('Aguardando pilotos...', '#8290a0'); }
function startRace() {
  unlockAudio();
  setModeMenuVisible(false);
  const minimumPlayers = state.mode === 'live' ? 1 : 2;
  if (state.players.length < minimumPlayers) { logEvent(`Adicione pelo menos ${minimumPlayers} piloto${minimumPlayers > 1 ? 's' : ''} para largar.`, '#ff6b7d'); return; }
  if (state.mode === 'live') state.liveBotTimer = LIVE_BOT_COOLDOWN;
  state.race = 'countdown'; state.startAt = performance.now(); state.raceStartedAt = 0; state.elapsed = 0; state.finishOrder = []; state.bombs = []; state.powerPickups = []; state.powerPickupTimer = POWER_PICKUP_COOLDOWN; state.weather = 'clear'; state.weatherTimer = 18 + Math.random() * 10; state.weatherEvent = '';
  state.players.forEach((player, index) => { player.progress = -index * 0.002; player.speed = 0; player.lives = 5; player.finished = false; player.status = 'racing'; player.shield = 0; player.turbo = 0; player.nitro = 0; player.freeze = 0; player.magnet = 0; player.heldPower = null; player.pendingPower = null; player.lastTargetId = null; player.driftTimer = 0; player.driftCooldown = 4 + Math.random() * 7; player.driftDirection = Math.random() < .5 ? -1 : 1; player.damageFlash = 0; player.collisionCooldown = 0; player.smoke = 0; });
  document.querySelector('#results').classList.add('hidden');
  logEvent('🏁 NOVA CORRIDA! Pilotos preparados', '#ffd34f');
}
function startRunning(now) { state.race = 'running'; state.raceStartedAt = now; document.querySelector('#countdown').textContent = '🚦 VALENDO!'; setTimeout(() => { document.querySelector('#countdown').textContent = ''; }, 900); logEvent('🚦 VALENDO!', '#66e39a'); for (const player of state.players) { if (player.status === 'ready') player.status = 'racing'; if (player.pendingPower) { const power = player.pendingPower; player.pendingPower = null; usePower(power, player.name); } } }
function trackPoint(progress, lane = 0) {
  const perimeter = 2 * (track.width - 2 * track.radius) + 2 * (track.height - 2 * track.radius) + 2 * Math.PI * track.radius;
  let distance = ((progress % 1) + 1) % 1 * perimeter;
  const segments = [
    { length: track.width - 2 * track.radius, point: t => ({ x: track.x + track.radius + t * (track.width - 2 * track.radius), y: track.y, angle: 0 }) },
    { length: Math.PI * track.radius / 2, point: t => { const a = -Math.PI / 2 + t * Math.PI / 2; return { x: track.x + track.width - track.radius + Math.cos(a) * track.radius, y: track.y + track.radius + Math.sin(a) * track.radius, angle: a + Math.PI / 2 }; } },
    { length: track.height - 2 * track.radius, point: t => ({ x: track.x + track.width, y: track.y + track.radius + t * (track.height - 2 * track.radius), angle: Math.PI / 2 }) },
    { length: Math.PI * track.radius / 2, point: t => { const a = t * Math.PI / 2; return { x: track.x + track.width - track.radius + Math.cos(a) * track.radius, y: track.y + track.height - track.radius + Math.sin(a) * track.radius, angle: a + Math.PI / 2 }; } },
    { length: track.width - 2 * track.radius, point: t => ({ x: track.x + track.width - track.radius - t * (track.width - 2 * track.radius), y: track.y + track.height, angle: Math.PI }) },
    { length: Math.PI * track.radius / 2, point: t => { const a = Math.PI / 2 + t * Math.PI / 2; return { x: track.x + track.radius + Math.cos(a) * track.radius, y: track.y + track.height - track.radius + Math.sin(a) * track.radius, angle: a + Math.PI / 2 }; } },
    { length: track.height - 2 * track.radius, point: t => ({ x: track.x, y: track.y + track.height - track.radius - t * (track.height - 2 * track.radius), angle: -Math.PI / 2 }) },
    { length: Math.PI * track.radius / 2, point: t => { const a = Math.PI + t * Math.PI / 2; return { x: track.x + track.radius + Math.cos(a) * track.radius, y: track.y + track.radius + Math.sin(a) * track.radius, angle: a + Math.PI / 2 }; } }
  ];
  for (const segment of segments) { if (distance <= segment.length) { const result = segment.point(distance / segment.length); const normalX = -Math.sin(result.angle) * lane; const normalY = Math.cos(result.angle) * lane; return { x: result.x + normalX, y: result.y + normalY, angle: result.angle }; } distance -= segment.length; }
  return trackPoint(0, lane);
}
function clampLane(lane) { return Math.max(-MAX_LANE_OFFSET, Math.min(MAX_LANE_OFFSET, lane)); }
function distanceScore(player) { return player.progress + player.lives * 0.00001; }
function sortedPlayers() { return [...state.players].sort((a, b) => distanceScore(b) - distanceScore(a)); }
function spawnParticles(x, y, color, count = 12, speed = 2) { for (let i = 0; i < count; i++) { const angle = Math.random() * Math.PI * 2; state.particles.push({ x, y, vx: Math.cos(angle) * Math.random() * speed, vy: Math.sin(angle) * Math.random() * speed, life: .35 + Math.random() * .45, color, size: 2 + Math.random() * 4 }); } }
function spawnPowerPickup() {
  if (state.powerPickups.length >= MAX_POWER_PICKUPS) return;
  state.powerPickups.push({
    type: POWER_PICKUP_TYPES[Math.floor(Math.random() * POWER_PICKUP_TYPES.length)],
    progress: .08 + Math.random() * .84,
    lane: -26 + Math.random() * 52,
    age: 0
  });
}
function chooseBotTarget(player) {
  const opponents = sortedPlayers().filter(item => item !== player && item.status === 'racing');
  if (!opponents.length) return player;
  const nextTarget = opponents.find(item => item.id !== player.lastTargetId) || opponents[0];
  player.lastTargetId = nextTarget.id;
  return nextTarget;
}
function useHeldBotPower(player) {
  if (!player.isBot || !player.heldPower || state.race !== 'running') return;
  const type = player.heldPower;
  player.heldPower = null;
  usePower(type, player.name, chooseBotTarget(player));
}
function updatePowerPickups(dt) {
  state.powerPickupTimer -= dt;
  if (state.powerPickupTimer <= 0) {
    spawnPowerPickup();
    state.powerPickupTimer = POWER_PICKUP_COOLDOWN + Math.random() * 3;
  }
  for (const pickup of state.powerPickups) {
    pickup.age += dt;
    const pickupPoint = trackPoint(pickup.progress, pickup.lane);
    for (const player of state.players) {
      if (player.status !== 'racing' || player.heldPower) continue;
      const playerPoint = trackPoint(player.progress, player.lane);
      if (Math.hypot(playerPoint.x - pickupPoint.x, playerPoint.y - pickupPoint.y) < 24) {
        player.heldPower = pickup.type;
        player.score += 5;
        spawnParticles(pickupPoint.x, pickupPoint.y, POWER_PICKUP_COLORS[pickup.type], 14, 2.5);
        logEvent(`✨ ${player.name} pegou ${POWER_LABELS[pickup.type]}!`, POWER_PICKUP_COLORS[pickup.type]);
        pickup.collected = true;
        useHeldBotPower(player);
        break;
      }
    }
  }
  state.powerPickups = state.powerPickups.filter(pickup => !pickup.collected && pickup.age < 30);
}
function updateWeather(dt) {
  state.weatherTimer -= dt;
  if (state.weatherTimer > 0) return;
  if (state.weather === 'clear') {
    state.weather = 'rain';
    state.weatherTimer = 12 + Math.random() * 8;
    state.weatherEvent = '🌧️ Chuva na pista! Cuidado com as derrapagens.';
    logEvent(state.weatherEvent, '#8dd8ff');
  } else {
    state.weather = 'clear';
    state.weatherTimer = 18 + Math.random() * 12;
    state.weatherEvent = '☀️ A pista secou. A aderência voltou ao normal.';
    logEvent(state.weatherEvent, '#ffd34f');
  }
}
function usePower(type, username, targetPlayer = null) {
  const player = state.players.find(item => item.name === String(username || '').toUpperCase()) || state.selected || sortedPlayers()[0];
  if (!player || state.race !== 'running') return;
  state.selected = player;
  const target = targetPlayer || sortedPlayers().find(item => item !== player && !item.finished) || player;
  const point = trackPoint(player.progress, player.lane);
  if (type === 'turbo') player.turbo = 3.2;
  if (type === 'nitro') player.nitro = 1.2;
  if (type === 'shield') player.shield = 5;
  if (type === 'bomb') state.bombs.push({ progress: player.progress + .018, lane: player.lane, owner: player.id, life: 12, armTimer: .35 });
  if (type === 'magnet') target.magnet = 3;
  if (type === 'freeze') target.freeze = 3;
  if (type === 'push') { target.progress = Math.max(0, target.progress - .025); spawnParticles(point.x, point.y, '#b77cff', 24, 4); }
  if (type === 'lightning') { target.lives = Math.max(0, target.lives - 1); target.damageFlash = .6; target.smoke = 2; spawnParticles(...Object.values(trackPoint(target.progress, target.lane)).slice(0, 2), '#fff17a', 30, 5); if (!target.lives) eliminatePlayer(target); }
  player.score += 15;
  playSound(type === 'nitro' ? 'nitro' : type === 'turbo' ? 'turbo' : type === 'shield' ? 'shield' : type === 'bomb' ? 'bomb' : 'power');
  logEvent(`⚡ ${player.name} ativou ${POWER_LABELS[type]}!`, type === 'shield' ? '#53e8ff' : '#ffd34f');
}
function eliminatePlayer(player) {
  if (player.status === 'eliminated') return;
  player.status = 'eliminated';
  player.speed = 0;
  player.smoke = 8;
  spawnParticles(...Object.values(trackPoint(player.progress, player.lane)).slice(0, 2), '#ff477e', 32, 4);
  logEvent(`💥 ${player.name} FOI ELIMINADO!`, '#ff477e');
  setTimeout(() => {
    const playerIndex = state.players.indexOf(player);
    if (playerIndex === -1 || player.status !== 'eliminated') return;
    state.players.splice(playerIndex, 1);
    if (state.selected === player) state.selected = sortedPlayers()[0] || null;
  }, 5000);
}
function collisionCheck(dt) {
  for (let i = 0; i < state.players.length; i++) for (let j = i + 1; j < state.players.length; j++) {
    const a = state.players[i], b = state.players[j]; if (a.status !== 'racing' || b.status !== 'racing' || a.collisionCooldown > 0 || b.collisionCooldown > 0) continue;
    const pa = trackPoint(a.progress, a.lane), pb = trackPoint(b.progress, b.lane); const distance = Math.hypot(pa.x - pb.x, pa.y - pb.y);
    if (distance < 30 && Math.abs(a.progress - b.progress) < .035) {
      const laneGap = Math.abs(a.lane - b.lane);
      if (laneGap < 16) {
        const push = a.lane <= b.lane ? 5 : -5;
        a.lane = clampLane(a.lane - push);
        b.lane = clampLane(b.lane + push);
      }
      if (a.shield > 0 || b.shield > 0) { a.shield = 0; b.shield = 0; spawnParticles((pa.x + pb.x) / 2, (pa.y + pb.y) / 2, '#53e8ff', 18, 3); logEvent('🛡️ Colisão bloqueada por escudo!', '#53e8ff'); }
      else { const hit = Math.random() < .5 ? a : b; a.collisionCooldown = .55; b.collisionCooldown = .55; hit.lives = Math.max(0, hit.lives - (Math.random() < .22 ? 2 : 1)); hit.damageFlash = .45; hit.smoke = .8; hit.progress = Math.max(0, hit.progress - .008); hit.speed *= .55; playSound('crash'); spawnParticles((pa.x + pb.x) / 2, (pa.y + pb.y) / 2, '#ff8b3d', 22, 3); logEvent(`💥 ${a.name} bateu em ${b.name}!`, '#ff8b3d'); if (hit.lives <= 0) eliminatePlayer(hit); }
    }
  }
  for (let i = state.bombs.length - 1; i >= 0; i--) {
    const bomb = state.bombs[i];
    bomb.life -= dt;
    bomb.armTimer = Math.max(0, bomb.armTimer - dt);
    const bombPoint = trackPoint(bomb.progress, bomb.lane);
    let exploded = false;
    for (const player of state.players) {
      if (exploded || player.status !== 'racing' || player.id === bomb.owner || bomb.armTimer > 0) continue;
      const playerPoint = trackPoint(player.progress, player.lane);
      if (Math.hypot(playerPoint.x - bombPoint.x, playerPoint.y - bombPoint.y) < 30) {
        if (player.shield) player.shield = 0;
        else {
          player.lives = Math.max(0, player.lives - 1);
          player.damageFlash = .5;
          player.speed *= .45;
        }
        spawnParticles(bombPoint.x, bombPoint.y, '#ff477e', 34, 4);
        playSound('bomb');
        logEvent(`💣 Bomba atingiu ${player.name}!`, '#ff477e');
        bomb.life = 0;
        exploded = true;
        if (!player.lives) eliminatePlayer(player);
      }
    }
    if (bomb.life <= 0) state.bombs.splice(i, 1);
  }
}
function updateRace(dt, now) {
  if (state.race === 'countdown') { const elapsed = now - state.startAt; const count = Math.ceil(3 - elapsed / 800); document.querySelector('#countdown').textContent = count > 0 ? count : ''; if (elapsed >= 2400) startRunning(now); return; }
  if (state.race !== 'running') return;
  state.elapsed = (now - state.raceStartedAt) / 1000;
  updateWeather(dt);
  updatePowerPickups(dt);
  for (const player of state.players) {
    if (player.status !== 'racing') continue;
    player.turbo = Math.max(0, player.turbo - dt); player.nitro = Math.max(0, player.nitro - dt); player.shield = Math.max(0, player.shield - dt); player.freeze = Math.max(0, player.freeze - dt); player.magnet = Math.max(0, player.magnet - dt); player.damageFlash = Math.max(0, player.damageFlash - dt); player.collisionCooldown = Math.max(0, player.collisionCooldown - dt); player.smoke = Math.max(0, player.smoke - dt);
    player.driftCooldown -= dt;
    if (player.driftCooldown <= 0) {
      player.driftTimer = .7 + Math.random() * .8;
      player.driftCooldown = 6 + Math.random() * 10;
      player.driftDirection = Math.random() < .5 ? -1 : 1;
      logEvent(`💨 ${player.name} deu uma derrapada!`, '#ffb45c');
    }
    if (player.driftTimer > 0) {
      player.driftTimer = Math.max(0, player.driftTimer - dt);
      player.lane = clampLane(player.lane + player.driftDirection * dt * (state.weather === 'rain' ? 13 : 8));
    }
    const variation = Math.sin(now * .002 + player.wobble) * .004 + Math.sin(now * .0007 + player.wobble) * .002; const boost = player.nitro ? .055 : player.turbo ? .025 : 0; const slow = player.freeze ? .55 : player.magnet ? .8 : 1; const weatherGrip = state.weather === 'rain' ? .88 : 1; const driftGrip = player.driftTimer > 0 ? (state.weather === 'rain' ? .58 : .72) : 1; const targetSpeed = (player.baseSpeed + variation + boost) * slow * weatherGrip * driftGrip; player.speed += (targetSpeed - player.speed) * Math.min(1, dt * 4); player.progress += player.speed * dt;
    const curvePoint = trackPoint(player.progress, player.lane);
    if (player.driftTimer > 0 && Math.random() < dt * 14) { state.particles.push({ x: curvePoint.x - Math.cos(curvePoint.angle) * 14, y: curvePoint.y - Math.sin(curvePoint.angle) * 14, vx: 0, vy: 0, life: .3, color: '#313b40', size: 3 }); }
    if (Math.abs(Math.sin(curvePoint.angle)) > .42 && Math.random() < dt * 7) { const rearX = curvePoint.x - Math.cos(curvePoint.angle) * 18; const rearY = curvePoint.y - Math.sin(curvePoint.angle) * 18; state.particles.push({ x: rearX, y: rearY, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, life: .35 + Math.random() * .35, color: '#d7d9d5', size: 3 + Math.random() * 4 }); }
    if (player.progress >= TOTAL_LAPS) { player.progress = TOTAL_LAPS; player.finished = true; player.status = 'finished'; player.score += Math.max(100, 500 - state.finishOrder.length * 75); state.finishOrder.push(player); logEvent(`🏆 ${player.name} terminou a corrida!`, '#ffd34f'); }
    else if (Math.floor(player.progress) > Math.floor(player.progress - player.speed * dt)) { player.score += 25; playSound('lap'); logEvent(`🏁 ${player.name} completou a volta ${Math.floor(player.progress)}!`, '#66e39a'); }
  }
  collisionCheck(dt);
  if (state.players.filter(player => player.status === 'racing').length === 0) finishRace();
}
function finishRace() {
  state.race = 'finished';
  playSound('finish');
  const order = [...state.finishOrder, ...sortedPlayers().filter(player => !state.finishOrder.includes(player))];
  const winner = order[0];
  const results = document.querySelector('#results');
  results.innerHTML = `<h2>🏆 ${winner ? `${winner.name} venceu!` : 'Corrida encerrada'}</h2><p class="winner-copy">${winner ? `Campeão das ${TOTAL_LAPS} voltas` : 'Nenhum piloto concluiu a prova.'}</p>${order.map((player, index) => `<p>${index < 3 ? ['🥇','🥈','🥉'][index] : `${index + 1}.`} <strong>${player.name}</strong> · ${player.finished ? `${TOTAL_LAPS} voltas` : `${Math.floor(player.progress)} voltas`} · ⭐ ${player.score}</p>`).join('')}<button class="primary wide" id="restartFromResults">🚦 Nova rodada</button>`;
  results.classList.remove('hidden');
  document.querySelector('#restartFromResults').onclick = startRace;
  logEvent(winner ? `🏆 ${winner.name} venceu a corrida!` : '🚦 Corrida encerrada.', '#ffd34f');
  if (state.mode === 'live') {
    state.liveRestartTimer = setTimeout(() => {
      state.liveRestartTimer = null;
      if (state.mode === 'live') startRace();
    }, 4500);
  }
}
function drawTrack() {
  ctx.fillStyle = '#355d37'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 38; i++) { const x = (i * 89) % W; const y = (i * 137) % H; ctx.fillStyle = i % 2 ? '#407447' : '#2e5532'; ctx.beginPath(); ctx.arc(x, y, 5 + (i % 4), 0, Math.PI * 2); ctx.fill(); }
  drawScenery();
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#172128'; ctx.lineWidth = track.road + 18; drawTrackLine(); ctx.stroke(); ctx.strokeStyle = '#5f6364'; ctx.lineWidth = track.road; drawTrackLine(); ctx.stroke(); ctx.strokeStyle = '#f4d738'; ctx.lineWidth = 3; drawTrackLine(); ctx.stroke(); ctx.setLineDash([16, 18]); ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2; drawTrackLine(); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  for (let i = 0; i < 42; i++) { const point = trackPoint(i / 42); ctx.fillStyle = i % 2 ? '#f7f7f0' : '#ed3d4d'; ctx.save(); ctx.translate(point.x, point.y); ctx.rotate(point.angle); ctx.fillRect(-8, -track.road / 2 - 8, 16, 8); ctx.restore(); }
  drawFinishLine();
  for (const bomb of state.bombs) { const point = trackPoint(bomb.progress, bomb.lane); ctx.fillStyle = '#ff477e'; ctx.shadowColor = '#ff477e'; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(point.x, point.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
  drawPowerPickups();
}
function drawPowerPickups() {
  for (const pickup of state.powerPickups) {
    const point = trackPoint(pickup.progress, pickup.lane);
    const color = POWER_PICKUP_COLORS[pickup.type];
    const pulse = 10 + Math.sin(pickup.age * 6) * 2;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.fillStyle = `${color}33`;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 0, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#101820';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(POWER_LABELS[pickup.type][0], 0, 1);
    ctx.restore();
  }
}
function drawFinishLine() {
  const point = trackPoint(0); const normalX = -Math.sin(point.angle); const normalY = Math.cos(point.angle); const squares = 8; const squareSize = track.road / squares;
  ctx.save(); ctx.translate(point.x, point.y); ctx.rotate(point.angle);
  for (let index = 0; index < squares; index++) { ctx.fillStyle = index % 2 ? '#f4f5ef' : '#161b20'; ctx.fillRect(-squareSize / 2, -track.road / 2 + index * squareSize, 3, squareSize); }
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(-2, -track.road / 2, 4, track.road);
  ctx.restore();
}
function drawCrowd() {
  const fanColors = ['#ff477e', '#35e7ff', '#ffd34f', '#66e39a', '#b77cff', '#f4f7fb'];
  const wave = Math.sin(performance.now() * .006);
  const stands = [{ x: 8, width: 62 }, { x: 470, width: 62 }];
  for (const stand of stands) {
    ctx.fillStyle = '#17232c';
    ctx.fillRect(stand.x, 132, stand.width, 700);
    ctx.fillStyle = '#283b46';
    for (let row = 0; row < 5; row++) ctx.fillRect(stand.x + 4, 165 + row * 128, stand.width - 8, 4);
    for (let row = 0; row < 9; row++) {
      for (let column = 0; column < 4; column++) {
        const x = stand.x + 11 + column * 14;
        const y = 150 + row * 75;
        const color = fanColors[(row * 4 + column) % fanColors.length];
        ctx.fillStyle = '#f0b38e';
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.fillRect(x - 5, y + 4, 10, 9);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 3, y + 7);
        ctx.lineTo(x - 7, y + 2 + wave * 3);
        ctx.moveTo(x + 3, y + 7);
        ctx.lineTo(x + 7, y + 2 - wave * 3);
        ctx.stroke();
      }
    }
  }
  ctx.fillStyle = '#101a22';
  ctx.fillRect(126, 30, 288, 38);
  ctx.strokeStyle = '#ffd34f';
  ctx.lineWidth = 2;
  ctx.strokeRect(126, 30, 288, 38);
  ctx.fillStyle = '#ffd34f';
  ctx.font = 'bold 15px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('CORRIDA DO CHAT', 270, 54);
  ctx.textAlign = 'left';
  for (const x of [116, 424]) {
    ctx.fillStyle = '#dbe7ef';
    ctx.fillRect(x, 72, 3, 42);
    ctx.fillStyle = x < 270 ? '#ff477e' : '#35e7ff';
    ctx.beginPath();
    ctx.moveTo(x + 3, 74);
    ctx.lineTo(x + 29, 82);
    ctx.lineTo(x + 3, 92);
    ctx.closePath();
    ctx.fill();
  }
}
function drawInfieldDecor() {
  const pulse = 1 + Math.sin(performance.now() * .003) * .04;
  const leaderName = sortedPlayers()[0]?.name || 'LIVE';
  const leaderLabel = leaderName.slice(0, 10);
  ctx.save();
  ctx.translate(270, 470);
  ctx.fillStyle = 'rgba(8, 25, 31, .32)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 78, 112, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#244d42';
  ctx.strokeStyle = '#66e39a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 72, 105, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#35e7ff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 43 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#ffd34f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 30 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#101a22';
  ctx.beginPath();
  ctx.arc(0, 0, 23, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd34f';
  ctx.font = `bold ${leaderLabel.length > 8 ? 8 : 11}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(leaderLabel, 0, 0);
  ctx.textBaseline = 'alphabetic';
  for (const x of [-56, 56]) {
    ctx.fillStyle = '#dbe7ef';
    ctx.fillRect(x - 1, -74, 2, 32);
    ctx.fillStyle = x < 0 ? '#ff477e' : '#35e7ff';
    ctx.beginPath();
    ctx.moveTo(x + 1, -72);
    ctx.lineTo(x + 21, -65);
    ctx.lineTo(x + 1, -58);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
function drawScenery() {
  drawCrowd();
  drawInfieldDecor();
  const trees = [[42,130],[475,185],[62,520],[470,710],[82,875],[455,880]];
  for (const [x,y] of trees) { ctx.fillStyle = '#563b25'; ctx.fillRect(x - 4, y + 12, 8, 24); ctx.fillStyle = '#63bd5d'; ctx.shadowColor = '#63bd5d'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(x, y, 19, 0, Math.PI * 2); ctx.arc(x - 13, y + 8, 13, 0, Math.PI * 2); ctx.arc(x + 13, y + 8, 13, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
  for (const [x,y] of [[35,350],[495,430],[28,760],[510,600]]) { ctx.fillStyle = '#1e252d'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + i * 12, y, 7, 0, Math.PI * 2); ctx.fill(); } }
  ctx.fillStyle = '#e9edf0'; ctx.fillRect(15, 40, 90, 28); ctx.fillStyle = '#ff477e'; ctx.fillRect(15, 40, 90, 5); ctx.fillStyle = '#15202a'; ctx.font = 'bold 10px Arial'; ctx.fillText('RACE 01', 30, 58);
  ctx.fillStyle = '#25323b'; ctx.fillRect(420, 780, 90, 52); ctx.fillStyle = '#53626a'; for (let i = 0; i < 5; i++) ctx.fillRect(428 + i * 16, 790, 9, 32);
}
function drawTrackLine() { ctx.beginPath(); for (let i = 0; i <= 100; i++) { const p = trackPoint(i / 100); if (!i) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); } }
function drawCar(player, now) { const point = trackPoint(player.progress % 1, player.lane); const angle = point.angle; ctx.save(); ctx.translate(point.x, point.y); ctx.rotate(angle); if (player.status === 'eliminated') ctx.globalAlpha = .45; ctx.fillStyle = 'rgba(0,0,0,.42)'; ctx.beginPath(); ctx.ellipse(0, 13, 23, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#111923'; ctx.fillRect(-14, -12, 28, 24); ctx.fillStyle = player.color; ctx.beginPath(); ctx.roundRect(-18, -10, 36, 20, 6); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(-13, -8, 26, 3); ctx.fillStyle = '#17222b'; ctx.beginPath(); ctx.roundRect(-7, -7, 14, 7, 2); ctx.fill(); ctx.fillStyle = '#e8fbff'; ctx.fillRect(-5, -6, 10, 3); ctx.fillStyle = '#0b1117'; ctx.fillRect(-17, -13, 8, 4); ctx.fillRect(9, -13, 8, 4); ctx.fillRect(-17, 9, 8, 4); ctx.fillRect(9, 9, 8, 4); ctx.fillStyle = '#f7f7f0'; ctx.fillRect(-17, -7, 4, 4); ctx.fillRect(-17, 3, 4, 4); ctx.fillStyle = '#ff477e'; ctx.fillRect(13, -5, 4, 10); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(-3, -10, 6, 20); if (player.turbo || player.nitro) { ctx.fillStyle = player.nitro ? '#ff7f39' : '#ffd34f'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12; ctx.beginPath(); ctx.moveTo(-18, -5); ctx.lineTo(-32 - Math.random() * 8, 0); ctx.lineTo(-18, 5); ctx.fill(); ctx.shadowBlur = 0; } if (player.shield) { ctx.strokeStyle = '#53e8ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.stroke(); } if (player.damageFlash) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(-20, -13, 40, 26); } ctx.restore();
  ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(`${player.number} ${player.name}`, point.x, point.y - 19); ctx.fillStyle = '#141b22'; ctx.fillRect(point.x - 20, point.y - 15, 40, 4); ctx.fillStyle = player.lives > 2 ? '#66e39a' : player.lives > 1 ? '#ffd34f' : '#ff477e'; ctx.fillRect(point.x - 19, point.y - 14, 38 * player.lives / 5, 2); if (player.smoke) { for (let i = 0; i < 3; i++) { ctx.fillStyle = `rgba(215,225,225,${Math.random() * .4})`; ctx.beginPath(); ctx.arc(point.x - 18 - i * 5, point.y + i * 3, 4 + i * 2, 0, Math.PI * 2); ctx.fill(); } } }
function drawWeather(now) { if (state.weather !== 'rain') return; ctx.fillStyle = 'rgba(30, 70, 100, .08)'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = 'rgba(150, 220, 255, .42)'; ctx.lineWidth = 1; for (let index = 0; index < 90; index++) { const x = (index * 73 + now * .12) % W; const y = (index * 137 + now * .42) % H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 14); ctx.stroke(); } }
function drawHud() { const ranking = sortedPlayers(); ctx.fillStyle = '#0a1019dd'; ctx.fillRect(12, 12, 185, 106); ctx.strokeStyle = '#42e8ff88'; ctx.strokeRect(12, 12, 185, 106); ctx.fillStyle = '#ffd34f'; ctx.font = 'bold 13px Arial'; ctx.fillText('🏆 CORRIDA', 22, 32); ctx.fillStyle = '#fff'; ctx.font = '11px Arial'; ctx.fillText(`🏁 VOLTA ${Math.min(TOTAL_LAPS, Math.max(1, Math.floor((ranking[0]?.progress || 0) % TOTAL_LAPS) + 1))} / ${TOTAL_LAPS}`, 22, 51); ctx.fillText(`⏱️ ${formatTime(state.elapsed)}`, 22, 68); ctx.fillText(`👥 ${state.players.length} PILOTOS`, 22, 85); ctx.fillStyle = state.weather === 'rain' ? '#8dd8ff' : '#9cb1bf'; ctx.font = '10px Arial'; ctx.fillText(state.weather === 'rain' ? '🌧️ PISTA MOLHADA' : '☀️ PISTA SECA', 22, 103); ctx.fillStyle = '#0a1019dd'; ctx.fillRect(325, 12, 203, 145); ctx.strokeStyle = '#ff477e88'; ctx.strokeRect(325, 12, 203, 145); ctx.fillStyle = '#ffd34f'; ctx.font = 'bold 13px Arial'; ctx.fillText('🏆 RANKING', 337, 32); ranking.slice(0, 5).forEach((player, index) => { ctx.fillStyle = player.color; ctx.font = 'bold 10px Arial'; ctx.fillText(`${index < 3 ? ['🥇','🥈','🥉'][index] : `${index + 1}.`} ${player.name}`, 337, 53 + index * 18); ctx.fillStyle = '#dce7ed'; ctx.font = '9px Arial'; ctx.fillText(player.status === 'eliminated' ? 'ELIMINADO' : player.finished ? 'FINALIZOU' : `VOLTA ${Math.min(TOTAL_LAPS, Math.floor(player.progress) + 1)}`, 430, 53 + index * 18); }); }
function formatTime(seconds) { const minutes = Math.floor(seconds / 60).toString().padStart(2, '0'); const rest = Math.floor(seconds % 60).toString().padStart(2, '0'); return `${minutes}:${rest}`; }
function updateParticles(dt) { for (let i = state.particles.length - 1; i >= 0; i--) { const particle = state.particles[i]; particle.x += particle.vx * dt * 60; particle.y += particle.vy * dt * 60; particle.life -= dt; if (particle.life <= 0) state.particles.splice(i, 1); } }
function drawParticles() { for (const particle of state.particles) { ctx.globalAlpha = Math.max(0, particle.life); ctx.fillStyle = particle.color; ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; }
function tick(now) { const dt = Math.min(.04, (now - state.lastFrame) / 1000 || .016); state.lastFrame = now; updateLiveBots(dt); updateRace(dt, now); engineSound(dt); updateParticles(dt); drawTrack(); for (const player of state.players) drawCar(player, now); drawParticles(); drawWeather(now); drawHud(); requestAnimationFrame(tick); }

document.querySelector('#demoModeButton').addEventListener('click', () => {
  startMode('demo');
  ['TK', 'JOAO', 'MARIA', 'PEDRO', 'LUCAS'].forEach(addPlayer);
});
document.querySelector('#liveModeButton').addEventListener('click', () => {
  startMode('live');
});
document.querySelector('#joinButton').addEventListener('click', () => addPlayer(document.querySelector('#playerName').value));
document.querySelector('#playerName').addEventListener('keydown', event => { if (event.key === 'Enter') addPlayer(event.target.value); });
document.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => addPlayer(button.dataset.add)));
document.querySelectorAll('[data-power]').forEach(button => button.addEventListener('click', () => usePower(button.dataset.power)));
document.querySelector('#startButton').addEventListener('click', startRace);
document.querySelector('#resetButton').addEventListener('click', () => { resetPlayers(); resetToMenu(); });
window.corridaChat = { addPlayer, handleGift, randomGiftPower, startRace, usePower, startMode, state, resetToMenu };
tick(performance.now());

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(registration => registration.update())
    .catch(error => console.warn('PWA indisponível', error));
}
