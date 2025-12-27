import { AURA } from '../core/constants.js';
import { clamp } from './math.js';

const DEFAULT_WALL_WIDTH = 40;

function territoryBounds(baseWorld, world) {
  const widthRatio = world.width / baseWorld.width;
  const left = (baseWorld.walls?.[0] ?? world.width * 0.35) * widthRatio;
  const right = (baseWorld.walls?.[1] ?? world.width * 0.65) * widthRatio;
  const min = Math.min(left, right) - AURA.territoryPadding;
  const max = Math.max(left + DEFAULT_WALL_WIDTH, right + DEFAULT_WALL_WIDTH) + AURA.territoryPadding;
  return { min, max };
}

export function isInOwnedTerritory(player, baseWorld, world) {
  if (!player || !baseWorld || !world) return false;
  const { min, max } = territoryBounds(baseWorld, world);
  const center = player.x + player.w / 2;
  return center >= min && center <= max;
}

export function resetPlayerAura(player) {
  player.aura = AURA.max;
  player.maxAura = AURA.max;
  player.auraHitCooldown = 0;
  player.auraRecoverDelay = 0;
  player.critical = false;
}

export function applyPlayerAuraHit(player, state) {
  if (!player || !state) return false;
  if (player.auraHitCooldown > 0) return false;

  player.auraHitCooldown = AURA.hitCooldown;
  player.auraRecoverDelay = Math.max(player.auraRecoverDelay || 0, AURA.recoverDelay);

  const goldDrop = Math.min(state.currency ?? 0, AURA.goldDropPerHit);
  if (goldDrop > 0) {
    state.currency -= goldDrop;
  }

  const nextAura = clamp((player.aura ?? player.maxAura ?? AURA.max) - AURA.hitLoss, 0, player.maxAura || AURA.max);
  player.aura = nextAura;

  if (player.aura <= 0) {
    state.playerFallen = true;
    state.lossReason = 'aura';
    state.hudText = 'Aura extinguished — you fall into the clouds.';
    player.critical = true;
  }

  return true;
}

export function updateAuraRecovery(player, state, baseWorld, world, dt) {
  if (!player || !state) return;
  player.auraHitCooldown = Math.max(0, (player.auraHitCooldown || 0) - dt);
  player.auraRecoverDelay = Math.max(0, (player.auraRecoverDelay || 0) - dt);

  const canRecover =
    state.currency >= AURA.recoveryGoldThreshold &&
    isInOwnedTerritory(player, baseWorld, world) &&
    player.auraRecoverDelay <= 0;
  if (!canRecover) return;

  const restored = (player.aura || 0) + AURA.recoverRate * dt;
  player.aura = clamp(restored, 0, player.maxAura || AURA.max);
  if (player.critical && player.aura > AURA.criticalRecoveryBuffer) {
    player.critical = false;
    state.hudText = 'Aura stabilized — keep it fueled with gold.';
  }
}
