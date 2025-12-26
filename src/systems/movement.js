import { ECONOMY } from '../core/constants.js';
import { swingSword } from './combat.js';

const SHRINE_INTERACT_MARGIN = 12;

export function applyInputToPlayer(player, input, state, shrine, towers) {
  if (state.ended) return false;
  let swung = false;
  const playerCenter = player.x + player.w / 2;
  const playerHead = player.y;
  const playerFeet = player.y + player.h;
  const horizontalOverlap =
    playerCenter > shrine.x - SHRINE_INTERACT_MARGIN && playerCenter < shrine.x + shrine.w + SHRINE_INTERACT_MARGIN;
  const verticalOverlap = playerHead >= shrine.y - SHRINE_INTERACT_MARGIN && playerFeet <= shrine.y + shrine.h + SHRINE_INTERACT_MARGIN;
  const nearShrine = horizontalOverlap && verticalOverlap;
  player.onLadder = false;
  const accel = input.sprint ? player.sprintSpeed : player.speed;
  player.vx = 0;
  if (input.left) {
    player.vx = -accel;
    player.facing = -1;
  } else if (input.right) {
    player.vx = accel;
    player.facing = 1;
  }

  if (player.onGround && input.jump) {
    player.vy = -player.jumpForce;
    player.onGround = false;
  }

  if (input.attack && player.attackTimer <= 0) {
    player.attackTimer = player.attackCooldown;
    swung = true;
  }

  if (input.interact && nearShrine && !state.shrineUnlocked && state.currency >= ECONOMY.shrineCost) {
    state.currency -= ECONOMY.shrineCost;
    state.shrineUnlocked = true;
    state.learnedShrine = true;
    state.hudText = 'Shrine tech unlocked! Towers shoot faster.';
  }

  return swung;
}

export function updatePlayer(player, world, dt, shrine) {
  player.vy += world.gravity * dt;

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  player.x = Math.max(40, Math.min(world.width - player.w - 40, player.x));
  player.y = Math.max(0, player.y);

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
