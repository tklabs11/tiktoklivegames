export class ArenaMap {
  constructor(type) {
    this.creatorMark = 'TK';
    this.type = type;
    this.obstacles = [];
    this.spawns = [];
    this.name = type === 'urban' ? 'Urban Strike' : 'Industrial Base';
    this.load(type);
  }

  load(type) {
    const maps = {
      urban: {
        obstacles: [
          { x: 80, y: 160, w: 130, h: 42 },
          { x: 330, y: 220, w: 130, h: 42 },
          { x: 170, y: 420, w: 170, h: 42 },
          { x: 78, y: 650, w: 120, h: 50 },
          { x: 320, y: 680, w: 140, h: 50 },
          { x: 150, y: 820, w: 150, h: 42 }
        ],
        spawns: [
          { x: 70, y: 90 }, { x: 230, y: 120 }, { x: 430, y: 200 },
          { x: 110, y: 420 }, { x: 420, y: 510 }, { x: 180, y: 760 },
          { x: 480, y: 830 }
        ]
      },
      industrial: {
        obstacles: [
          { x: 110, y: 180, w: 180, h: 48 },
          { x: 310, y: 290, w: 110, h: 100 },
          { x: 60, y: 470, w: 160, h: 52 },
          { x: 280, y: 540, w: 180, h: 58 },
          { x: 90, y: 760, w: 150, h: 54 },
          { x: 320, y: 790, w: 130, h: 52 }
        ],
        spawns: [
          { x: 90, y: 70 }, { x: 460, y: 130 }, { x: 120, y: 330 },
          { x: 410, y: 430 }, { x: 150, y: 660 }, { x: 420, y: 720 },
          { x: 250, y: 860 }
        ]
      }
    };

    const data = maps[type] || maps.urban;
    this.obstacles = data.obstacles;
    this.spawns = data.spawns;
  }

  draw(ctx, width, height) {
    ctx.save();
    const isUrban = this.type === 'urban';
    const floorGradient = ctx.createLinearGradient(0, 0, width, height);
    floorGradient.addColorStop(0, isUrban ? '#263943' : '#303336');
    floorGradient.addColorStop(1, isUrban ? '#111e27' : '#171a1c');
    ctx.fillStyle = floorGradient;
    ctx.fillRect(0, 0, width, height);

    if (isUrban) {
      this.drawUrbanFloor(ctx, width, height);
      this.drawUrbanProps(ctx, width, height);
    } else {
      this.drawIndustrialFloor(ctx, width, height);
      this.drawIndustrialProps(ctx, width, height);
    }

    for (const obs of this.obstacles) {
      this.drawObstacle(ctx, obs, isUrban);
    }

    this.drawSpawnMarkers(ctx);
    this.drawLighting(ctx, width, height);
    ctx.restore();
  }

  drawUrbanFloor(ctx, width, height) {
    ctx.strokeStyle = 'rgba(168, 205, 214, 0.1)';
    ctx.lineWidth = 1;
    for (let y = 40; y < height; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(6, 12, 18, 0.22)';
    for (let x = 20; x < width; x += 110) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255, 213, 92, 0.34)';
    for (let y = 90; y < height - 30; y += 150) {
      ctx.fillRect(width / 2 - 3, y, 6, 42);
    }
  }

  drawIndustrialFloor(ctx, width, height) {
    ctx.strokeStyle = 'rgba(210, 219, 218, 0.12)';
    for (let y = 30; y < height; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255, 190, 68, 0.38)';
    ctx.setLineDash([18, 12]);
    ctx.beginPath();
    ctx.moveTo(28, 0);
    ctx.lineTo(28, height);
    ctx.moveTo(width - 28, 0);
    ctx.lineTo(width - 28, height);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let x = 62; x < width - 40; x += 112) {
      ctx.fillRect(x, 90, 38, height - 180);
    }
  }

  drawUrbanProps(ctx, width, height) {
    this.drawCar(ctx, 28, 300, '#263744', 0.92);
    this.drawCar(ctx, width - 64, 570, '#4a2528', -0.84);
    this.drawCrates(ctx, 28, height - 145, 2);
    this.drawCrates(ctx, width - 94, 350, 1);
    this.drawStreetLight(ctx, width - 28, 92, '#ff9a48');
    this.drawStreetLight(ctx, 28, height - 310, '#3bb7ff');
  }

  drawIndustrialProps(ctx, width, height) {
    this.drawCrates(ctx, 32, 300, 3);
    this.drawCrates(ctx, width - 112, height - 180, 2);
    this.drawStreetLight(ctx, 42, 120, '#ffd166');
    this.drawStreetLight(ctx, width - 42, height - 300, '#ffd166');
  }

  drawCar(ctx, x, y, color, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(-13, -31, 26, 62);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-11, -28, 22, 56, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(128, 207, 222, 0.38)';
    ctx.fillRect(-7, -19, 14, 14);
    ctx.fillRect(-7, 5, 14, 12);
    ctx.fillStyle = '#111820';
    ctx.fillRect(-14, -20, 4, 12);
    ctx.fillRect(10, -20, 4, 12);
    ctx.fillRect(-14, 9, 4, 12);
    ctx.fillRect(10, 9, 4, 12);
    ctx.fillStyle = '#ffb14a';
    ctx.fillRect(-6, -27, 12, 3);
    ctx.restore();
  }

  drawCrates(ctx, x, y, count) {
    for (let index = 0; index < count; index += 1) {
      const offsetX = index * 18;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(x + offsetX + 4, y + 5, 25, 25);
      ctx.fillStyle = index % 2 ? '#80603e' : '#9a7044';
      ctx.fillRect(x + offsetX, y, 25, 25);
      ctx.strokeStyle = 'rgba(42, 25, 13, 0.55)';
      ctx.strokeRect(x + offsetX + 1, y + 1, 23, 23);
      ctx.beginPath();
      ctx.moveTo(x + offsetX + 4, y + 4);
      ctx.lineTo(x + offsetX + 21, y + 21);
      ctx.moveTo(x + offsetX + 21, y + 4);
      ctx.lineTo(x + offsetX + 4, y + 21);
      ctx.stroke();
    }
  }

  drawStreetLight(ctx, x, y, color) {
    ctx.strokeStyle = 'rgba(12, 18, 23, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + 30);
    ctx.lineTo(x, y - 12);
    ctx.lineTo(x - 8, y - 18);
    ctx.stroke();
    const glow = ctx.createRadialGradient(x - 8, y - 18, 1, x - 8, y - 18, 54);
    glow.addColorStop(0, `${color}55`);
    glow.addColorStop(1, `${color}00`);
    ctx.fillStyle = glow;
    ctx.fillRect(x - 60, y - 70, 120, 120);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x - 8, y - 18, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawObstacle(ctx, obstacle, isUrban) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.fillRect(obstacle.x + 7, obstacle.y + 8, obstacle.w, obstacle.h);

    const gradient = ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x, obstacle.y + obstacle.h);
    gradient.addColorStop(0, isUrban ? '#647b86' : '#687074');
    gradient.addColorStop(0.45, isUrban ? '#3f555f' : '#3f464a');
    gradient.addColorStop(1, isUrban ? '#293a43' : '#252b2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);

    ctx.fillStyle = isUrban ? 'rgba(211, 232, 232, 0.2)' : 'rgba(255, 198, 78, 0.55)';
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, 4);
    ctx.strokeStyle = 'rgba(226, 239, 236, 0.24)';
    ctx.strokeRect(obstacle.x + 0.5, obstacle.y + 0.5, obstacle.w - 1, obstacle.h - 1);

    ctx.strokeStyle = isUrban ? 'rgba(15, 24, 29, 0.35)' : 'rgba(8, 10, 11, 0.4)';
    for (let x = obstacle.x + 18; x < obstacle.x + obstacle.w; x += 34) {
      ctx.beginPath();
      ctx.moveTo(x, obstacle.y + 7);
      ctx.lineTo(x, obstacle.y + obstacle.h - 7);
      ctx.stroke();
    }
  }

  drawSpawnMarkers(ctx) {
    ctx.strokeStyle = 'rgba(121, 226, 220, 0.26)';
    ctx.lineWidth = 1;
    for (const spawn of this.spawns) {
      ctx.beginPath();
      ctx.arc(spawn.x, spawn.y, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(spawn.x - 7, spawn.y);
      ctx.lineTo(spawn.x + 7, spawn.y);
      ctx.moveTo(spawn.x, spawn.y - 7);
      ctx.lineTo(spawn.x, spawn.y + 7);
      ctx.stroke();
    }
  }

  drawLighting(ctx, width, height) {
    const vignette = ctx.createRadialGradient(width / 2, height * 0.42, 90, width / 2, height * 0.5, height * 0.72);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.72, 'rgba(0, 0, 0, 0.08)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.48)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    const blueLight = ctx.createRadialGradient(30, height * 0.76, 2, 30, height * 0.76, 105);
    blueLight.addColorStop(0, 'rgba(28, 139, 255, 0.2)');
    blueLight.addColorStop(1, 'rgba(28, 139, 255, 0)');
    ctx.fillStyle = blueLight;
    ctx.fillRect(0, height * 0.62, 170, height * 0.32);

    const warmLight = ctx.createRadialGradient(width - 22, 130, 2, width - 22, 130, 120);
    warmLight.addColorStop(0, 'rgba(255, 100, 35, 0.2)');
    warmLight.addColorStop(1, 'rgba(255, 100, 35, 0)');
    ctx.fillStyle = warmLight;
    ctx.fillRect(width - 170, 0, 170, 260);
  }

  getSpawnPoint(index = 0) {
    const point = this.spawns[index % this.spawns.length];
    return { x: point.x, y: point.y };
  }
}
