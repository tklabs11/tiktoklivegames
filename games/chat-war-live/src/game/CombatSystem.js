export class CombatSystem {
  constructor() {
    this.messages = [];
  }

  static distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  findNearestEnemy(player, players) {
    let nearest = null;
    let nearestDistance = Infinity;

    for (const other of players) {
      if (other.id === player.id || !other.alive) continue;
      const dist = CombatSystem.distance(player, other);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearest = other;
      }
    }

    return nearest;
  }
}
