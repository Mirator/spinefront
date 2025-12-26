export const DEFAULT_MODIFIERS = {
  wallHp: 1,
  towerFireRate: 1,
  projectileDamage: 1,
  incomeBonus: 0,
  shrineUnlocked: false,
  enemySpeed: 1,
  enemyHp: 1,
  wyvernSpeed: 1,
  dropPadding: 0,
  waveIntervalScale: 1,
  waveSideWeights: { left: 1, right: 1 },
};

export const ISLAND_BONUSES = [
  {
    id: 'windward',
    name: 'Windward Gardens',
    description: 'Jet streams quicken tower volleys (+15% fire rate, +15% projectile damage).',
    apply(modifiers) {
      modifiers.towerFireRate *= 0.85;
      modifiers.projectileDamage *= 1.15;
    },
  },
  {
    id: 'aurora',
    name: 'Aurora Bastion',
    description: 'Income glows brighter (+5 gold each dawn and dusk) and shrine wisdom starts unlocked.',
    apply(modifiers) {
      modifiers.incomeBonus += 5;
      modifiers.shrineUnlocked = true;
    },
  },
  {
    id: 'stonebloom',
    name: 'Stonebloom Spires',
    description: 'Ancient roots reinforce walls (+30% max health).',
    apply(modifiers) {
      modifiers.wallHp *= 1.3;
    },
  },
  {
    id: 'tempest',
    name: 'Tempest Truss',
    description:
      'Wyverns ride lightning (+20% flight speed), drop foes closer to the keep, and waves strike faster.',
    apply(modifiers) {
      modifiers.wyvernSpeed *= 1.2;
      modifiers.dropPadding = 36;
      modifiers.waveIntervalScale *= 0.85;
      modifiers.waveSideWeights.left *= 1.1;
      modifiers.waveSideWeights.right *= 0.9;
    },
  },
  {
    id: 'emberforge',
    name: 'Ember Reliquary',
    description: 'Recovered relics toughen foes (+10% HP) but empower tower shots (+20% damage).',
    apply(modifiers) {
      modifiers.enemyHp *= 1.1;
      modifiers.projectileDamage *= 1.2;
    },
  },
];

export function rollIsland(level, history = []) {
  const used = new Set(history);
  const available = ISLAND_BONUSES.filter((bonus) => !used.has(bonus.id));
  const pool = available.length ? available : ISLAND_BONUSES;
  const index = (level - 1) % pool.length;
  return pool[index];
}

export function createIslandContext(level, history = []) {
  const bonus = rollIsland(level, history);
  const modifiers = applyBonusToModifiers(bonus);
  return {
    level,
    bonus,
    modifiers,
  };
}

export function applyBonusToModifiers(bonus) {
  const modifiers = createBaseModifiers();
  if (bonus?.apply) {
    bonus.apply(modifiers);
  }
  return modifiers;
}

export function createBaseModifiers() {
  return {
    ...DEFAULT_MODIFIERS,
    waveSideWeights: { ...DEFAULT_MODIFIERS.waveSideWeights },
  };
}
