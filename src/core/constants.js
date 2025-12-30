export const BASE_WORLD = {
  width: 960,
  height: 540,
  groundMargin: 80,
  altitudeStep: 28,
};

export const WORLD_SCALE = {
  x: 4,
  y: 2,
};

export const WORLD_DEFAULTS = {
  gravity: 1800,
  dayLength: 60,
  nightsToWin: 3,
};

export const ECONOMY = {
  dayIncome: 10,
  nightIncome: 5,
  shrineCost: 10,
  repairCost: 4,
  barricadeCost: 7,
};

export const AURA = {
  max: 100,
  hitLoss: 38,
  hitCooldown: 0.65,
  recoverDelay: 1.1,
  recoverRate: 12,
  recoveryGoldThreshold: 4,
  criticalRecoveryBuffer: 8,
  territoryPadding: 80,
  goldDropPerHit: 3,
  burdenHitBonus: 0.4,
  instabilityGoldFloor: 8,
  instabilityGoldCeiling: 16,
  instabilityDelayPerGold: 0.06,
  instabilityDrainPerGold: 0.14,
  recoverBurdenPenalty: 0.03,
};

export const GOLD_BURDEN = {
  freeLoad: 4,
  slowSoftCap: 14,
  maxWalkSlow: 0.18,
  maxSprintSlow: 0.45,
  manualDropAmount: 5,
};

export const SHRINE_TECH = {
  costs: [10, 16, 24],
  branches: {
    cadence: {
      id: 'cadence',
      label: 'Rapid Volley',
      description: 'Tower cadence improves with each tier.',
      fireRateBonus: 0.12,
    },
    power: {
      id: 'power',
      label: 'Sun Lances',
      description: 'Tower damage rises with each tier.',
      damageBonus: 0.18,
    },
  },
};

export const BASE_POSITIONS = {
  walls: [432, 528],
  towers: [454, 506],
  player: 468,
};

export const COLORS = {
  player: '#9ad8ff',
  playerEye: '#0b1a2c',
  wall: '#cbd5ff',
  tower: '#a5b4fc',
  barricade: '#f59e0b',
  enemy: '#ff9aa2',
  sapper: '#fb923c',
  shrine: '#7de3c5',
  beacon: '#f472b6',
  wyvern: '#9ca3af',
  islandTop: '#4ade80',
  islandShadow: '#115e3d',
};

export const PUZZLES = {
  count: 2,
  interactionRange: 48,
  types: ['sky_climb', 'dodge_pulse', 'energy_channel'],
  difficulty: {
    easy: { nightsRequired: 0, goldReward: 5, legacyReward: 0, relicChance: 0 },
    medium: { nightsRequired: 1, goldReward: 10, legacyReward: 1, relicChance: 0.2 },
    hard: { nightsRequired: 2, goldReward: 18, legacyReward: 2, relicChance: 0.6 },
  },
  skyClimb: {
    easy: { platforms: 3, timeLimit: 8, platformWidth: 80 },
    medium: { platforms: 5, timeLimit: 10, platformWidth: 60 },
    hard: { platforms: 7, timeLimit: 12, platformWidth: 40 },
  },
  dodgePulse: {
    easy: { pulses: 3, pulseInterval: 2.0, pulseSpeed: 80 },
    medium: { pulses: 5, pulseInterval: 1.5, pulseSpeed: 120 },
    hard: { pulses: 7, pulseInterval: 1.0, pulseSpeed: 160 },
  },
  energyChannel: {
    easy: { duration: 4, driftSpeed: 30, zoneWidth: 60 },
    medium: { duration: 6, driftSpeed: 50, zoneWidth: 50 },
    hard: { duration: 8, driftSpeed: 70, zoneWidth: 40 },
  },
  relicOptions: ['steady_aura', 'lightfoot', 'damping_field'],
};

export const PLAYER_STATS = {
  speed: 220,
  sprintSpeed: 340,
  jumpForce: 650,
  attackCooldown: 0.4,
  swingDuration: 0.22,
};

export const COMBAT_CONFIG = {
  towerProjectileSpeed: 520,
  towerRange: 360,
  sapperProjectileSpeed: 280,
  sapperRange: 260,
  sapperPreferredRange: 200,
  baseProjectileDamage: 18,
  swingPadding: 8,
};

export const INTERACTION_CONFIG = {
  shrineMargin: 12,
  repairRange: 42,
  repairAmount: 30,
};
