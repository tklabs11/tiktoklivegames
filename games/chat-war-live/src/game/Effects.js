export class Effects {
  constructor() {
    this.list = [];
  }

  spawnBurst(x, y, color = '#ffd166', count = 10) {
    for (let i = 0; i < count; i++) {
      this.list.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 30 + Math.random() * 25,
        size: 2 + Math.random() * 4,
        color
      });
    }
  }

  spawnFlash(x, y, color = '#fff2b2') {
    this.list.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 12,
      size: 16,
      color,
      flash: true
    });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.life -= dt * 60;
      if (p.life <= 0) this.list.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this.list) {
      const alpha = Math.max(0, p.life / 45);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
