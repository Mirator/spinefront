import { COLORS, SHRINE_TECH } from '../core/constants.js';
import { addHitFlash, triggerDangerFlash, triggerScreenShake } from './effects.js';

export const BASE_PROJECTILE_DAMAGE = 18;

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function applyDamage(target, amount) {
  target.hp = Math.max(0, target.hp - amount);
  return target.hp;
}

function normalizeAngle(angle) {
  const twoPi = Math.PI * 2;
  return ((angle % twoPi) + twoPi) % twoPi;
}

function angleWithinSweep(angle, start, end, dir) {
  const twoPi = Math.PI * 2;
  const normalizedAngle = normalizeAngle(angle);
  let startAngle = normalizeAngle(start);
  let endAngle = normalizeAngle(end);
  if (dir > 0) {
    if (endAngle < startAngle) endAngle += twoPi;
    const adjusted = normalizedAngle < startAngle ? normalizedAngle + twoPi : normalizedAngle;
    return adjusted >= startAngle && adjusted <= endAngle;
  }
  if (endAngle > startAngle) endAngle -= twoPi;
  const adjusted = normalizedAngle > startAngle ? normalizedAngle - twoPi : normalizedAngle;
  return adjusted <= startAngle && adjusted >= endAngle;
}

const CARDINAL_ANGLES = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
const SWING_PADDING = 8;

function getSwingGeometry(player) {
  const dir = player.swingFacing || player.facing || 1;
  const cx = player.x + player.w / 2 + dir * (player.w * 0.35);
  const cy = player.y + player.h * 0.55;
  const radius = player.h * 0.95;
  // Use the full rendered sweep range so the collision arc mirrors the complete sword path.
  const swingSweep = Math.PI;
  const startAngle = dir > 0 ? -Math.PI * 0.65 : Math.PI * 1.65;
  const endAngle = startAngle + swingSweep * dir;

  return { cx, cy, radius, dir, startAngle, endAngle };
}

function computeSwingBounds(geometry) {
  const { cx, cy, radius, dir, startAngle, endAngle } = geometry;
  const candidateAngles = [startAngle, endAngle, ...CARDINAL_ANGLES].filter((angle) =>
    angleWithinSweep(angle, startAngle, endAngle, dir),
  );
  const xs = [];
  const ys = [];
  candidateAngles.forEach((angle) => {
    xs.push(cx + Math.cos(angle) * radius);
    ys.push(cy + Math.sin(angle) * radius);
  });
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: minX - SWING_PADDING,
    y: minY - SWING_PADDING,
    w: maxX - minX + SWING_PADDING * 2,
    h: maxY - minY + SWING_PADDING * 2,
  };
}

function getSwordArc(player) {
  const geometry = getSwingGeometry(player);
  const arc = computeSwingBounds(geometry);
  return { arc, hits: [] };
}

export function updateSwordCollision(player, enemies, callbacks = {}, damage = 25) {
  if (player.swingTimer <= 0) return [];
  if (!player.swingHitIds) {
    player.swingHitIds = new Set();
  }
  const { arc, hits } = getSwordArc(player);
  enemies.forEach((enemy) => {
    if (enemy.hp > 0 && overlaps(arc, enemy)) {
      if (player.swingHitIds.has(enemy)) return;
      player.swingHitIds.add(enemy);
      applyDamage(enemy, damage);
      hits.push(enemy);
      if (callbacks.onHit) {
        callbacks.onHit(enemy);
      }
    }
  });
  return hits;
}

export function swingSword(player, enemies, damage = 25, callbacks = {}) {
  player.swingTimer = player.swingDuration;
  player.swingFacing = player.facing;
  player.swingHitIds = new Set();
  return updateSwordCollision(player, enemies, callbacks, damage);
}

