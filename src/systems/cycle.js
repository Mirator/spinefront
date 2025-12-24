import { ECONOMY } from '../core/constants.js';
import { clamp } from './math.js';

export function updateDayNight(state, world, dt) {
  const events = { becameNight: false, becameDay: false };
  state.dayTimer += dt;
  if (state.dayTimer >= world.dayLength) {
    state.dayTimer = 0;
    state.isNight = !state.isNight;
    if (state.isNight) {
      state.currency += ECONOMY.nightIncome;
      const upcomingNight = state.nightsSurvived + 1;
      state.waveInterval = Math.max(1.5, 3.5 - upcomingNight);
      state.waveTimer = state.waveInterval;
      state.hudText = `Night ${upcomingNight} begins.`;
      events.becameNight = true;
    } else {
      state.nightsSurvived += 1;
      state.currency += ECONOMY.dayIncome;
      state.waveTimer = 0;
      state.waveInterval = 0;
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
    state.ended = true;
    return 'win';
  }
  return null;
}
