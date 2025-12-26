import { describe, expect, it } from 'vitest';
import { GameSession } from '../core/session.js';

describe('GameSession', () => {
  it('advances day/night cycles during steps', () => {
    const session = new GameSession();
    session.closeMenu();
    const { state, world } = session.store;

    state.dayTimer = world.dayLength;
    const nightResult = session.step(0);
    expect(nightResult.snapshot.state.isNight).toBe(true);
    expect(nightResult.snapshot.state.currentNightNumber).toBe(1);

    state.dayTimer = world.dayLength;
    const dayResult = session.step(0);
    expect(dayResult.snapshot.state.isNight).toBe(false);
    expect(dayResult.snapshot.state.nightsSurvived).toBe(1);
  });

  it('spawns enemies during a night wave', () => {
    const session = new GameSession();
    session.closeMenu();
    const { state } = session.store;
    state.isNight = true;
    state.waveTimer = 0;
    session.store.rng.boolean = () => false;

    const result = session.step(0.1);
    expect(result.snapshot.state.enemies.length).toBeGreaterThan(0);
    expect(result.snapshot.state.waveTimer).toBeGreaterThan(0);
  });

  it('opens the menu and marks ascend when nights survived', () => {
    const session = new GameSession();
    session.closeMenu();
    const { state, world } = session.store;
    world.nightsToWin = 1;

    state.dayTimer = world.dayLength;
    session.step(0);

    state.dayTimer = world.dayLength;
    const result = session.step(0);

    expect(result.outcome).toBe('ascend');
    expect(result.snapshot.state.pendingAscend).toBe(true);
    expect(result.snapshot.state.menuOpen).toBe(true);
    expect(result.snapshot.state.paused).toBe(true);
    expect(result.snapshot.state.hudText).toContain('cleared');
  });
});
