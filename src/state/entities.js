import { BASE_POSITIONS, WORLD_DEFAULTS } from '../core/constants.js';

export function createPlayer(world) {
  return {
    type: 'player',
    x: world.width * 0.125,
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

export function createWall(x, world) {
  return {
    type: 'wall',
    x,
    y: world.ground - 60,
    w: 40,
    h: 60,
    hp: 120,
    maxHp: 120,
  };
}

export function createTower(x, world) {
  return {
    type: 'tower',
    x,
    y: world.ground - 90,
    w: 36,
    h: 90,
    hp: 160,
    maxHp: 160,
    fireRate: 1.4,
    fireTimer: 0,
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

export function createEnemy(side, world) {
  const spawnPadding = 80;
  const x = side === 'left' ? -spawnPadding : world.width + spawnPadding;
  return {
    type: 'enemy',
    x,
    y: world.ground - 36,
    w: 28,
    h: 36,
    vx: side === 'left' ? 65 : -65,
    speed: 65,
    attack: 12,
    attackRate: 1,
    attackTimer: 0,
    target: null,
    hp: 50,
  };
}

export function scalePositions(world, baseWorld = { width: 960 }) {
  const widthRatio = world.width / baseWorld.width;
  return {
    walls: BASE_POSITIONS.walls.map((x) => x * widthRatio),
    towers: BASE_POSITIONS.towers.map((x) => x * widthRatio),
  };
}

export function createStructureSets(world, baseWorld) {
  const { walls, towers } = scalePositions(world, baseWorld);
  return {
    walls: walls.map((pos) => createWall(pos, world)),
    towers: towers.map((pos) => createTower(pos, world)),
    shrine: createShrine(world),
  };
}

export function cloneEntity(entity) {
  return JSON.parse(JSON.stringify(entity));
}
