export function spawnEnemy(state, side, createEnemy) {
  const enemy = createEnemy(side);
  state.enemies.push(enemy);
  return enemy;
}

export function calculateWaveInterval(nightNumber) {
  return Math.max(1.5, 3.5 - nightNumber);
}

export function updateEnemySpawns(state, world, createEnemy, dt) {
  if (!state.isNight) return [];
  state.waveTimer -= dt;
  const spawned = [];
  if (state.waveTimer <= 0) {
    const side = Math.random() > 0.5 ? 'left' : 'right';
    const enemy = createEnemy(side);
    state.enemies.push(enemy);
    const nightNumber = state.currentNightNumber || state.nightsSurvived + 1;
    const interval = state.waveInterval > 0 ? state.waveInterval : calculateWaveInterval(nightNumber);
    state.waveInterval = interval;
    state.waveTimer = interval;
    spawned.push(enemy);
  }
  return spawned;
}
