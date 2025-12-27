import { describe, expect, it } from 'vitest';
import { AURA, ECONOMY } from '../core/constants.js';
import { createGameStore, resetGameStore, updateWorldDimensions } from '../state/store.js';
import { createEnemy } from '../state/entities.js';
import { updateDayNight, checkEndConditions } from '../systems/cycle.js';
import { resolveEnemyAttacks, swingSword, updateProjectiles, updateTowers } from '../systems/combat.js';
import { applyInputToPlayer, updatePlayer } from '../systems/movement.js';
import { updateEnemySpawns } from '../systems/spawning.js';
import { deriveWaveDefinition } from '../state/waves.js';
import { createIslandContext } from '../state/islands.js';
import { applyPlayerAuraHit, updateAuraRecovery } from '../systems/aura.js';

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

    state.crownLost = true;
    const loss = checkEndConditions(state, world);
    expect(loss).toBe('loss');
  });

  it('wins only after surviving a full night', () => {
    const store = createGameStore();
    const { state, world } = store;
    world.nightsToWin = 1;

    state.dayTimer = world.dayLength;
    updateDayNight(state, world, 0);
    expect(state.isNight).toBe(true);
    expect(state.nightsSurvived).toBe(0);
    expect(checkEndConditions(state, world)).toBeNull();

    state.dayTimer = world.dayLength;
    updateDayNight(state, world, 0);
    expect(state.isNight).toBe(false);
    expect(state.nightsSurvived).toBe(1);
    expect(checkEndConditions(state, world)).toBe('ascend');
    expect(state.pendingAscend).toBe(true);
  });

  it('spawns enemies on a night timer', () => {
    const store = createGameStore();
    store.state.isNight = true;
    store.state.waveTimer = 0;
    const spawned = updateEnemySpawns(
      store.state,
      store.world,
      (side, enemyType) => createEnemy(side, store.world, [], store.state.modifiers, enemyType),
      0.1,
      store.rng,
      store.state.effects,
    );
    expect(spawned.length).toBe(1);
    expect(store.state.waveTimer).toBeGreaterThan(0);
  });

  it('applies enemy damage to structures', () => {
    const store = createGameStore();
    const enemy = createEnemy('left', store.world, [], store.state.modifiers);
    enemy.carrier = null;
    enemy.x = store.walls[0].x;
    enemy.y = store.walls[0].y;
    enemy.attackTimer = 0;
    store.state.enemies.push(enemy);

    const events = resolveEnemyAttacks(store.state.enemies, [store.walls[0]], store.world, 1, store.rng, []);
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
    updateTowers([store.towers[0]], store.state.enemies, projectiles, store.state.shrineTech, 0.05);
    expect(projectiles.length).toBe(1);
    const cadence = store.towers[0].fireTimer;
    expect(cadence).toBeCloseTo(baseFireRate, 5);

    const fasterTower = { ...store.towers[0], fireTimer: 0 };
    const empoweredShrine = { ...store.state.shrineTech, branches: { cadence: 1, power: 0 } };
    projectiles.length = 0;
    updateTowers([fasterTower], store.state.enemies, projectiles, empoweredShrine, 0.05);
    expect(projectiles.length).toBe(1);
    const expectedCadence = Math.max(0.6, baseFireRate * (1 - 0.12));
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

    applyInputToPlayer(store.player, input, store.state, store.shrine, store.towers, store.walls, store.barricades, store.world);

    expect(store.state.shrineUnlocked).toBe(true);
    expect(tower.fireRate).toBe(baseFireRate);
  });

  it('keeps shrine interaction grounded without ladder movement', () => {
    const store = createGameStore();
    const dt = 1 / 60;
    store.player.x = store.shrine.x;
    store.player.y = store.shrine.y - 30;
    store.player.onGround = false;
    const idleInput = {
      left: false,
      right: false,
      up: true,
      down: false,
      sprint: false,
      jump: false,
      attack: false,
      interact: false,
    };

    const initialVy = store.player.vy;
    applyInputToPlayer(
      store.player,
      idleInput,
      store.state,
      store.shrine,
      store.towers,
      store.walls,
      store.barricades,
      store.world,
    );
    expect(store.player.onLadder).toBe(false);
    updatePlayer(store.player, store.world, dt, store.shrine);
    expect(store.player.vy).toBeGreaterThan(initialVy);
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

  it('hits enemies near the visible sword arc edges', () => {
    [1, -1].forEach((facing) => {
      const store = createGameStore();
      store.player.facing = facing;
      const radius = store.player.h * 0.95;
      const cx = store.player.x + store.player.w / 2 + facing * (store.player.w * 0.35);
      const cy = store.player.y + store.player.h * 0.55;
      const startAngle = facing > 0 ? -Math.PI * 0.65 : Math.PI * 1.65;
      const endAngle = startAngle + Math.PI * facing;
      [startAngle, endAngle].forEach((angle) => {
        const enemy = createEnemy('left', store.world);
        enemy.x = cx + Math.cos(angle) * radius - enemy.w / 2;
        enemy.y = cy + Math.sin(angle) * radius - enemy.h / 2;
        store.state.enemies.push(enemy);
      });

      const hits = swingSword(store.player, store.state.enemies, 25);
      expect(hits).toHaveLength(2);
      hits.forEach((hitEnemy) => expect(hitEnemy.hp).toBeLessThan(50));
    });
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
      faction: 'player',
    };

    const result = updateProjectiles(
      [projectile],
      store.state.enemies,
      [...store.walls, ...store.towers],
      store.player,
      store.world,
      null,
      0.1,
      store.rng,
    );
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

  it('keeps wave intervals consistent within a single night', () => {
    const store = createGameStore();
    const { state, world } = store;
    state.isNight = true;
    state.currentNightNumber = 2;
    state.waveDefinition = deriveWaveDefinition(state.currentNightNumber, state.island, state.modifiers);
    state.waveInterval = state.waveDefinition.interval;
    state.waveTimer = 0;

    const spawnEnemyFactory = (side, enemyType) => createEnemy(side, world, [], state.modifiers, enemyType);

    const firstWave = updateEnemySpawns(state, world, spawnEnemyFactory, 0, store.rng, state.effects);
    expect(firstWave).toHaveLength(1);
    expect(state.waveInterval).toBeGreaterThan(0);

    const secondWave = updateEnemySpawns(state, world, spawnEnemyFactory, state.waveInterval, store.rng, state.effects);
    expect(secondWave).toHaveLength(1);
    expect(state.waveInterval).toBeGreaterThan(0);

    const thirdWave = updateEnemySpawns(state, world, spawnEnemyFactory, state.waveInterval, store.rng, state.effects);
    expect(thirdWave).toHaveLength(1);
    expect(state.waveTimer).toBeCloseTo(state.waveInterval, 2);
  });

  it('shrinks aura and drops gold on hits, then recovers inside territory', () => {
    const store = createGameStore();
    const { player, state, world, baseWorld } = store;
    state.currency = 10;
    const startingAura = player.aura;

    const applied = applyPlayerAuraHit(player, state);
    expect(applied).toBe(true);
    expect(player.aura).toBeLessThan(startingAura);
    expect(state.currency).toBe(10 - AURA.goldDropPerHit);

    player.auraRecoverDelay = 0;
    const auraAfterHit = player.aura;
    updateAuraRecovery(player, state, baseWorld, world, 1);
    expect(player.aura).toBeGreaterThan(auraAfterHit);
  });

  it('loses the run immediately when aura hits zero', () => {
    const store = createGameStore();
    const { player, state, world, baseWorld } = store;
    player.aura = 10;

    applyPlayerAuraHit(player, state);
    expect(player.aura).toBe(0);
    expect(state.playerFallen).toBe(true);
    expect(state.lossReason).toBe('aura');

    // Run an update tick to propagate the loss into menu labels.
    updateAuraRecovery(player, state, baseWorld, world, 0.1);
    checkEndConditions(state, world);
  });

  it('derives shorter wave intervals on later nights', () => {
    const earlyWave = deriveWaveDefinition(1);
    const lateWave = deriveWaveDefinition(3);
    expect(lateWave.interval).toBeLessThanOrEqual(earlyWave.interval);
  });

  it('lets islands alter wave behavior', () => {
    const calmIsland = createIslandContext(1);
    const tempestIsland = createIslandContext(4);
    const calmWave = deriveWaveDefinition(1, calmIsland, calmIsland.modifiers);
    const tempestWave = deriveWaveDefinition(1, tempestIsland, tempestIsland.modifiers);
    expect(tempestWave.interval).toBeLessThan(calmWave.interval);
    expect(tempestWave.sideBias.left).toBeGreaterThan(calmWave.sideBias.left);
  });

  it('applies island wave modifiers to timing and side weighting', () => {
    const store = createGameStore();
    const { state, world } = store;
    state.isNight = true;
    const baseWave = deriveWaveDefinition(1, state.island, {
      ...state.modifiers,
      waveIntervalScale: 1,
      waveSideWeights: { left: 1, right: 1 },
    });

    state.modifiers.waveIntervalScale = 0.5;
    state.modifiers.waveSideWeights = { left: 3, right: 0.2 };
    state.waveTimer = 0;
    state.currentNightNumber = 1;
    const rng = { boolean: () => true, int: (min) => min };
    const spawner = (side, enemyType) => createEnemy(side, world, [], state.modifiers, enemyType);

    updateEnemySpawns(state, world, spawner, 0, rng, state.effects);
    expect(state.waveInterval).toBeCloseTo(baseWave.interval * state.modifiers.waveIntervalScale, 5);
    expect(state.enemies[0].spawnSide).toBe('left');
  });

  it('preserves camera dimensions on reset after resizing the world', () => {
    const store = createGameStore();
    updateWorldDimensions(store, 1280, 720);
    const previousCamera = { ...store.camera };

    resetGameStore(store);

    expect(store.camera.w).toBe(previousCamera.w);
    expect(store.camera.h).toBe(previousCamera.h);
    expect(store.camera.y).toBe(store.world.height - store.camera.h);
  });
});
