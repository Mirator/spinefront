import { describe, expect, it } from 'vitest';
import { GameSession } from '../core/session.js';
import { createMenuStateMachine, MENU_STATES } from '../state/machine.js';

describe('menu state machine', () => {
  it('blocks illegal transitions', () => {
    const machine = createMenuStateMachine(MENU_STATES.INTRO);
    const context = { menuState: MENU_STATES.INTRO };
    const result = machine.transition('resume', context);
    expect(result.changed).toBe(false);
    expect(context.menuState).toBe(MENU_STATES.INTRO);
  });

  it('derives menu labels from state', () => {
    const session = new GameSession();
    let state = session.getState();
    expect(state.menuStatus).toBe('Ready to deploy');
    expect(state.menuStartLabel).toBe('Start run');

    session.closeMenu(); // start running
    session.transitionMenu('pause'); // open paused menu
    state = session.getState();
    expect(state.menuStatus).toBe('Run paused');
    expect(state.menuStartLabel).toBe('Resume run');

    session.transitionMenu('resume');
    session.transitionMenu('ascend');
    state = session.getState();
    expect(state.menuStatus).toContain('cleared');
    expect(state.menuStartLabel).toBe('Ascend');
  });
});
