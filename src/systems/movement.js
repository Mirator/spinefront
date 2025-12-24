import { ECONOMY } from '../core/constants.js';
import { swingSword } from './combat.js';

export function applyInputToPlayer(player, input, state, shrine, towers) {
  if (state.ended) return false;
  let swung = false;
  player.onLadder = player.x + player.w / 2 > shrine.x - 8 && player.x + player.w / 2 < shrine.x + shrine.w + 8;
  const accel = input.sprint ? player.sprintSpeed : player.speed;
  player.vx = 0;
  if (input.left) {
    player.vx = -accel;
    player.facing = -1;
  } else if (input.right) {
    player.vx = accel;
    player.facing = 1;
  }

  if (player.onLadder && (input.up || input.down)) {
    player.vy = (input.up ? -1 : 1) * 160;
  } else if (player.onGround && input.jump) {
    player.vy = -player.jumpForce;
    player.onGround = false;
  }

  if (input.attack && player.attackTimer <= 0) {
    player.attackTimer = player.attackCooldown;
    swung = true;
  }

  if (input.interact && player.onLadder && !state.shrineUnlocked && state.currency >= ECONOMY.shrineCost) {
    state.currency -= ECONOMY.shrineCost;
    state.shrineUnlocked = true;
    state.hudText = 'Shrine tech unlocked! Towers shoot faster.';
    towers.forEach((t) => (t.fireRate = Math.max(0.7, t.fireRate * 0.75)));
  }

  return swung;
}

export function updatePlayer(player, world, dt) {
  if (!player.onLadder) {
    player.vy += world.gravity * dt;
  }

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  player.x = Math.max(40, Math.min(world.width - player.w - 40, player.x));

  if (player.y + player.h >= world.ground) {
    player.y = world.ground - player.h;
    player.vy = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  player.swingTimer = Math.max(0, player.swingTimer - dt);
  player.attackTimer = Math.max(0, player.attackTimer - dt);
}

export function updateEnemies(enemies, dt) {
  enemies.forEach((e) => {
    if (e.hp <= 0) return;
    e.x += e.vx * dt;
  });
}
