import { ECONOMY } from '../core/constants.js';
import { swingSword } from './combat.js';

const LADDER_MARGIN = 8;

export function applyInputToPlayer(player, input, state, shrine, towers) {
  if (state.ended) return false;
  let swung = false;
  const playerCenter = player.x + player.w / 2;
  const playerHead = player.y;
  const playerFeet = player.y + player.h;
  const horizontalOverlap = playerCenter > shrine.x - LADDER_MARGIN && playerCenter < shrine.x + shrine.w + LADDER_MARGIN;
  const verticalOverlap = playerHead >= shrine.y - LADDER_MARGIN && playerFeet <= shrine.y + shrine.h + LADDER_MARGIN;
  player.onLadder = horizontalOverlap && verticalOverlap;
  const accel = input.sprint ? player.sprintSpeed : player.speed;
  player.vx = 0;
  if (input.left) {
    player.vx = -accel;
    player.facing = -1;
  } else if (input.right) {
    player.vx = accel;
    player.facing = 1;
  }

  if (player.onLadder) {
    if (input.up || input.down) {
      player.vy = (input.up ? -1 : 1) * 160;
    } else {
      player.vy = 0;
      player.onGround = false;
    }
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
  }

  return swung;
}

export function updatePlayer(player, world, dt, shrine) {
  const ladderTop = shrine ? Math.max(0, shrine.y - LADDER_MARGIN) : null;
  const ladderBottom = shrine ? shrine.y + shrine.h + LADDER_MARGIN : null;
  if (!player.onLadder) {
    player.vy += world.gravity * dt;
  }

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  if (shrine && ladderTop !== null && ladderBottom !== null) {
    const outOfVerticalRange = player.y < ladderTop || player.y + player.h > ladderBottom;
    if (player.onLadder && outOfVerticalRange) {
      player.onLadder = false;
      player.vy += world.gravity * dt;
    }

    if (player.y < ladderTop) {
      player.y = ladderTop;
      if (player.vy < 0) {
        player.vy = 0;
      }
    }
  }

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
