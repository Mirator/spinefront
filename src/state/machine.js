export const MENU_STATES = {
  INTRO: 'intro',
  RUNNING: 'running',
  PAUSED: 'paused',
  ENDED: 'ended',
  ASCEND_READY: 'ascend-ready',
};

const MENU_TRANSITIONS = {
  [MENU_STATES.INTRO]: {
    start: MENU_STATES.RUNNING,
    reset: MENU_STATES.INTRO,
  },
  [MENU_STATES.RUNNING]: {
    pause: MENU_STATES.PAUSED,
    end: MENU_STATES.ENDED,
    ascend: MENU_STATES.ASCEND_READY,
    reset: MENU_STATES.INTRO,
  },
  [MENU_STATES.PAUSED]: {
    resume: MENU_STATES.RUNNING,
    end: MENU_STATES.ENDED,
    reset: MENU_STATES.INTRO,
  },
  [MENU_STATES.ENDED]: {
    reset: MENU_STATES.INTRO,
  },
  [MENU_STATES.ASCEND_READY]: {
    start: MENU_STATES.RUNNING,
    reset: MENU_STATES.INTRO,
  },
};

const DEFAULT_ISLAND_LINE = 'Hold the line on this island, then ascend.';
const END_MESSAGE = 'Defeat or victory, regroup and launch a fresh climb.';

function deriveIslandLine(state = {}) {
  const bonusName = state.island?.bonus?.name;
  const bonusDescription = state.island?.bonus?.description;
  if (bonusName && bonusDescription) {
    return `${bonusName}: ${bonusDescription}`;
  }
  return DEFAULT_ISLAND_LINE;
}

export function describeMenuState(stateValue, context = {}) {
  const labels = {
    menuStatus: 'Run paused',
    menuMessage: deriveIslandLine(context),
    menuStartLabel: 'Start run',
  };

  const flags = {
    menuOpen: true,
    paused: true,
    ended: false,
    pendingAscend: false,
    hasStarted: false,
  };

  if (stateValue === MENU_STATES.INTRO) {
    labels.menuStatus = 'Ready to deploy';
    labels.menuStartLabel = 'Start run';
  } else if (stateValue === MENU_STATES.RUNNING) {
    labels.menuStatus = 'Run in progress';
    labels.menuStartLabel = 'Resume run';
    flags.menuOpen = false;
    flags.paused = false;
    flags.hasStarted = true;
  } else if (stateValue === MENU_STATES.PAUSED) {
    labels.menuStatus = 'Run paused';
    labels.menuStartLabel = context.pendingAscend ? 'Ascend' : 'Resume run';
    flags.hasStarted = true;
  } else if (stateValue === MENU_STATES.ENDED) {
    labels.menuStatus = 'Run complete';
    labels.menuMessage = END_MESSAGE;
    labels.menuStartLabel = 'Start run';
    flags.ended = true;
    flags.hasStarted = true;
  } else if (stateValue === MENU_STATES.ASCEND_READY) {
    labels.menuStatus = `Island ${context.islandLevel ?? 1} cleared`;
    labels.menuMessage = 'Climb to the next sky island with what you have learned.';
    labels.menuStartLabel = 'Ascend';
    flags.pendingAscend = true;
    flags.hasStarted = true;
  }

  return { state: stateValue, labels, flags };
}

export function applyMenuState(stateValue, storeState) {
  const descriptor = describeMenuState(stateValue, storeState);
  Object.assign(storeState, descriptor.flags, descriptor.labels, { menuState: stateValue });
  return descriptor;
}

export function createMenuStateMachine(initialState = MENU_STATES.INTRO) {
  let value = initialState;

  return {
    get state() {
      return value;
    },
    can(event) {
      return Boolean(MENU_TRANSITIONS[value]?.[event]);
    },
    transition(event, context) {
      const target = MENU_TRANSITIONS[value]?.[event];
      if (!target) return { changed: false, state: value };
      value = target;
      const descriptor = applyMenuState(value, context);
      return { changed: true, state: value, descriptor };
    },
    set(nextState, context) {
      value = nextState;
      const descriptor = applyMenuState(value, context);
      return { changed: true, state: value, descriptor };
    },
  };
}
