import { PUZZLES } from '../core/constants.js';
import { clamp } from './math.js';

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

export function createJumpPuzzles(world) {
  const count = Math.max(1, PUZZLES.count || 2);
  const anchors = puzzleAnchorPositions(world, count);
  return anchors.map((x, idx) => ({
    id: `puzzle-${idx + 1}`,
    x,
    y: world.ground - 48,
    state: 'available',
    reward: null,
  }));
}

export function resetJumpPuzzles(state, world) {
  state.jumpPuzzles = createJumpPuzzles(world);
  state.activePuzzle = null;
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
        Math.abs(center - puzzle.x) < PUZZLES.interactionRange &&
        feet > puzzle.y - PUZZLES.interactionRange &&
        feet < puzzle.y + PUZZLES.interactionRange * 2,
    ) || null
  );
}

export function startJumpPuzzle(state, puzzleId) {
  if (!state || !puzzleId) return false;
  if (state.activePuzzle || state.isNight) return false;
  const puzzle = state.jumpPuzzles?.find((p) => p.id === puzzleId);
  if (!puzzle || puzzle.state !== 'available') return false;
  state.activePuzzle = {
    id: puzzleId,
    timer: PUZZLES.timeLimit,
    jumpsDone: 0,
    requiredJumps: PUZZLES.requiredJumps,
  };
  puzzle.state = 'attempting';
  state.hudText = 'Scaling puzzle — keep jumping to reach the top.';
  return true;
}

function completePuzzle(state, puzzle, dayLength) {
  if (!state || !puzzle) return;
  puzzle.state = 'completed';
  state.activePuzzle = null;
  state.pendingPuzzleReward = puzzle.id;
  state.dayTimer = Math.min(state.dayTimer, dayLength);
  state.hudText = 'Puzzle cleared! Choose a reward (up/down, then interact).';
}

function failPuzzle(state, puzzle, world) {
  if (!state || !puzzle) return;
  puzzle.state = 'failed';
  state.activePuzzle = null;
  state.dayTimer = clamp(state.dayTimer + PUZZLES.failTimePenalty, 0, world.dayLength * 1.1);
  state.hudText = 'Puzzle failed — time lost chasing the route.';
}

export function updateJumpPuzzles(state, player, world, dt) {
  if (!state?.activePuzzle) return;
  const active = state.activePuzzle;
  const puzzle = state.jumpPuzzles?.find((p) => p.id === active.id);
  if (!puzzle) {
    state.activePuzzle = null;
    return;
  }

  // Puzzles consume precious daylight even while time is slowed.
  const timeMultiplier = Math.max(1, PUZZLES.timeCostMultiplier);
  state.dayTimer += dt * (timeMultiplier - 1);
  active.timer = Math.max(0, (active.timer ?? PUZZLES.timeLimit) - dt);

  if (state.jumpIntent) {
    active.jumpsDone = (active.jumpsDone || 0) + 1;
    state.hudText = `Puzzle climb ${active.jumpsDone}/${active.requiredJumps}`;
  }

  if (active.jumpsDone >= (active.requiredJumps || PUZZLES.requiredJumps)) {
    completePuzzle(state, puzzle, world.dayLength);
    return;
  }

  if (active.timer <= 0 || state.isNight) {
    failPuzzle(state, puzzle, world);
  }
}

function pickRelic(state, rng) {
  const pool = PUZZLES.relicOptions || Object.keys(PUZZLE_RELICS);
  const index =
    rng?.int?.(0, pool.length - 1) ??
    Math.min(pool.length - 1, (state.relics?.length || 0) % pool.length);
  return PUZZLE_RELICS[pool[index]] || PUZZLE_RELICS.steady_aura;
}

function applyRelic(state, relic) {
  if (!relic) return;
  state.relics = state.relics || [];
  state.relics.push({ id: relic.id, label: relic.label, description: relic.description });
  state.relicModifiers = state.relicModifiers || {};
  relic.apply(state.relicModifiers);
}

export function applyPuzzleReward(state, puzzleId, rng) {
  if (!state || !puzzleId) return null;
  if (state.pendingPuzzleReward !== puzzleId) return null;
  const puzzle = state.jumpPuzzles?.find((p) => p.id === puzzleId);
  if (!puzzle) return null;

  const reward = state.puzzleRewardSelection || 'gold';
  puzzle.reward = reward;
  puzzle.state = 'resolved';
  state.pendingPuzzleReward = null;

  if (reward === 'gold') {
    state.currency += PUZZLES.goldReward;
    state.hudText = `Took ${PUZZLES.goldReward} gold — spend it or it will slow you down.`;
  } else if (reward === 'legacy') {
    state.legacy = (state.legacy || 0) + PUZZLES.legacyReward;
    state.hudText = 'Legacy gained — knowledge carries between runs.';
  } else if (reward === 'relic') {
    const relic = pickRelic(state, rng);
    applyRelic(state, relic);
    state.hudText = `${relic.label} relic recovered: ${relic.description}`;
  }

  return reward;
}
