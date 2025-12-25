import { BASE_POSITIONS, BASE_WORLD, ECONOMY, WORLD_DEFAULTS } from '../core/constants.js';
import { createEffectsState } from '../systems/effects.js';
import { createInputState, resetInputState } from '../core/input.js';
import { clamp } from '../systems/math.js';
import { createPlayer, createStructureSets, createWall, createTower } from './entities.js';

export function createWorld(dimensions = {}) {
  const width = dimensions.width || BASE_WORLD.width;
  const height = dimensions.height || BASE_WORLD.height;
  return {
    width,
    height,
    ground: height - BASE_WORLD.groundMargin,
    gravity: WORLD_DEFAULTS.gravity,
    dayLength: WORLD_DEFAULTS.dayLength,
    nightsToWin: WORLD_DEFAULTS.nightsToWin,
  };
}

export function createGameStore(dimensions = {}) {
  const world = createWorld(dimensions);
  const { walls, towers, shrine } = createStructureSets(world, BASE_WORLD);
  const player = createPlayer(world);
  const state = {
    time: 0,
    dayTimer: 0,
    isNight: false,
    nightsSurvived: 0,
    currency: ECONOMY.dayIncome,
    crownLost: false,
    ended: false,
    hasStarted: false,
    menuOpen: true,
    paused: true,
    menuStatus: 'Ready to deploy',
    menuMessage: 'Survive 3 nights, defend the crown, and unlock the shrine for faster towers.',
    menuStartLabel: 'Start run',
    shrineUnlocked: false,
    hudText: '',
    waveTimer: 0,
    waveInterval: 0,
    currentNightNumber: null,
    enemies: [],
    projectiles: [],
    effects: createEffectsState(),
    skyBlend: 0,
  };

  return {
    baseWorld: { ...BASE_WORLD, walls: [...BASE_POSITIONS.walls], towers: [...BASE_POSITIONS.towers] },
    world,
    player,
    walls,
    towers,
    shrine,
    state,
    input: createInputState(),
  };
}

export function resetGameStore(store) {
  store.state.time = 0;
  store.state.dayTimer = 0;
  store.state.isNight = false;
  store.state.nightsSurvived = 0;
  store.state.currency = ECONOMY.dayIncome;
  store.state.crownLost = false;
  store.state.ended = false;
  store.state.hasStarted = true;
  store.state.menuOpen = false;
  store.state.paused = false;
  store.state.menuStatus = 'Ready to deploy';
  store.state.menuMessage = 'Survive 3 nights, defend the crown, and unlock the shrine for faster towers.';
  store.state.menuStartLabel = 'Start run';
  store.state.shrineUnlocked = false;
  store.state.hudText = '';
  store.state.waveTimer = 0;
  store.state.waveInterval = 0;
  store.state.currentNightNumber = null;
  store.state.enemies = [];
  store.state.projectiles = [];
  store.state.skyBlend = 0;
  store.state.effects = createEffectsState();

  resetInputState(store.input);

  const freshPlayer = createPlayer(store.world);
  Object.assign(store.player, freshPlayer);
  store.player.x = Math.min(freshPlayer.x, store.world.width - store.player.w - 40);
  store.player.y = freshPlayer.y;

  const widthRatio = store.world.width / store.baseWorld.width;
  [store.walls[0], store.walls[1]].forEach((wall, idx) => {
    const pos = store.baseWorld.walls[idx] * widthRatio;
    const resetWall = createWall(pos, store.world);
    Object.assign(wall, resetWall);
    wall.x = clamp(wall.x, 0, store.world.width - wall.w);
    wall.y = store.world.ground - wall.h;
  });
  [store.towers[0], store.towers[1]].forEach((tower, idx) => {
    const pos = store.baseWorld.towers[idx] * widthRatio;
    const resetTower = createTower(pos, store.world);
    Object.assign(tower, resetTower);
    tower.x = clamp(tower.x, 0, store.world.width - tower.w);
    tower.y = store.world.ground - tower.h;
  });
}

export function updateWorldDimensions(store, width, height) {
  const widthRatio = width / store.baseWorld.width;
  const heightRatio = height / store.baseWorld.height;

  store.world.width = width;
  store.world.height = height;
  const groundMargin = store.baseWorld.groundMargin * heightRatio;
  store.world.ground = Math.max(height - groundMargin, height * 0.6);

  store.walls.forEach((wall, idx) => {
    const baseX = (store.baseWorld.walls || [])[idx];
    if (typeof baseX === 'number') {
      wall.x = baseX * widthRatio;
    }
    wall.y = store.world.ground - wall.h;
  });

  store.towers.forEach((tower, idx) => {
    const baseX = (store.baseWorld.towers || [])[idx];
    if (typeof baseX === 'number') {
      tower.x = baseX * widthRatio;
    }
    tower.y = store.world.ground - tower.h;
  });

  store.shrine.x = store.world.width / 2 - store.shrine.w / 2;
  store.shrine.y = store.world.ground - store.shrine.h;

  store.player.x = clamp(store.player.x, 20, store.world.width - store.player.w - 20);
  store.player.y = Math.min(store.player.y, store.world.ground - store.player.h);
  store.state.enemies.forEach((enemy) => {
    enemy.x = clamp(enemy.x, -140, store.world.width + 140);
    enemy.y = Math.min(enemy.y, store.world.ground - enemy.h);
  });
}
