import { afterEach, describe, expect, it, vi } from 'vitest';
import { ECONOMY } from '../core/constants.js';
import { createRenderer } from '../render/renderer.js';
import { createGameStore } from '../state/store.js';

function createMockCanvas() {
  const fillTextCalls = [];
  const noop = vi.fn();
  const gradient = { addColorStop: vi.fn() };
  const ctx = {
    save: noop,
    restore: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    quadraticCurveTo: noop,
    closePath: noop,
    ellipse: noop,
    fill: noop,
    stroke: noop,
    rect: noop,
    arc: noop,
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    translate: noop,
    rotate: noop,
    fillText: vi.fn((text) => fillTextCalls.push(text)),
    measureText: vi.fn((text) => ({ width: (text?.length || 0) * 7 })),
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
  };

  const canvas = {
    width: 960,
    height: 540,
    getContext: vi.fn(() => ctx),
  };

  return { canvas, ctx, fillTextCalls };
}

const originalShrineCost = ECONOMY.shrineCost;

afterEach(() => {
  ECONOMY.shrineCost = originalShrineCost;
});

describe('renderer shrine copy', () => {
  it('renders the HUD shrine prompt with the configured cost', () => {
    ECONOMY.shrineCost = 25;
    const { canvas, fillTextCalls } = createMockCanvas();
    const renderer = createRenderer({ canvas });
    const store = createGameStore({ width: canvas.width, height: canvas.height });

    store.state.menuOpen = false;
    store.state.currency = 5;
    store.player.x = store.shrine.x;

    renderer.render({
      world: store.world,
      state: store.state,
      player: store.player,
      shrine: store.shrine,
      walls: store.walls,
      towers: store.towers,
      enemies: store.state.enemies,
      projectiles: store.state.projectiles,
    });

    const shrinePrompt = fillTextCalls.find((text) => text?.includes('[E] Unlock'));
    expect(shrinePrompt).toContain(`[E] Unlock ${ECONOMY.shrineCost}`);
  });
});
