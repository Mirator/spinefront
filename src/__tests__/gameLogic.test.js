import { describe, expect, it } from 'vitest';
import { ECONOMY } from '../core/constants.js';
import { createGameStore, resetGameStore } from '../state/store.js';
import { createEnemy } from '../state/entities.js';
import { updateDayNight, checkEndConditions } from '../systems/cycle.js';
import { resolveEnemyAttacks, swingSword, updateProjectiles, updateTowers } from '../systems/combat.js';
import { applyInputToPlayer } from '../systems/movement.js';
import { updateEnemySpawns } from '../systems/spawning.js';

describe('game logic systems', () => {
  it('awards currency per cycle and ends after enough nights', () => {
    const store = createGameStore();
    const { state, world } = store;

    state.dayTimer = world.dayLength;
    updateDayNight(state, world, 0);
    expect(state.isNight).toBe(true);
    expect(state.currency).toBe(ECONOMY.dayIncome + ECONOMY.nightIncome);

    state.dayTimer = world.dayLength;
    updateDayNight(state, world, 0);
    expect(state.isNight).toBe(false);
    expect(state.currency).toBe(ECONOMY.dayIncome * 2 + ECONOMY.nightIncome);

    state.nightsSurvived = world.nightsToWin;
    const result = checkEndConditions(state, world);
    expect(result).toBe('win');

    state.crownLost = true;
    const loss = checkEndConditions(state, world);
    expect(loss).toBe('loss');
  });

  it('spawns enemies on a night timer', () => {
    const store = createGameStore();
    store.state.isNight = true;
    store.state.waveTimer = 0;
    const spawned = updateEnemySpawns(store.state, store.world, (side) => createEnemy(side, store.world), 0.1);
    expect(spawned.length).toBe(1);
    expect(store.state.waveTimer).toBeGreaterThan(0);
  });

  it('applies enemy damage to structures', () => {
    const store = createGameStore();
    const enemy = createEnemy('left', store.world);
    enemy.x = store.walls[0].x;
    enemy.y = store.walls[0].y;
    enemy.attackTimer = 0;
    store.state.enemies.push(enemy);

    const events = resolveEnemyAttacks(store.state.enemies, [store.walls[0]], 1);
    expect(store.walls[0].hp).toBeLessThan(store.walls[0].maxHp);
    expect(events.some((e) => e.type === 'structureHit')).toBe(true);
  });

  it('fires towers at cadence and speeds up with shrine upgrade', () => {
    const store = createGameStore();
    const enemy = createEnemy('left', store.world);
    enemy.x = store.towers[0].x;
    enemy.y = store.towers[0].y;
    enemy.hp = 10;
    store.state.enemies.push(enemy);

    const baseFireRate = store.towers[0].fireRate;
    store.towers[0].fireTimer = 0;
    const projectiles = [];
    updateTowers([store.towers[0]], store.state.enemies, projectiles, false, 0.05);
    expect(projectiles.length).toBe(1);
    const cadence = store.towers[0].fireTimer;
    expect(cadence).toBeCloseTo(baseFireRate, 5);

    const fasterTower = { ...store.towers[0], fireTimer: 0 };
    projectiles.length = 0;
    updateTowers([fasterTower], store.state.enemies, projectiles, true, 0.05);
    expect(projectiles.length).toBe(1);
    const expectedCadence = Math.max(0.7, baseFireRate * 0.75);
    expect(fasterTower.fireTimer).toBeCloseTo(expectedCadence, 5);
    expect(fasterTower.fireRate).toBe(baseFireRate);
  });

  it('unlocks shrine without mutating tower cadence inputs', () => {
    const store = createGameStore();
    const [tower] = store.towers;
    const baseFireRate = tower.fireRate;

    store.player.x = store.shrine.x;
    const input = {
      left: false,
      right: false,
      up: false,
      down: false,
      sprint: false,
      jump: false,
      attack: false,
      interact: true,
    };

    applyInputToPlayer(store.player, input, store.state, store.shrine, store.towers);

    expect(store.state.shrineUnlocked).toBe(true);
    expect(tower.fireRate).toBe(baseFireRate);
  });

  it('detects sword hits on enemies', () => {
    const store = createGameStore();
    const enemy = createEnemy('left', store.world);
    enemy.x = store.player.x + 10;
    enemy.y = store.player.y;
    store.state.enemies.push(enemy);

    const hits = swingSword(store.player, store.state.enemies, 25);
    expect(hits.length).toBe(1);
    expect(enemy.hp).toBe(25);
  });

  it('handles projectile and enemy collisions', () => {
    const store = createGameStore();
    const enemy = createEnemy('left', store.world);
    enemy.x = 200;
    enemy.y = store.world.ground - enemy.h;
    store.state.enemies.push(enemy);

    const projectile = {
      x: enemy.x + enemy.w / 2,
      y: enemy.y + enemy.h / 2,
      vx: 0,
      vy: 0,
      radius: 4,
      damage: 10,
      life: 1,
      color: '#fff',
    };

    const result = updateProjectiles([projectile], store.state.enemies, store.world, null, 0.1);
    expect(result.remaining.length).toBe(0);
    expect(enemy.hp).toBe(40);
  });

  it('resets game state cleanly', () => {
    const store = createGameStore();
    store.state.currency = 0;
    store.state.shrineUnlocked = true;
    store.state.enemies.push(createEnemy('left', store.world));
    store.player.crown = false;

    resetGameStore(store);
    expect(store.state.currency).toBe(ECONOMY.dayIncome);
    expect(store.state.shrineUnlocked).toBe(false);
    expect(store.state.enemies).toHaveLength(0);
    expect(store.player.crown).toBe(true);
  });
});
