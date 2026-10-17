export class PlayerAI {
  constructor(game) {
    this.creatorMark = 'TK';
    this.game = game;
    this.patrolTargets = new Map();
  }

  update(player, dt) {
    if (!player.alive) return;

    const target = this.game.getEnemyTarget(player);
    if (!target) {
      const patrolTarget = this.getPatrolTarget(player);
      const dx = patrolTarget.x - player.x;
      const dy = patrolTarget.y - player.y;
      const distance = Math.hypot(dx, dy) || 1;

      if (distance < 22) {
        this.patrolTargets.delete(player.id);
        player.velocityX = 0;
        player.velocityY = 0;
      } else {
        player.angle = Math.atan2(dy, dx);
        player.velocityX = (dx / distance) * player.speed;
        player.velocityY = (dy / distance) * player.speed;
      }
      return;
    }

    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const distance = Math.hypot(dx, dy) || 1;
    const moveX = dx / distance;
    const moveY = dy / distance;
    const preferredDistance = player.aiType === 'aggressive' ? 90 : player.aiType === 'cautious' ? 150 : 120;

    player.angle = Math.atan2(dy, dx);

    let desiredX = 0;
    let desiredY = 0;

    if (distance > preferredDistance + 20) {
      desiredX = moveX * player.speed * 1.2;
      desiredY = moveY * player.speed * 1.2;
    } else if (distance < preferredDistance - 20) {
      desiredX = -moveX * player.speed * 1.1;
      desiredY = -moveY * player.speed * 1.1;
    }

    if (player.aiType === 'cautious' && distance < 140) {
      desiredX = -moveX * player.speed * 1.35;
      desiredY = -moveY * player.speed * 1.35;
    }

    const avoidX = this.game.getAvoidanceX ? this.game.getAvoidanceX(player) : 0;
    const avoidY = this.game.getAvoidanceY ? this.game.getAvoidanceY(player) : 0;

    player.velocityX = (desiredX + avoidX) * 0.9;
    player.velocityY = (desiredY + avoidY) * 0.9;

    if (distance < 240 && this.game.canShoot(player, target)) {
      player.fireCooldown -= dt;
      if (player.fireCooldown <= 0) {
        this.game.shootAt(player, target);
        player.fireCooldown = player.aiType === 'aggressive' ? 0.3 : 0.42;
      }
    }
  }

  getPatrolTarget(player) {
    const current = this.patrolTargets.get(player.id);
    if (current) return current;

    const target = this.game.getPatrolPoint(player);
    this.patrolTargets.set(player.id, target);
    return target;
  }
}
