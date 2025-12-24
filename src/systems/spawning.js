export function spawnEnemy(state, side, createEnemy) {
  const enemy = createEnemy(side);
  state.enemies.push(enemy);
  return enemy;
}

export function updateEnemySpawns(state, world, createEnemy, dt) {
  if (!state.isNight) return [];
  state.waveTimer -= dt;
  const spawned = [];
  if (state.waveTimer <= 0) {
    const side = Math.random() > 0.5 ? 'left' : 'right';
    const enemy = createEnemy(side);
    state.enemies.push(enemy);
    state.waveInterval = Math.max(1.5, 3.5 - state.nightsSurvived);
    state.waveTimer = state.waveInterval;
    spawned.push(enemy);
  }
  return spawned;
}