function updateCarrier(enemy, world, dt) {
  const carrier = enemy.carrier;
  if (!carrier || !carrier.active || carrier.hasDropped) return false;
  const dir = Math.sign(carrier.targetX - enemy.x) || (carrier.targetX >= enemy.x ? 1 : -1);
  enemy.vx = dir * enemy.speed * carrier.speedMultiplier;
  enemy.x += enemy.vx * dt;
  const hoverHeight = carrier.height ?? world.ground - enemy.h - 80;
  enemy.y = Math.min(hoverHeight, world.ground - enemy.h - 20);
  if (Math.abs(enemy.x - carrier.targetX) < 6) {
    carrier.hasDropped = true;
    carrier.dropTimer = carrier.dropDuration;
    carrier.active = false;
    enemy.vx = 0;
  }
  return true;
}

function dropEnemy(enemy, world, dt, rng) {
  const carrier = enemy.carrier;
  if (!carrier || carrier.dropTimer <= 0 || carrier.hasDropped === false) return false;
  carrier.dropTimer = Math.max(0, carrier.dropTimer - dt);
  const t = 1 - carrier.dropTimer / (carrier.dropDuration || 0.0001);
  const startY = carrier.height ?? world.ground - enemy.h - 80;
  const targetY = world.ground - enemy.h;
  enemy.y = startY + (targetY - startY) * Math.min(1, t);
  if (carrier.dropTimer <= 0) {
    enemy.y = targetY;
    if (enemy.vx === 0) {
      const direction = rng?.boolean?.() ?? Math.random() > 0.5;
      enemy.vx = enemy.speed * (direction ? 1 : -1);
    }
  }
  return true;
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
  const damageScale = Math.max(0.6, tower.damageMultiplier || 1);
  return {
    x: muzzleX,
    y: muzzleY,
    vx,
    vy,
    radius: 4,
    damage: Math.round(BASE_PROJECTILE_DAMAGE * damageScale),
    life: Math.min(1.2, distance / speed + 0.35),
    color: COLORS.tower,
    faction: 'player',
  };
}

function towerCadence(tower, shrineTech) {
  const cadenceLevel = shrineTech?.branches?.cadence || 0;
  const cadenceDelta = SHRINE_TECH.branches?.cadence?.fireRateBonus || 0.12;
  const cadenceBonus = 1 - cadenceLevel * cadenceDelta;
  return Math.max(0.6, tower.fireRate * cadenceBonus);
}

function towerDamageScale(tower, shrineTech) {
  const base = tower.baseDamageMultiplier || tower.damageMultiplier || 1;
  const damageLevel = shrineTech?.branches?.power || 0;
  const damageDelta = SHRINE_TECH.branches?.power?.damageBonus || 0.18;
  const damageBonus = 1 + damageLevel * damageDelta;
  return Math.max(0.6, base * damageBonus);
}

export function updateTowers(towers, enemies, projectiles, shrineTech, dt) {
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
          tower.damageMultiplier = towerDamageScale(tower, shrineTech);
          const projectile = spawnTowerProjectile(tower, target);
          if (projectile) {
            projectiles.push(projectile);
            firings.push({ tower, target });
          }
          const cadence = towerCadence(tower, shrineTech);
          tower.fireTimer = cadence;
        }
      }
    }
  });
  return firings;
}

function pickRangedTarget(enemy, targets = []) {
  const living = targets.filter((t) => t.hp > 0);
  if (!living.length) return null;
  return living.reduce((closest, target) => {
    if (!closest) return target;
    const dist = Math.abs(target.x + target.w / 2 - (enemy.x + enemy.w / 2));
    const bestDist = Math.abs(closest.x + closest.w / 2 - (enemy.x + enemy.w / 2));
    return dist < bestDist ? target : closest;
  }, null);
}

function spawnSapperProjectile(enemy, target) {
  const muzzleX = enemy.x + enemy.w / 2;
  const muzzleY = enemy.y + enemy.h * 0.4;
  const tx = target.x + target.w / 2;
  const ty = target.y + target.h / 2;
  const dx = tx - muzzleX;
  const dy = ty - muzzleY;
  const dist = Math.hypot(dx, dy);
  if (dist <= 0) return null;
  const speed = enemy.ranged?.projectileSpeed || 280;
  const vx = (dx / dist) * speed;
  const vy = (dy / dist) * speed;
  return {
    x: muzzleX,
    y: muzzleY,
    vx,
    vy,
    radius: 4,
    damage: enemy.ranged?.projectileDamage || enemy.attack,
    life: Math.min(1.4, dist / speed + 0.3),
    color: COLORS.sapper,
    faction: 'enemy',
  };
}

