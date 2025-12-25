import { COLORS } from '../core/constants.js';
import { clamp } from './math.js';
import { addHitFlash, triggerDangerFlash, triggerScreenShake } from './effects.js';

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function applyDamage(target, amount) {
  target.hp = Math.max(0, target.hp - amount);
  return target.hp;
}

export function swingSword(player, enemies, damage = 25, callbacks = {}) {
  player.swingTimer = player.swingDuration;
  player.swingFacing = player.facing;
  const arc = {
    x: player.x + (player.swingFacing > 0 ? player.w : -24),
    y: player.y,
    w: 32,
    h: player.h,
  };
  const hits = [];
  enemies.forEach((enemy) => {
    if (enemy.hp > 0 && overlaps(arc, enemy)) {
      applyDamage(enemy, damage);
      const knockback = player.swingFacing * 220;
      enemy.vx = knockback;
      enemy.stunTimer = Math.max(enemy.stunTimer || 0, 0.22);
      enemy.x += knockback * 0.05;
      hits.push(enemy);
      if (callbacks.onHit) {
        callbacks.onHit(enemy);
      }
    }
  });
  return hits;
}

export function resolveEnemyAttacks(enemies, targets, dt) {
  const events = [];
  enemies.forEach((e) => {
    if (e.hp <= 0) return;
    if (e.stunTimer > 0) {
      e.stunTimer = Math.max(0, e.stunTimer - dt);
      e.x += e.vx * dt;
      e.vx *= 0.9;
      return;
    }
    if (!e.target || e.target.hp <= 0) {
      e.target = targets.find((t) => t.hp > 0 && Math.abs(t.x - e.x) < 400);
    }
    if (e.target && e.target.hp > 0) {
      const dir = Math.sign(e.target.x - e.x);
      e.vx = dir * e.speed;
      e.x += e.vx * dt;
      if (overlaps(e, e.target)) {
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          applyDamage(e.target, e.attack);
          e.attackTimer = 1 / e.attackRate;
          events.push({ type: 'structureHit', target: e.target });
        }
      }
    } else {
      e.x += e.vx * dt;
    }
  });
  return events;
}

export function spawnTowerProjectile(tower, target) {
  const muzzleX = tower.x + tower.w / 2;
  const muzzleY = tower.y + 16;
  const targetX = target.x + target.w / 2;
  const targetY = target.y + target.h / 2;
  const dx = targetX - muzzleX;
  const dy = targetY - muzzleY;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return null;
  const speed = 520;
  const vx = (dx / distance) * speed;
  const vy = (dy / distance) * speed;
  return {
    x: muzzleX,
    y: muzzleY,
    vx,
    vy,
    radius: 4,
    damage: 18,
    life: Math.min(1.2, distance / speed + 0.35),
    color: COLORS.tower,
  };
}

export function updateTowers(towers, enemies, projectiles, shrineUnlocked, dt) {
  const firings = [];
  towers.forEach((tower) => {
    if (tower.hp <= 0) return;
    tower.fireTimer -= dt;
    if (tower.fireTimer <= 0) {
      const range = 360;
      const target = enemies.find((e) => e.hp > 0 && Math.abs(e.x - tower.x) < range);
      if (target) {
        const dx = target.x + target.w / 2 - (tower.x + tower.w / 2);
        const dy = target.y + target.h / 2 - (tower.y + 16);
        const distance = Math.hypot(dx, dy);
        if (distance <= range) {
          const projectile = spawnTowerProjectile(tower, target);
          if (projectile) {
            projectiles.push(projectile);
            firings.push({ tower, target });
          }
          const cadence = shrineUnlocked ? Math.max(0.7, tower.fireRate * 0.75) : tower.fireRate;
          tower.fireTimer = cadence;
        }
      }
    }
  });
  return firings;
}

export function updateProjectiles(projectiles, enemies, world, effects, dt) {
  const remaining = [];
  const hits = [];
  projectiles.forEach((p) => {
    const next = { ...p };
    next.x += next.vx * dt;
    next.y += next.vy * dt;
    next.life -= dt;

    let hitEnemy = null;
    for (const enemy of enemies) {
      if (enemy.hp <= 0) continue;
      const withinX = next.x > enemy.x - next.radius && next.x < enemy.x + enemy.w + next.radius;
      const withinY = next.y > enemy.y - next.radius && next.y < enemy.y + enemy.h + next.radius;
      if (withinX && withinY) {
        hitEnemy = enemy;
        break;
      }
    }

    if (hitEnemy) {
      applyDamage(hitEnemy, next.damage);
      hits.push({ projectile: next, enemy: hitEnemy });
      if (effects) {
        addHitFlash(effects, hitEnemy.x + hitEnemy.w / 2, hitEnemy.y + hitEnemy.h / 2, world.width, world.height);
        triggerScreenShake(effects, 2.2, 0.12);
      }
    } else if (
      next.life > 0 &&
      next.x > -80 &&
      next.x < world.width + 80 &&
      next.y > -80 &&
      next.y < world.height + 80
    ) {
      remaining.push(next);
    }
  });

  return { remaining, hits };
}

export function checkCrownLoss(enemies, player, state, effects) {
  let playerHit = false;
  enemies.forEach((e) => {
    if (e.hp <= 0) return;
    if (overlaps(e, player)) {
      playerHit = true;
      if (player.crown) {
        player.crown = false;
        if (state) {
          state.crownLost = true;
        }
      }
    }
  });

  if (playerHit && effects) {
    triggerDangerFlash(effects);
  }
  return playerHit;
}

export function cleanupEnemies(enemies, world) {
  return enemies.filter((e) => e.hp > 0 && e.x > -120 && e.x < world.width + 120);
}
