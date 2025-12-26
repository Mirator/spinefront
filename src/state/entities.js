import { AURA, BASE_POSITIONS, BASE_WORLD, WORLD_DEFAULTS } from '../core/constants.js';

const BASE_DROP_OFFSET = 48;
const DROP_TARGET_MULTIPLIER = 6; // doubled from the previous spacing
const BASE_DROP_DURATION = 0.35;
const DROP_SPEED_INCREASE = 1.5;

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
    aura: AURA.max,
    maxAura: AURA.max,
    auraHitCooldown: 0,
    auraRecoverDelay: 0,
    critical: false,
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
  const damageMultiplier = damageScale;
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
    damageMultiplier,
    baseDamageMultiplier: damageMultiplier,
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

export function createEnemy(side, world, structures = [], modifiers = {}, variant = 'enemy') {
  const spawnPadding = 120;
  const x = side === 'left' ? -spawnPadding : world.width + spawnPadding;
  const speedScale = modifiers.enemySpeed || 1;
  const hpScale = modifiers.enemyHp || 1;
  const wyvernScale = modifiers.wyvernSpeed || 1;
  const baseSpeed = 65 * speedScale;
  const dropTarget = pickDropTarget(side, world, structures, modifiers.dropPadding || 0);
  const carrier = {
    active: true,
    hasDropped: false,
    targetX: dropTarget,
    speedMultiplier: 4 * wyvernScale,
    height: world.ground - 140,
    dropDuration: BASE_DROP_DURATION / DROP_SPEED_INCREASE,
    dropTimer: 0,
  };
  const baseEnemy = {
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

  if (variant === 'sapper') {
    return {
      ...baseEnemy,
      w: 26,
      h: 32,
      speed: 48 * speedScale,
      vx: side === 'left' ? 48 * speedScale : -48 * speedScale,
      attack: 10,
      attackRate: 0.8,
      hp: Math.round(60 * hpScale),
      maxHp: Math.round(60 * hpScale),
      carrier,
      ranged: {
        range: 260,
        preferredRange: 200,
        projectileSpeed: 320,
        projectileDamage: 14,
      },
    };
  }

  return baseEnemy;
}

function pickDropTarget(side, world, structures = [], dropPadding = 0) {
  const living = structures.filter((structure) => structure.hp > 0).sort((a, b) => a.x - b.x);
  const fallback = side === 'left' ? world.width * 0.35 : world.width * 0.65;
  if (!living.length) return fallback;
  const anchor = side === 'left' ? living[0] : living[living.length - 1];
  const anchorCenter = anchor.x + anchor.w / 2;
  const sign = side === 'left' ? -1 : 1;
  const paddedOffset = Math.max(0, BASE_DROP_OFFSET - dropPadding);
  return anchorCenter + sign * paddedOffset * DROP_TARGET_MULTIPLIER;
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

export function createBarricade(x, world) {
  const clampedX = Math.max(40, Math.min(world.width - 60, x));
  return {
    type: 'barricade',
    x: clampedX - 18,
    y: world.ground - 28,
    w: 36,
    h: 28,
    hp: 70,
    maxHp: 70,
    temporary: true,
  };
}
