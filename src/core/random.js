const MASK_32 = 0xffffffff;

function mulberry32(seed) {
  let t = seed >>> 0;
  return function next() {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed = Date.now()) {
  let currentSeed = seed >>> 0;
  let generator = mulberry32(currentSeed);

  function setSeed(nextSeed = Date.now()) {
    currentSeed = nextSeed >>> 0;
    generator = mulberry32(currentSeed);
    return currentSeed;
  }

  return {
    get seed() {
      return currentSeed;
    },
    setSeed,
    next() {
      return generator();
    },
    uniform(min = 0, max = 1) {
      return min + (max - min) * generator();
    },
    boolean(probability = 0.5) {
      return generator() < probability;
    },
    int(min, max) {
      const clampedMin = Math.ceil(min);
      const clampedMax = Math.floor(max);
      const span = clampedMax - clampedMin + 1;
      return clampedMin + Math.floor(generator() * span);
    },
  };
}

export function normalizeSeed(value) {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return Date.now();
  }
  return (value >>> 0) & MASK_32;
}
