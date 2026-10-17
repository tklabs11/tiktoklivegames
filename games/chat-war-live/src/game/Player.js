export class Player {
  constructor({ id, username, x, y, color, skinId = 'standard', skinName = 'AZURE', isBot = false }) {
    this.id = id;
    this.username = username;
    this.x = x;
    this.y = y;
    this.radius = 18;
    this.color = color;
    this.skinId = skinId;
    this.skinName = skinName;
    this.isBot = isBot;
    this.alive = true;
    this.health = 100;
    this.maxHealth = 100;
    this.damage = 15;
    this.fireRate = 0.42;
    this.weaponLevel = 1;
    this.weaponName = 'RIFLE PADRAO';
    this.className = 'STANDARD';
    this.isGiftPlayer = false;
    this.lastShotAt = 0;
    this.angle = 0;
    this.velocityX = 0;
    this.velocityY = 0;
    this.speed = 1.25;
    this.targetId = null;
    this.aiType = this.randomAiType();
    this.score = 0;
    this.kills = 0;
    this.deaths = 0;
    this.fireCooldown = 0;
    this.shieldUntil = 0;
    this.damageBoostUntil = 0;
    this.respawnAt = 0;
    this.rejoinAvailableAt = 0;
  }

  randomAiType() {
    const types = ['aggressive', 'balanced', 'cautious'];
    return types[Math.floor(Math.random() * types.length)];
  }

  setTarget(targetId) {
    this.targetId = targetId;
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.alive = false;
      this.health = 0;
    }
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  applyShield(duration) {
    this.shieldUntil = performance.now() + duration;
  }

  applyDamageBoost(duration) {
    this.damageBoostUntil = performance.now() + duration;
  }

  getEffectiveDamage() {
    return this.damageBoostUntil > performance.now() ? this.damage * 1.6 : this.damage;
  }

  upgradeFromGift() {
    this.isGiftPlayer = true;
    this.skinId = 'elite';
    this.skinName = 'VIP GOLD';
    this.color = '#ffd166';
    this.className = 'ELITE';
    this.weaponLevel = Math.min(3, this.weaponLevel + 1);
    this.weaponName = this.weaponLevel >= 3 ? 'CANHAO VIP' : 'RIFLE DE OURO';
    this.damage = Math.min(42, this.damage + 12);
    this.fireRate = Math.max(0.24, this.fireRate - 0.06);
    this.maxHealth = 120;
    this.health = this.maxHealth;
  }

  update(dt) {
    if (!this.alive) return;
    this.x += this.velocityX * dt * 60;
    this.y += this.velocityY * dt * 60;
  }
}