export function updateProjectiles(projectiles, enemies, structures = [], player, world, effects, dt, rng) {
  const remaining = [];
  const hits = [];
  projectiles.forEach((p) => {
    const next = { ...p };
    next.x += next.vx * dt;
    next.y += next.vy * dt;
    next.life -= dt;

    let hitTarget = null;
    const targetPool = next.faction === 'player' ? enemies : structures;
    for (const target of targetPool) {
      if (target.hp <= 0) continue;
      const withinX = next.x > target.x - next.radius && next.x < target.x + target.w + next.radius;
      const withinY = next.y > target.y - next.radius && next.y < target.y + target.h + next.radius;
      if (withinX && withinY) {
        hitTarget = target;
        break;
      }
    }

    if (hitTarget) {
      applyDamage(hitTarget, next.damage);
      hits.push({ projectile: next, target: hitTarget });
      if (effects && next.faction === 'player') {
        addHitFlash(
          effects,
          hitTarget.x + hitTarget.w / 2,
          hitTarget.y + hitTarget.h / 2,
          world.width,
          world.height,
          rng,
        );
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
      if (player.crown && !state.droppedCrown?.active) {
        player.crown = false;
        state.droppedCrown = {
          active: true,
          x: player.x + player.w / 2,
          y: player.y + player.h,
          timer: 10,
        };
      }
    }
  });

  if (playerHit && effects) {
    triggerDangerFlash(effects);
  }
  return playerHit;
}

export function updateCrownDrop(state, dt) {
  if (!state.droppedCrown?.active) return;
  state.droppedCrown.timer = Math.max(0, state.droppedCrown.timer - dt);
  if (state.droppedCrown.timer <= 0 && !state.crownLost) {
    state.crownLost = true;
  }
}

export function cleanupEnemies(enemies, world) {
  return enemies.filter((e) => e.hp > 0 && e.x >= -120 && e.x <= world.width + 120);
}

export function resolveEnemyAttacks(enemies, targets, world, dt, rng, enemyProjectiles = []) {
  const events = [];
  enemies.forEach((e) => {
    if (e.hp <= 0) return;
    if (updateCarrier(e, world, dt)) return;
    if (dropEnemy(e, world, dt, rng)) return;
    if (e.stunTimer > 0) {
      e.stunTimer = Math.max(0, e.stunTimer - dt);
      e.x += e.vx * dt;
      e.vx *= 0.9;
      return;
    }

    const livingTargets = targets.filter((t) => t.hp > 0);
    if (e.variant === 'sapper' && e.ranged) {
      if (!e.target || e.target.hp <= 0) {
        e.target = pickRangedTarget(e, livingTargets);
      }
      if (e.target && e.target.hp > 0) {
        const center = e.x + e.w / 2;
        const targetCenter = e.target.x + e.target.w / 2;
        const dir = Math.sign(targetCenter - center) || 1;
        const distance = Math.abs(targetCenter - center);
        if (distance > e.ranged.preferredRange) {
          e.vx = dir * e.speed;
          e.x += e.vx * dt;
        } else if (distance < e.w * 1.2) {
          e.vx = -dir * (e.speed * 0.5);
          e.x += e.vx * dt;
        } else {
          e.vx = 0;
        }
        e.attackTimer -= dt;
        if (e.attackTimer <= 0 && distance <= e.ranged.range) {
          const projectile = spawnSapperProjectile(e, e.target);
          if (projectile) {
            enemyProjectiles.push(projectile);
          }
          e.attackTimer = 1 / e.attackRate;
        }
      } else {
        e.x += e.vx * dt;
      }
      return;
    }

    if (!e.target || e.target.hp <= 0) {
      e.target = livingTargets.find((t) => Math.abs(t.x - e.x) < 400);
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
