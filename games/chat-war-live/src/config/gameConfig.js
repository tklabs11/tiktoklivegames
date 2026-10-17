export const gameConfig = {
  creatorMark: 'TK',
  arenaWidth: 540,
  arenaHeight: 960,
  maxPlayers: 32,
  startingHealth: 100,
  bulletDamage: 15,
  fireRate: 0.38,
  moveSpeed: 1.4,
  attackRange: 240,
  respawnEnabled: true,
  rejoinCooldown: 6000,
  roundDuration: 180,
  maxBullets: 220,
  effectsEnabled: true,
  soundEnabled: true,
  botSpawnInterval: 20000,
  playerRadius: 18,
  projectileSpeed: 6,
  aiTargetingRadius: 260,
  aiPreferredDistance: 120
};

export const mapConfig = {
  urban: {
    name: 'Urban Strike',
    accent: '#58d0ff',
    obstacles: [
      { x: 90, y: 160, w: 120, h: 42 },
      { x: 330, y: 230, w: 120, h: 42 },
      { x: 180, y: 420, w: 170, h: 42 },
      { x: 76, y: 650, w: 120, h: 48 },
      { x: 300, y: 680, w: 140, h: 48 },
      { x: 130, y: 820, w: 135, h: 42 }
    ],
    spawns: [
      { x: 75, y: 90 },
      { x: 220, y: 130 },
      { x: 430, y: 220 },
      { x: 120, y: 430 },
      { x: 420, y: 520 },
      { x: 220, y: 760 },
      { x: 480, y: 830 }
    ]
  },
  industrial: {
    name: 'Industrial Base',
    accent: '#ffd166',
    obstacles: [
      { x: 120, y: 180, w: 180, h: 48 },
      { x: 320, y: 280, w: 120, h: 100 },
      { x: 60, y: 470, w: 160, h: 52 },
      { x: 280, y: 540, w: 180, h: 56 },
      { x: 90, y: 760, w: 150, h: 54 },
      { x: 310, y: 790, w: 130, h: 52 }
    ],
    spawns: [
      { x: 90, y: 70 },
      { x: 450, y: 130 },
      { x: 120, y: 340 },
      { x: 420, y: 420 },
      { x: 140, y: 640 },
      { x: 400, y: 720 },
      { x: 250, y: 860 }
    ]
  }
};

export const giftConfig = {
  rose: { type: 'heal', value: 18 },
  dragon: { type: 'shield', duration: 5000 },
  crown: { type: 'damageBoost', duration: 6000 },
  star: { type: 'arenaEvent', label: '⚡ DOUBLE DAMAGE' }
};
