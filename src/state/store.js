import { BASE_POSITIONS, BASE_WORLD, ECONOMY, WORLD_DEFAULTS, WORLD_SCALE } from '../core/constants.js';
import { createEffectsState } from '../systems/effects.js';
import { createInputState, resetInputState } from '../core/input.js';
import { createRng, normalizeSeed } from '../core/random.js';
import { clamp } from '../systems/math.js';
import { createBarricade, createPlayer, createStructureSets, createWall, createTower } from './entities.js';
import { centerCameraOnPlayer, createCamera, resizeCamera } from './camera.js';
import { createBaseModifiers, createIslandContext } from './islands.js';

function applyAltitude(store) {
  const heightRatio = store.world.height / store.baseWorld.height;
  const altitude = (store.state?.altitude || 0) * WORLD_SCALE.y;
  const groundMargin = store.baseWorld.groundMargin * heightRatio;
  store.world.ground = Math.max(store.world.height - groundMargin - altitude, store.world.height * 0.48);
}

export function createWorld(dimensions = {}) {
  const width = (dimensions.width || BASE_WORLD.width) * WORLD_SCALE.x;
  const height = (dimensions.height || BASE_WORLD.height) * WORLD_SCALE.y;
  return {
    width,
    height,
    ground: height - BASE_WORLD.groundMargin * WORLD_SCALE.y,
    gravity: WORLD_DEFAULTS.gravity,
    dayLength: WORLD_DEFAULTS.dayLength,
    nightsToWin: WORLD_DEFAULTS.nightsToWin,
  };
}

export function createGameStore(dimensions = {}) {
  const world = createWorld(dimensions);
  const island = createIslandContext(1, []);
  const { walls, towers, shrine } = createStructureSets(world, BASE_WORLD, island.modifiers);
  const player = createPlayer(world);
  const camera = createCamera(dimensions.width || BASE_WORLD.width, dimensions.height || BASE_WORLD.height, world);
  centerCameraOnPlayer(camera, player, world);
  const initialSeed = normalizeSeed(dimensions.seed ?? Date.now());
  const rng = createRng(initialSeed);
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
    menuMessage: `${island.bonus?.name || 'Sky island'} — ${
      island.bonus?.description || 'Survive 3 nights to ascend.'
    }`,
    menuStartLabel: 'Start run',
    shrineUnlocked: false,
    shrineTech: {
      unlocked: false,
      selection: 'cadence',
      selectionHeld: false,
      branches: { cadence: 0, power: 0 },
    },
    hudText: '',
    waveTimer: 0,
    waveInterval: 0,
    waveDefinition: null,
    currentNightNumber: null,
    enemies: [],
    projectiles: [],
    enemyProjectiles: [],
    effects: createEffectsState(),
    skyBlend: 0,
    islandLevel: 1,
    islandHistory: [island.bonus?.id].filter(Boolean),
    island,
    modifiers: island.modifiers || createBaseModifiers(),
    learnedShrine: island.modifiers?.shrineUnlocked || false,
    pendingAscend: false,
    altitude: 0,
    randomSeed: rng.seed,
    droppedCrown: { active: false, x: 0, y: 0, timer: 0 },
    interactionLatch: false,
    waveDescriptors: [],
  };

  state.shrineUnlocked = state.learnedShrine || false;
  state.shrineTech.unlocked = state.shrineUnlocked;

  return {
    baseWorld: { ...BASE_WORLD, walls: [...BASE_POSITIONS.walls], towers: [...BASE_POSITIONS.towers] },
    world,
    player,
    walls,
    towers,
    barricades: [],
    shrine,
    state,
    input: createInputState(),
    camera,
    rng,
  };
}

