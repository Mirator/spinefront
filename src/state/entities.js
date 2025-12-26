import { BASE_POSITIONS, BASE_WORLD, WORLD_DEFAULTS } from '../core/constants.js';

export function createPlayer(world) {
  const widthRatio = world.width / BASE_WORLD.width;
  const baseX = typeof BASE_POSITIONS.player === 'number' ? BASE_POSITIONS.player : BASE_WORLD.width / 2 - 14;
  const scaledX = baseX * widthRatio;
  return {
    type: 'player',
    x: scaledX,
    y: world.ground - 40,
    w: 28,
    h: 40,
    vx: 0,
    vy: 0,
    speed: 220,
    sprintSpeed: 340,
    jumpForce: 650,
    onGround: false,
    onLadder: false,
    facing: 1,
    attackCooldown: 0.4,
    attackTimer: 0,
    swingTimer: 0,
    swingDuration: 0.22,
    swingFacing: 1,
    crown: true,
  };
}

export function createWall(x, world, modifiers = {}) {
  const wallScale = modifiers.wallHp || 1;
  const maxHp = Math.round(120 * wallScale);
  return {
    type: 'wall',
    x,
    y: world.ground - 60,
    w: 40,
    h: 60,
    hp: maxHp,
    maxHp,
  };
}

export function createTower(x, world, modifiers = {}) {
  const fireRateScale = modifiers.towerFireRate || 1;
  const damageScale = modifiers.projectileDamage || 1;
  return {
    type: 'tower',
    x,
    y: world.ground - 90,
    w: 36,
    h: 90,
    hp: 160,
    maxHp: 160,
    fireRate: 1.4 * fireRateScale,
    fireTimer: 0,
    damageMultiplier: damageScale,
  };
}

export function createShrine(world) {
  return {
    type: 'shrine',
    x: world.width / 2 - 25,
    y: world.ground - 50,
    w: 50,
    h: 50,
  };
}

export function createEnemy(side, world, towers = [], modifiers = {}, variant = 'enemy') {
  const spawnPadding = 120;
  const x = side === 'left' ? -spawnPadding : world.width + spawnPadding;
  const speedScale = modifiers.enemySpeed || 1;
  const hpScale = modifiers.enemyHp || 1;
  const wyvernScale = modifiers.wyvernSpeed || 1;
  const baseSpeed = 65 * speedScale;
  const dropTarget = pickDropTarget(side, world, towers, modifiers.dropPadding || 0);
  const carrier = {
    active: true,
    hasDropped: false,
    targetX: dropTarget,
    speedMultiplier: 4 * wyvernScale,
    height: world.ground - 140,
    dropDuration: 0.35,
    dropTimer: 0,
  };
  return {
    type: 'enemy',
    variant,
    spawnSide: side,
    x,
    y: world.ground - 140,
    w: 28,
    h: 36,
    vx: side === 'left' ? baseSpeed : -baseSpeed,
    speed: baseSpeed,
    attack: 12,
    attackRate: 1,
    attackTimer: 0,
    stunTimer: 0,
    target: null,
    hp: Math.round(50 * hpScale),
    maxHp: Math.round(50 * hpScale),
    carrier,
  };
}

function pickDropTarget(side, world, towers = [], dropPadding = 0) {
  const living = towers.filter((t) => t.hp > 0);
  const fallback = side === 'left' ? world.width * 0.35 : world.width * 0.65;
  if (!living.length) return fallback;
  const preferred = living.reduce((closest, tower) => {
    if (!closest) return tower;
    const center = tower.x + tower.w / 2;
    const bestCenter = closest.x + closest.w / 2;
    return Math.abs(center - fallback) < Math.abs(bestCenter - fallback) ? tower : closest;
  }, null);
  const center = preferred.x + preferred.w / 2;
  return center + (side === 'left' ? -24 : 24) + (side === 'left' ? dropPadding : -dropPadding);
}

export function scalePositions(world, baseWorld = { width: 960 }) {
  const widthRatio = world.width / baseWorld.width;
  return {
    walls: BASE_POSITIONS.walls.map((x) => x * widthRatio),
    towers: BASE_POSITIONS.towers.map((x) => x * widthRatio),
  };
}

export function createStructureSets(world, baseWorld, modifiers = {}) {
  const { walls, towers } = scalePositions(world, baseWorld);
  return {
    walls: walls.map((pos) => createWall(pos, world, modifiers)),
    towers: towers.map((pos) => createTower(pos, world, modifiers)),
    shrine: createShrine(world),
  };
}

export function cloneEntity(entity) {
  return JSON.parse(JSON.stringify(entity));
}
