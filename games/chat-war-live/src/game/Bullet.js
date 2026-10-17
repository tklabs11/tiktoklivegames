export class Bullet {
  constructor({ x, y, angle, ownerId, damage, speed = 6, color = '#fff7d2' }) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.ownerId = ownerId;
    this.damage = damage;
    this.color = color;
    this.speed = speed;
    this.radius = 4;
    this.life = 160;
    this.active = true;
  }

  update(dt) {
    if (!this.active) return;
    this.x += Math.cos(this.angle) * this.speed * dt * 60;
    this.y += Math.sin(this.angle) * this.speed * dt * 60;
    this.life -= dt * 60;
    if (this.life <= 0) this.active = false;
  }
}
