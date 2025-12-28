import { ECONOMY, GOLD_BURDEN, INTERACTION_CONFIG, SHRINE_TECH } from '../core/constants.js';
import { createBarricade } from '../state/entities.js';
import { overlaps } from './combat.js';
import { clamp } from './math.js';
import { applyPuzzleReward, findNearbyPuzzle, startJumpPuzzle } from './puzzles.js';

function nextTechCost(tier) {
  const capped = Math.min(tier, SHRINE_TECH.costs.length - 1);
  const baseCost = SHRINE_TECH.costs[capped] ?? ECONOMY.shrineCost;
  if (tier === 0) {
    return Math.max(baseCost, ECONOMY.shrineCost);
  }
  return baseCost;
}

function toggleShrineSelection(state, input, nearShrine) {
  if (!nearShrine) {
    state.shrineTech.selectionHeld = false;
    return;
  }
  const wantsToggle = input.up || input.down;
  if (wantsToggle && !state.shrineTech.selectionHeld) {
    state.shrineTech.selection = state.shrineTech.selection === 'cadence' ? 'power' : 'cadence';
    state.shrineTech.selectionHeld = true;
    state.hudText = `Shrine focus: ${SHRINE_TECH.branches[state.shrineTech.selection].label}`;
  } else if (!wantsToggle) {
    state.shrineTech.selectionHeld = false;
  }
}

function repairStructure(structure, state) {
  if (structure.hp >= structure.maxHp) {
    return false;
  }
  if (state.currency < ECONOMY.repairCost) {
    state.hudText = 'Need more gold to repair.';
    return false;
  }
  state.currency -= ECONOMY.repairCost;
  structure.hp = Math.min(structure.maxHp, structure.hp + INTERACTION_CONFIG.repairAmount);
  state.hudText = `Repaired ${structure.type} for ${ECONOMY.repairCost} gold.`;
  return true;
}

function placeBarricade(player, world, state, barricades, structures) {
  if (state.currency < ECONOMY.barricadeCost) {
    state.hudText = 'Need more gold for a barricade.';
    return false;
  }
  const candidate = createBarricade(player.x + player.w / 2, world);
  const collides = [...barricades, ...structures].some((s) => overlaps(candidate, s));
  if (collides) {
    state.hudText = 'No room for a barricade here.';
    return false;
  }
  barricades.push(candidate);
  state.currency -= ECONOMY.barricadeCost;
  state.hudText = `Placed barricade (-${ECONOMY.barricadeCost} gold).`;
  return true;
}

function tryShrinePurchase(state) {
  const branch = state.shrineTech.selection || 'cadence';
  const tier = state.shrineTech.branches[branch] || 0;
  const nextTier = tier + 1;
  const cost = nextTechCost(tier);
  if (nextTier > SHRINE_TECH.costs.length) {
    state.hudText = 'Shrine tier maxed.';
    return false;
  }
  if (state.currency < cost) {
    state.hudText = `Need ${cost} gold for shrine tier ${nextTier}.`;
    return false;
  }
  state.currency -= cost;
  state.shrineUnlocked = true;
  state.learnedShrine = true;
  state.shrineTech.unlocked = true;
  state.shrineTech.branches[branch] = nextTier;
  state.hudText = `${SHRINE_TECH.branches[branch].label} tier ${nextTier} unlocked.`;
  return true;
}

function togglePuzzleRewardSelection(state, input, nearPuzzle) {
  if (!nearPuzzle || !state.pendingPuzzleReward) {
    state.puzzleSelectionHeld = false;
    return;
  }
  const wantsToggle = input.up || input.down;
  if (wantsToggle && !state.puzzleSelectionHeld) {
    const options = ['gold', 'relic', 'legacy'];
    const current = options.indexOf(state.puzzleRewardSelection);
    const next = (current + 1) % options.length;
    state.puzzleRewardSelection = options[next];
    state.puzzleSelectionHeld = true;
    state.hudText = `Puzzle reward focus: ${state.puzzleRewardSelection}`;
  } else if (!wantsToggle) {
    state.puzzleSelectionHeld = false;
  }
}

