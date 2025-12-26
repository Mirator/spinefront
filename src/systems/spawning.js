import { deriveWaveDefinition } from '../state/waves.js';
import { addEdgeWarning } from './effects.js';

function ensureWaveDefinition(state, world, rng) {
  const nightNumber = state.currentNightNumber || state.nightsSurvived + 1;
  if (!state.waveDefinition || state.waveDefinition.night !== nightNumber) {
    const wave = deriveWaveDefinition(nightNumber, state.island, state.modifiers);
    const existingTimer = state.waveTimer;
    const withSapper =
      nightNumber >= 2 && !wave.enemyTypes.includes('sapper') ? { ...wave, enemyTypes: [...wave.enemyTypes, 'sapper'] } : wave;
    state.waveDefinition = withSapper;
    state.waveInterval = withSapper.interval;
    if (existingTimer > 0) {
      state.waveTimer = Math.min(existingTimer, withSapper.interval);
    }
    state.waveDescriptors = generateWaveDescriptors(withSapper, world, rng, nightNumber);
    if (existingTimer === undefined || existingTimer === null) {
      state.waveTimer = state.waveInterval;
    }
  }
  return state.waveDefinition;
}

function pickEnemyType(waveDefinition, rng) {
  const enemyTypes = waveDefinition.enemyTypes?.length ? waveDefinition.enemyTypes : ['enemy'];
  if (enemyTypes.length === 1) return enemyTypes[0];
  if (rng?.int) {
    return enemyTypes[rng.int(0, enemyTypes.length - 1)];
  }
  const index = Math.floor(Math.random() * enemyTypes.length);
  return enemyTypes[index];
}

function pickSpawnSide(waveDefinition, rng) {
  const leftProbability = waveDefinition.sideBias?.left ?? 0.5;
  const chooseLeft = rng?.boolean ? rng.boolean(leftProbability) : Math.random() < leftProbability;
  return chooseLeft ? 'left' : 'right';
}

function generateWaveDescriptors(waveDefinition, world, rng, nightNumber = 1) {
  const baseInterval = waveDefinition.interval;
  const expectedSpawns = Math.max(6, Math.round(world.dayLength / Math.max(0.6, baseInterval)));
  const descriptors = [];
  for (let i = 0; i < expectedSpawns; i += 1) {
    const burst = i > 0 && i % 4 === 0;
    const side = burst && descriptors[i - 1] ? descriptors[i - 1].side : pickSpawnSide(waveDefinition, rng);
    const enemyType = pickEnemyType(waveDefinition, rng);
    descriptors.push({
      side,
      enemyType,
      burst,
      interval: burst ? baseInterval * 0.6 : baseInterval,
      night: nightNumber,
    });
  }
  return descriptors;
}

export function spawnEnemy(state, side, createEnemy) {
  const enemy = createEnemy(side);
  state.enemies.push(enemy);
  return enemy;
}

export function updateEnemySpawns(state, world, createEnemy, dt, rng, effects) {
  if (!state.isNight) return [];
  const waveDefinition = ensureWaveDefinition(state, world, rng);
  if (!state.waveDescriptors?.length) {
    state.waveDescriptors = generateWaveDescriptors(waveDefinition, world, rng, waveDefinition.night);
    state.waveInterval = state.waveDescriptors[0]?.interval ?? waveDefinition.interval;
  }
  state.waveTimer -= dt;
  const spawned = [];
  if (state.waveTimer <= 0) {
    if (!state.waveDescriptors.length) {
      state.waveDescriptors = generateWaveDescriptors(waveDefinition, world, rng, waveDefinition.night);
    }
    const descriptor = state.waveDescriptors.shift();
    const side = descriptor?.side ?? pickSpawnSide(waveDefinition, rng);
    const enemyType = descriptor?.enemyType ?? pickEnemyType(waveDefinition, rng);
    if (descriptor?.burst && effects) {
      addEdgeWarning(effects, side);
    }
    const enemy = createEnemy(side, enemyType);
    state.enemies.push(enemy);
    state.waveInterval = descriptor?.interval ?? waveDefinition.interval;
    const nextInterval = state.waveDescriptors[0]?.interval ?? state.waveInterval;
    state.waveTimer = nextInterval;
    spawned.push(enemy);
  }
  return spawned;
}
