export function createEffectsState() {
  return {
    hitFlashes: [],
    screenShake: { power: 0, duration: 0, baseDuration: 0 },
    shakeOffset: { x: 0, y: 0 },
    vignette: { timer: 0, duration: 0, intensity: 0 },
    slowdown: { timer: 0, duration: 0, minScale: 1 },
    timeScale: 1,
  };
}

export function updateEffects(effects, dt, rng) {
  effects.hitFlashes = effects.hitFlashes
    .map((flash) => ({ ...flash, timer: flash.timer - dt }))
    .filter((flash) => flash.timer > 0);

  const shake = effects.screenShake;
  if (shake.duration > 0) {
    const falloff = shake.baseDuration > 0 ? shake.duration / shake.baseDuration : 0;
    const magnitude = shake.power * falloff;
    const randomOffset = rng?.uniform ? rng.uniform(-1, 1) : Math.random() * 2 - 1;
    effects.shakeOffset.x = randomOffset * magnitude;
    effects.shakeOffset.y = (rng?.uniform ? rng.uniform(-1, 1) : Math.random() * 2 - 1) * magnitude;
    shake.duration = Math.max(0, shake.duration - dt);
    shake.power = Math.max(0, shake.power * 0.9);
  } else {
    effects.shakeOffset.x = 0;
    effects.shakeOffset.y = 0;
    shake.power = 0;
    shake.baseDuration = 0;
  }

  const vig = effects.vignette;
  if (vig.timer > 0) {
    vig.timer = Math.max(0, vig.timer - dt);
  }

  const slow = effects.slowdown;
  if (slow.timer > 0) {
    const progress = 1 - slow.timer / slow.duration;
    effects.timeScale = slow.minScale + (1 - slow.minScale) * progress;
    slow.timer = Math.max(0, slow.timer - dt);
  } else {
    effects.timeScale = 1;
  }
}

export function triggerScreenShake(effects, power = 4, duration = 0.2) {
  const shake = effects.screenShake;
  shake.power = Math.max(power, shake.power);
  shake.duration = Math.max(duration, shake.duration);
  shake.baseDuration = Math.max(duration, shake.duration);
}

export function triggerSlowdown(effects, duration = 0.35, minScale = 0.6) {
  effects.slowdown.timer = duration;
  effects.slowdown.duration = duration;
  effects.slowdown.minScale = minScale;
  effects.timeScale = minScale;
}

export function triggerDangerFlash(effects) {
  effects.vignette.timer = 0.55;
  effects.vignette.duration = 0.55;
  effects.vignette.intensity = 0.8;
  triggerSlowdown(effects, 0.45, 0.55);
}

export function addHitFlash(effects, x, y, canvasWidth, canvasHeight, rng) {
  effects.hitFlashes.push({
    x: Math.max(0, Math.min(1, x / canvasWidth)),
    y: Math.max(0, Math.min(1, y / canvasHeight)),
    timer: 0.2,
    duration: 0.2,
    angle: (rng?.uniform ? rng.uniform(-25, 25) : Math.random() * 50 - 25),
  });
}
