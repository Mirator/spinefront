import { ECONOMY } from '../core/constants.js';
import { deriveWaveDefinition } from '../state/waves.js';
import { clamp } from './math.js';

export function updateDayNight(state, world, dt) {
  const events = { becameNight: false, becameDay: false };
  state.dayTimer += dt;
  if (state.dayTimer >= world.dayLength) {
    state.dayTimer = 0;
    state.isNight = !state.isNight;
    if (state.isNight) {
      const incomeBonus = state.modifiers?.incomeBonus || 0;
      state.currency += ECONOMY.nightIncome + incomeBonus;
      const upcomingNight = state.nightsSurvived + 1;
      state.currentNightNumber = upcomingNight;
      const wave = deriveWaveDefinition(upcomingNight, state.island, state.modifiers);
      state.waveDefinition = wave;
      state.waveInterval = wave.interval;
      state.waveTimer = state.waveInterval;
      state.hudText = `Night ${upcomingNight} begins.`;
      events.becameNight = true;
    } else {
      state.nightsSurvived += 1;
      const incomeBonus = state.modifiers?.incomeBonus || 0;
      state.currency += ECONOMY.dayIncome + incomeBonus;
      state.currentNightNumber = null;
      state.waveTimer = 0;
      state.waveInterval = 0;
      state.waveDefinition = null;
      state.waveDescriptors = [];
      state.enemyProjectiles = [];
      state.hudText = `Sunrise! You earned income.`;
      events.becameDay = true;
    }
  }

  const targetBlend = state.isNight ? 1 : 0;
  const transitionSeconds = world.dayLength * 0.35;
  const step = dt / transitionSeconds;
  if (state.skyBlend < targetBlend) {
    state.skyBlend = Math.min(targetBlend, state.skyBlend + step);
  } else if (state.skyBlend > targetBlend) {
    state.skyBlend = Math.max(targetBlend, state.skyBlend - step);
  }

  state.dayRatio = clamp(state.dayTimer / world.dayLength, 0, 1);
  return events;
}

export function checkEndConditions(state, world) {
  if (state.crownLost) {
    state.ended = true;
    return 'loss';
  }
  if (!state.isNight && state.nightsSurvived >= world.nightsToWin) {
    state.pendingAscend = true;
    state.paused = true;
    return 'ascend';
  }
  return null;
}
