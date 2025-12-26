import { deriveWaveDefinition } from '../state/waves.js';

function ensureWaveDefinition(state) {
  const nightNumber = state.currentNightNumber || state.nightsSurvived + 1;
  if (!state.waveDefinition || state.waveDefinition.night !== nightNumber) {
    const wave = deriveWaveDefinition(nightNumber, state.island, state.modifiers);
    const existingTimer = state.waveTimer;
    state.waveDefinition = wave;
    state.waveInterval = wave.interval;
    if (existingTimer > 0) {
      state.waveTimer = Math.min(existingTimer, wave.interval);
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

export function spawnEnemy(state, side, createEnemy) {
  const enemy = createEnemy(side);
  state.enemies.push(enemy);
  return enemy;
}

export function updateEnemySpawns(state, world, createEnemy, dt, rng) {
  if (!state.isNight) return [];
  const waveDefinition = ensureWaveDefinition(state);
  state.waveTimer -= dt;
  const spawned = [];
  if (state.waveTimer <= 0) {
    const side = pickSpawnSide(waveDefinition, rng);
    const enemyType = pickEnemyType(waveDefinition, rng);
    const enemy = createEnemy(side, enemyType);
    state.enemies.push(enemy);
    state.waveInterval = waveDefinition.interval;
    state.waveTimer = state.waveInterval;
    spawned.push(enemy);
  }
  return spawned;
}