function dropGold(state, amount = GOLD_BURDEN.manualDropAmount) {
  const available = Math.max(0, state.currency || 0);
  const chunk = Math.min(available, Math.max(1, amount));
  if (chunk <= 0) {
    state.hudText = 'No gold to drop.';
    return false;
  }
  state.currency -= chunk;
  state.hudText = `Dropped ${chunk} gold to steady your aura.`;
  return true;
}

function computeBurdenMultipliers(state) {
  const gold = Math.max(0, state.currency || 0);
  const burden = Math.max(0, gold - GOLD_BURDEN.freeLoad);
  const span = Math.max(1, GOLD_BURDEN.slowSoftCap - GOLD_BURDEN.freeLoad);
  const ratio = clamp(burden / span, 0, 1);
  const resist = 1 - (state.relicModifiers?.sprintResist || 0);
  const walkPenalty = ratio * GOLD_BURDEN.maxWalkSlow * resist;
  const sprintPenalty = ratio * GOLD_BURDEN.maxSprintSlow * resist;
  return {
    walkMultiplier: Math.max(0.4, 1 - walkPenalty),
    sprintMultiplier: Math.max(0.35, 1 - sprintPenalty),
    ratio,
  };
}

export function applyInputToPlayer(player, input, state, shrine, towers, walls, barricades, world) {
  if (state.ended) return false;
  state.jumpIntent = false;
  let swung = false;
  if (!input.interact) {
    state.interactionLatch = false;
  }
  const playerCenter = player.x + player.w / 2;
  const playerHead = player.y;
  const playerFeet = player.y + player.h;
  const horizontalOverlap =
    playerCenter > shrine.x - INTERACTION_CONFIG.shrineMargin &&
    playerCenter < shrine.x + shrine.w + INTERACTION_CONFIG.shrineMargin;
  const verticalOverlap =
    playerHead >= shrine.y - INTERACTION_CONFIG.shrineMargin &&
    playerFeet <= shrine.y + shrine.h + INTERACTION_CONFIG.shrineMargin;
  const nearShrine = horizontalOverlap && verticalOverlap;
  const nearPuzzle = findNearbyPuzzle(player, state.jumpPuzzles);
  player.onLadder = false;
  const burden = computeBurdenMultipliers(state);
  state.burdenRatio = burden.ratio;
  const accel = input.sprint ? player.sprintSpeed * burden.sprintMultiplier : player.speed * burden.walkMultiplier;
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
    state.jumpIntent = true;
  }

  if (input.attack && player.attackTimer <= 0) {
    player.attackTimer = player.attackCooldown;
    swung = true;
  }

  toggleShrineSelection(state, input, nearShrine);
  togglePuzzleRewardSelection(state, input, nearPuzzle);

  const tryInteract = input.interact && !state.interactionLatch;
  if (tryInteract && nearShrine) {
    state.interactionLatch = true;
    tryShrinePurchase(state);
  } else if (tryInteract && nearPuzzle) {
    state.interactionLatch = true;
    if (state.pendingPuzzleReward === nearPuzzle.id) {
      applyPuzzleReward(state, nearPuzzle.id);
    } else {
      startJumpPuzzle(state, nearPuzzle.id);
    }
  } else if (tryInteract && !state.isNight) {
    const structures = [...walls, ...towers];
    const nearbyStructure = structures.find(
      (s) => Math.abs(playerCenter - (s.x + s.w / 2)) < INTERACTION_CONFIG.repairRange,
    );
    if (nearbyStructure && nearbyStructure.hp < nearbyStructure.maxHp) {
      state.interactionLatch = true;
      repairStructure(nearbyStructure, state);
    } else if (input.down) {
      state.interactionLatch = true;
      const placed = placeBarricade(player, world, state, barricades, [...structures, ...barricades]);
      if (!placed) {
        dropGold(state);
      }
    }
  } else if (tryInteract && input.down) {
    state.interactionLatch = true;
    dropGold(state);
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
