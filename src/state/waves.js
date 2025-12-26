const DEFAULT_SIDE_BIAS = { left: 0.5, right: 0.5 };
const DEFAULT_WAVE = {
  id: 'default',
  interval: 1.8,
  enemyTypes: ['enemy'],
  sideBias: DEFAULT_SIDE_BIAS,
};

const BASE_WAVES = [
  {
    id: 'opening-skirmish',
    nights: [1],
    interval: 2.5,
    enemyTypes: ['enemy'],
    sideBias: { left: 0.55, right: 0.45 },
  },
  {
    id: 'rising-pressure',
    nights: [2],
    interval: 1.5,
    enemyTypes: ['enemy'],
    sideBias: DEFAULT_SIDE_BIAS,
  },
  {
    id: 'onslaught',
    nights: [3],
    interval: 1.5,
    enemyTypes: ['enemy'],
    sideBias: DEFAULT_SIDE_BIAS,
  },
];

function fallbackInterval(nightNumber) {
  return Math.max(1.5, 3.5 - nightNumber);
}

function findBaseWave(nightNumber) {
  return BASE_WAVES.find((wave) => wave.nights?.includes(nightNumber));
}

function cloneWaveDefinition(definition, nightNumber) {
  return {
    id: definition.id ?? `night-${nightNumber}`,
    night: nightNumber,
    interval: definition.interval ?? fallbackInterval(nightNumber),
    enemyTypes: [...(definition.enemyTypes?.length ? definition.enemyTypes : DEFAULT_WAVE.enemyTypes)],
    sideBias: normalizeSideBias(definition.sideBias || DEFAULT_SIDE_BIAS),
  };
}

function scaleSideBias(sideBias, weights = {}) {
  const leftWeight = weights.left ?? 1;
  const rightWeight = weights.right ?? 1;
  return {
    left: (sideBias.left ?? DEFAULT_SIDE_BIAS.left) * leftWeight,
    right: (sideBias.right ?? DEFAULT_SIDE_BIAS.right) * rightWeight,
  };
}

export function normalizeSideBias(sideBias = DEFAULT_SIDE_BIAS) {
  const left = sideBias.left ?? DEFAULT_SIDE_BIAS.left;
  const right = sideBias.right ?? DEFAULT_SIDE_BIAS.right;
  const total = left + right;
  if (total <= 0) {
    return { ...DEFAULT_SIDE_BIAS };
  }
  return {
    left: left / total,
    right: right / total,
  };
}

export function applyWaveModifiers(wave, modifiers = {}) {
  if (!wave) return wave;
  const result = {
    ...wave,
    sideBias: { ...wave.sideBias },
    enemyTypes: [...wave.enemyTypes],
  };

  const intervalScale = modifiers.waveIntervalScale ?? 1;
  result.interval = Math.max(0.5, result.interval * intervalScale);

  if (modifiers.waveSideWeights) {
    result.sideBias = normalizeSideBias(scaleSideBias(result.sideBias, modifiers.waveSideWeights));
  }

  return result;
}

export function deriveWaveDefinition(nightNumber = 1, islandContext, modifiers = islandContext?.modifiers) {
  const baseDefinition = findBaseWave(nightNumber) || { ...DEFAULT_WAVE, interval: fallbackInterval(nightNumber) };
  const cloned = cloneWaveDefinition(baseDefinition, nightNumber);
  const withModifiers = applyWaveModifiers(cloned, modifiers);

  if (islandContext?.bonus?.waveAdjust) {
    const adjusted = {
      ...withModifiers,
      sideBias: { ...withModifiers.sideBias },
      enemyTypes: [...withModifiers.enemyTypes],
    };
    islandContext.bonus.waveAdjust(adjusted, nightNumber, modifiers);
    return {
      ...adjusted,
      sideBias: normalizeSideBias(adjusted.sideBias),
      enemyTypes: [...adjusted.enemyTypes],
    };
  }

  return withModifiers;
}