function resetRunState(state, modifiers, { keepMenuOpen = false } = {}) {
  state.time = 0;
  state.dayTimer = 0;
  state.isNight = false;
  state.nightsSurvived = 0;
  state.currency = ECONOMY.dayIncome + (modifiers.incomeBonus || 0);
  state.crownLost = false;
  state.ended = false;
  state.pendingAscend = false;
  state.hasStarted = !keepMenuOpen;
  state.menuOpen = keepMenuOpen;
  state.paused = keepMenuOpen;
  state.menuStatus = 'Ready to deploy';
  state.menuMessage =
    'Survive 3 nights on each sky island, defend the crown, and unlock shrine tech to empower towers.';
  state.menuStartLabel = keepMenuOpen ? 'Start run' : 'Resume run';
  state.hudText = '';
  state.waveTimer = 0;
  state.waveInterval = 0;
  state.waveDefinition = null;
  state.currentNightNumber = null;
  state.enemies = [];
  state.projectiles = [];
  state.enemyProjectiles = [];
  state.skyBlend = 0;
  state.effects = createEffectsState();
  state.droppedCrown = { active: false, x: 0, y: 0, timer: 0 };
  state.waveDescriptors = [];
  state.interactionLatch = false;

  state.shrineTech = {
    unlocked: state.learnedShrine || false,
    selection: state.shrineTech?.selection || 'cadence',
    selectionHeld: false,
    branches: { cadence: 0, power: 0 },
  };
}

function seedStoreRng(store, seed) {
  const normalized = normalizeSeed(seed);
  if (store.state) {
    store.state.randomSeed = normalized;
  }
  if (store.rng) {
    store.rng.setSeed(normalized);
  } else {
    store.rng = createRng(normalized);
  }
}

function rebuildStructures(store) {
  const widthRatio = store.world.width / store.baseWorld.width;
  [store.walls[0], store.walls[1]].forEach((wall, idx) => {
    const pos = store.baseWorld.walls[idx] * widthRatio;
    const resetWall = createWall(pos, store.world, store.state.modifiers);
    Object.assign(wall, resetWall);
    wall.x = clamp(wall.x, 0, store.world.width - wall.w);
    wall.y = store.world.ground - wall.h;
  });
  [store.towers[0], store.towers[1]].forEach((tower, idx) => {
    const pos = store.baseWorld.towers[idx] * widthRatio;
    const resetTower = createTower(pos, store.world, store.state.modifiers);
    Object.assign(tower, resetTower);
    tower.x = clamp(tower.x, 0, store.world.width - tower.w);
    tower.y = store.world.ground - tower.h;
  });
}

function assignIsland(store, level, { keepHistory = false } = {}) {
  const history = keepHistory ? store.state.islandHistory || [] : [];
  const islandContext = createIslandContext(level, history);
  store.state.islandLevel = level;
  store.state.islandHistory = [...history, islandContext.bonus?.id].filter(Boolean);
  store.state.island = islandContext;
  store.state.modifiers = islandContext.modifiers || createBaseModifiers();
  store.state.altitude = (level - 1) * (BASE_WORLD.altitudeStep || 24);
}

export function resetGameStore(store, options = {}) {
  const { keepLearnedUpgrades = false, islandLevel = 1 } = options;
  assignIsland(store, islandLevel, { keepHistory: keepLearnedUpgrades && islandLevel > 1 });
  seedStoreRng(store, options.seed ?? store.state.randomSeed ?? Date.now());

  applyAltitude(store);
  resetRunState(store.state, store.state.modifiers, { keepMenuOpen: false });

  store.state.shrineUnlocked =
    (keepLearnedUpgrades && store.state.learnedShrine) || store.state.modifiers.shrineUnlocked;
  store.state.learnedShrine = store.state.shrineUnlocked;
  store.state.shrineTech.unlocked = store.state.shrineUnlocked;
  store.state.shrineTech.branches = { cadence: 0, power: 0 };
  store.state.menuStatus = `Island ${islandLevel}`;
  store.state.menuMessage = `${store.state.island?.bonus?.name || 'New island'} — ${
    store.state.island?.bonus?.description || 'Hold the line for three nights.'
  }`;
  store.state.menuStartLabel = 'Start run';

  resetInputState(store.input);

  const freshPlayer = createPlayer(store.world);
  Object.assign(store.player, freshPlayer);
  store.player.x = Math.min(freshPlayer.x, store.world.width - store.player.w - 40);
  store.player.y = freshPlayer.y;

  rebuildStructures(store);
  store.barricades = [];
  store.shrine.x = store.world.width / 2 - store.shrine.w / 2;
  store.shrine.y = store.world.ground - store.shrine.h;
  resizeCamera(store.camera, store.camera.w, store.camera.h, store.world);
  centerCameraOnPlayer(store.camera, store.player, store.world);
}

