import { PUZZLES } from '../core/constants.js';
import {
  getDifficultyTier,
  getSkyClimbPlatforms,
  isMiniGameFinished,
  isMiniGameSuccess,
  pickPuzzleType,
  startMiniGame,
  updateMiniGame,
} from './puzzle-minigames.js';

const PUZZLE_RELICS = {
  steady_aura: {
    id: 'steady_aura',
    label: 'Steady Aura',
    description: 'Aura recovery is 15% faster.',
    apply(modifiers) {
      modifiers.auraRecovery = (modifiers.auraRecovery || 0) + 0.15;
    },
  },
  lightfoot: {
    id: 'lightfoot',
    label: 'Lightfoot',
    description: 'Gold burden slows sprinting 12% less.',
    apply(modifiers) {
      modifiers.sprintResist = (modifiers.sprintResist || 0) + 0.12;
    },
  },
  damping_field: {
    id: 'damping_field',
    label: 'Damping Field',
    description: 'Aura instability from hoarding gold is 18% lower.',
    apply(modifiers) {
      modifiers.instabilityResist = (modifiers.instabilityResist || 0) + 0.18;
    },
  },
};

function puzzleAnchorPositions(world, count) {
  const step = 1 / (count + 1);
  return new Array(count).fill(0).map((_, idx) => world.width * step * (idx + 1));
}

/**
 * Create puzzles for the island. Each puzzle gets a random type.
 */
export function createJumpPuzzles(world, rng) {
  const count = Math.max(1, PUZZLES.count || 2);
  const anchors = puzzleAnchorPositions(world, count);
  return anchors.map((x, idx) => ({
    id: `puzzle-${idx + 1}`,
    x,
    y: world.ground - 48,
    type: pickPuzzleType(rng),
    state: 'available',
    reward: null,
  }));
}

export function resetJumpPuzzles(state, world, rng) {
  state.jumpPuzzles = createJumpPuzzles(world, rng);
  state.activePuzzle = null;
  state.activeMiniGame = null;
  state.pendingPuzzleReward = null;
  state.puzzleRewardSelection = 'gold';
  state.puzzleSelectionHeld = false;
}

export function findNearbyPuzzle(player, puzzles = []) {
  if (!player) return null;
  const center = player.x + player.w / 2;
  const feet = player.y + player.h;
  return (
    puzzles.find(
      (puzzle) =>
        puzzle.state === 'available' &&
        Math.abs(center - puzzle.x) < PUZZLES.interactionRange &&
        feet > puzzle.y - PUZZLES.interactionRange &&
        feet < puzzle.y + PUZZLES.interactionRange * 2,
    ) || null
  );
}

/**
 * Start a puzzle mini-game.
 */
export function startJumpPuzzle(state, puzzleId, world) {
  if (!state || !puzzleId) return false;
  if (state.activePuzzle || state.isNight) return false;

  const puzzle = state.jumpPuzzles?.find((p) => p.id === puzzleId);
  if (!puzzle || puzzle.state !== 'available') return false;

  const difficulty = getDifficultyTier(state.nightsSurvived || 0);
  const miniGame = startMiniGame(puzzle.type, difficulty, puzzle.x, world.ground);

  state.activePuzzle = {
    id: puzzleId,
    type: puzzle.type,
    difficulty,
  };
  state.activeMiniGame = miniGame;
  puzzle.state = 'attempting';

  const typeLabels = {
    sky_climb: 'Sky Climb — reach the top!',
    dodge_pulse: 'Dodge Pulse — jump over the rings!',
    energy_channel: 'Energy Channel — hold position in the zone!',
  };
  state.hudText = typeLabels[puzzle.type] || 'Puzzle started!';
  return true;
}

function completePuzzle(state, puzzle) {
  if (!state || !puzzle) return;
  puzzle.state = 'completed';
  state.activePuzzle = null;
  state.activeMiniGame = null;
  state.pendingPuzzleReward = puzzle.id;
  state.hudText = 'Puzzle cleared! Choose a reward (up/down, then interact).';
}

function failPuzzle(state, puzzle) {
  if (!state || !puzzle) return;
  puzzle.state = 'available'; // Can retry
  state.activePuzzle = null;
  state.activeMiniGame = null;
  state.hudText = 'Puzzle failed — try again!';
}

/**
 * Update the active puzzle mini-game.
 */
export function updateJumpPuzzles(state, player, input, world, dt) {
  if (!state?.activePuzzle || !state?.activeMiniGame) return;

  const puzzle = state.jumpPuzzles?.find((p) => p.id === state.activePuzzle.id);
  if (!puzzle) {
    state.activePuzzle = null;
    state.activeMiniGame = null;
    return;
  }

  // Update the mini-game
  updateMiniGame(state.activeMiniGame, player, input, dt);

  // Check completion
  if (isMiniGameFinished(state.activeMiniGame)) {
    if (isMiniGameSuccess(state.activeMiniGame)) {
      completePuzzle(state, puzzle);
    } else {
      failPuzzle(state, puzzle);
    }
  }

  // Night cancels puzzles
  if (state.isNight) {
    failPuzzle(state, puzzle);
  }
}

function pickRelic(state, rng) {
  const pool = PUZZLES.relicOptions || Object.keys(PUZZLE_RELICS);
  const index =
    rng?.int?.(0, pool.length - 1) ?? Math.min(pool.length - 1, (state.relics?.length || 0) % pool.length);
  return PUZZLE_RELICS[pool[index]] || PUZZLE_RELICS.steady_aura;
}

function applyRelic(state, relic) {
  if (!relic) return;
  state.relics = state.relics || [];
  state.relics.push({ id: relic.id, label: relic.label, description: relic.description });
  state.relicModifiers = state.relicModifiers || {};
  relic.apply(state.relicModifiers);
}

/**
 * Apply the selected reward after puzzle completion.
 */
export function applyPuzzleReward(state, puzzleId, rng) {
  if (!state || !puzzleId) return null;
  if (state.pendingPuzzleReward !== puzzleId) return null;

  const puzzle = state.jumpPuzzles?.find((p) => p.id === puzzleId);
  if (!puzzle) return null;

  const difficulty = getDifficultyTier(state.nightsSurvived || 0);
  const diffConfig = PUZZLES.difficulty[difficulty];
  const reward = state.puzzleRewardSelection || 'gold';

  puzzle.reward = reward;
  puzzle.state = 'resolved';
  state.pendingPuzzleReward = null;

  if (reward === 'gold') {
    state.currency += diffConfig.goldReward;
    state.hudText = `Took ${diffConfig.goldReward} gold!`;
  } else if (reward === 'legacy') {
    state.legacy = (state.legacy || 0) + diffConfig.legacyReward;
    state.hudText = `Legacy +${diffConfig.legacyReward}!`;
  } else if (reward === 'relic') {
    if (Math.random() < diffConfig.relicChance) {
      const relic = pickRelic(state, rng);
      applyRelic(state, relic);
      state.hudText = `${relic.label}: ${relic.description}`;
    } else {
      // Fallback to gold if relic not granted
      state.currency += diffConfig.goldReward;
      state.hudText = `No relic this time — got ${diffConfig.goldReward} gold instead.`;
    }
  }

  return reward;
}

/**
 * Get platforms for the active Sky Climb puzzle (for physics).
 */
export function getActivePuzzlePlatforms(state) {
  if (!state?.activeMiniGame) return [];
  return getSkyClimbPlatforms(state.activeMiniGame);
}