export function ascendGameStore(store) {
  const nextLevel = (store.state.islandLevel || 1) + 1;
  assignIsland(store, nextLevel, { keepHistory: true });
  seedStoreRng(store, store.state.randomSeed ?? Date.now());
  applyAltitude(store);
  resetRunState(store.state, store.state.modifiers, { keepMenuOpen: true });
  store.state.pendingAscend = false;
  store.state.shrineUnlocked = store.state.learnedShrine || store.state.modifiers.shrineUnlocked;
  store.state.learnedShrine = store.state.shrineUnlocked;
  store.state.shrineTech.unlocked = store.state.shrineUnlocked;
  store.state.shrineTech.branches = { cadence: 0, power: 0 };
  store.state.menuStatus = `Ascended to Island ${nextLevel}`;
  store.state.menuMessage = `${store.state.island?.bonus?.name || 'New island'} — ${
    store.state.island?.bonus?.description || ''
  }`;
  store.state.menuStartLabel = 'Begin next island';

  resetInputState(store.input);
  const freshPlayer = createPlayer(store.world);
  Object.assign(store.player, freshPlayer);
  store.player.x = Math.min(freshPlayer.x, store.world.width - store.player.w - 40);
  store.player.y = freshPlayer.y;

  rebuildStructures(store);
  store.barricades = [];
  store.shrine.x = store.world.width / 2 - store.shrine.w / 2;
  store.shrine.y = store.world.ground - store.shrine.h;
  resizeCamera(store.camera, store.camera.w, store.camera.h, store.world);
  centerCameraOnPlayer(store.camera, store.player, store.world);
}

export function updateWorldDimensions(store, width, height) {
  const prevWidth = store.world.width || width * WORLD_SCALE.x;
  const prevHeight = store.world.height || height * WORLD_SCALE.y;
  const scaledWidth = width * WORLD_SCALE.x;
  const scaledHeight = height * WORLD_SCALE.y;
  const widthRatio = scaledWidth / store.baseWorld.width;
  const heightRatio = scaledHeight / store.baseWorld.height;
  const widthScale = scaledWidth / prevWidth;
  const heightScale = scaledHeight / prevHeight;

  store.world.width = scaledWidth;
  store.world.height = scaledHeight;
  const altitude = (store.state?.altitude || 0) * WORLD_SCALE.y;
  const groundMargin = store.baseWorld.groundMargin * heightRatio;
  store.world.ground = Math.max(scaledHeight - groundMargin - altitude, scaledHeight * 0.48);

  store.player.x *= widthScale;
  store.player.y *= heightScale;

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

  if (store.barricades) {
    store.barricades.forEach((barricade) => {
      barricade.x *= widthScale;
      barricade.y = store.world.ground - barricade.h;
    });
  }

  store.shrine.x = store.world.width / 2 - store.shrine.w / 2;
  store.shrine.y = store.world.ground - store.shrine.h;

  store.player.x = clamp(store.player.x, 20, store.world.width - store.player.w - 20);
  store.player.y = Math.min(store.player.y, store.world.ground - store.player.h);
  store.state.enemies.forEach((enemy) => {
    enemy.x = clamp(enemy.x, -140, store.world.width + 140);
    const targetGround = store.world.ground - enemy.h;
    if (enemy.carrier?.active && !enemy.carrier?.hasDropped) {
      const hover = enemy.carrier.height || targetGround - 100;
      enemy.y = Math.min(enemy.y, hover);
    } else {
      enemy.y = Math.min(enemy.y, targetGround);
    }
  });
  if (store.state.droppedCrown?.active) {
    store.state.droppedCrown.x *= widthScale;
    store.state.droppedCrown.y = store.world.ground - 6;
  }
  resizeCamera(store.camera, width, height, store.world);
  centerCameraOnPlayer(store.camera, store.player, store.world);
}

export function setStoreSeed(store, seed) {
  seedStoreRng(store, seed);
  return store.state.randomSeed;
}
