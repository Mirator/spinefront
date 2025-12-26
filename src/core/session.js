import { resetInputState } from './input.js';
import { createEnemy } from '../state/entities.js';
import {
  ascendGameStore,
  createGameStore,
  resetGameStore,
  setStoreSeed,
  updateWorldDimensions,
} from '../state/store.js';
import { applyMenuState, createMenuStateMachine, MENU_STATES } from '../state/machine.js';
import { updateCamera } from '../state/camera.js';
import { addHitFlash, triggerSlowdown, updateEffects } from '../systems/effects.js';
import { applyInputToPlayer, updatePlayer } from '../systems/movement.js';
import {
  checkCrownLoss,
  cleanupEnemies,
  resolveEnemyAttacks,
  swingSword,
  updateProjectiles,
  updateSwordCollision,
  updateTowers,
  updateCrownDrop,
} from '../systems/combat.js';
import { applyPlayerAuraHit, updateAuraRecovery } from '../systems/aura.js';
import { updateDayNight, checkEndConditions } from '../systems/cycle.js';
import { updateEnemySpawns } from '../systems/spawning.js';

function createSnapshot(store) {
  return {
    world: store.world,
    camera: store.camera,
    state: store.state,
    player: store.player,
    shrine: store.shrine,
    walls: store.walls,
    towers: store.towers,
    barricades: store.barricades,
    enemies: store.state.enemies,
    projectiles: store.state.projectiles,
    enemyProjectiles: store.state.enemyProjectiles,
  };
}

export class GameSession {
  constructor(dimensions = {}) {
    this.store = createGameStore(dimensions);
    this.snapshot = createSnapshot(this.store);
    this.menuMachine = createMenuStateMachine(MENU_STATES.INTRO);
    applyMenuState(MENU_STATES.INTRO, this.store.state);
  }

  getSnapshot() {
    this.snapshot = createSnapshot(this.store);
    return this.snapshot;
  }

  getState() {
    return this.store.state;
  }

  getInput() {
    return this.store.input;
  }

  applyInput(update) {
    if (typeof update === 'function') {
      update(this.store.input);
    } else if (update && typeof update === 'object') {
      Object.assign(this.store.input, update);
    }
    return this.store.input;
  }

  transitionMenu(event, context = this.store.state) {
    const result = this.menuMachine.transition(event, context);
    if (result.changed && context.menuOpen) {
      resetInputState(this.store.input);
    }
    return result;
  }

  setMenuState(stateValue, context = this.store.state) {
    const result = this.menuMachine.set(stateValue, context);
    if (context.menuOpen) {
      resetInputState(this.store.input);
    }
    return result;
  }

  openMenu() {
    const { state } = this.store;
    const target = state.pendingAscend ? MENU_STATES.ASCEND_READY : state.ended ? MENU_STATES.ENDED : MENU_STATES.PAUSED;
    this.setMenuState(target);
  }

  closeMenu() {
    const { state } = this.store;
    if (state.menuState === MENU_STATES.PAUSED) {
      this.transitionMenu('resume');
    } else if (state.menuState === MENU_STATES.INTRO || state.menuState === MENU_STATES.ASCEND_READY) {
      this.transitionMenu('start');
    } else if (state.menuState === MENU_STATES.ENDED) {
      this.transitionMenu('reset');
      this.transitionMenu('start');
    }
  }

  toggleMenu() {
    const { state } = this.store;
    if (state.menuOpen) {
      this.closeMenu();
    } else if (state.ended) {
      this.transitionMenu('end');
    } else {
      this.transitionMenu('pause');
    }
  }

  reset(options = {}) {
    resetGameStore(this.store, options);
    this.setMenuState(MENU_STATES.INTRO);
    this.transitionMenu('start');
    return this.getSnapshot();
  }

  ascend() {
    ascendGameStore(this.store);
    this.setMenuState(MENU_STATES.ASCEND_READY);
    return this.getSnapshot();
  }

  startFromMenu({ reset = false } = {}) {
    const { state } = this.store;
    if (reset || state.ended) {
      this.reset();
      return;
    }

    if (state.menuState === MENU_STATES.PAUSED) {
      this.transitionMenu('resume');
      return;
    }

    if (state.menuState === MENU_STATES.ASCEND_READY || state.pendingAscend) {
      this.ascend();
      this.transitionMenu('start');
      return;
    }

    if (state.menuState === MENU_STATES.INTRO || !state.hasStarted) {
      this.transitionMenu('start');
      return;
    }

    this.transitionMenu('start');
  }

  setSeed(seed) {
    return setStoreSeed(this.store, seed);
  }

  resize(width, height) {
    updateWorldDimensions(this.store, width, height);
    return this.getSnapshot();
  }

  step(dt) {
    const { state, world } = this.store;
    if (state.menuOpen || state.paused) return { snapshot: this.getSnapshot(), outcome: null };

    updateEffects(state.effects, dt, this.store.rng);
    const scaledDt = dt * state.effects.timeScale;
    if (state.ended) {
      state.paused = true;
      return { snapshot: this.getSnapshot(), outcome: 'ended' };
    }

    updateAuraRecovery(this.store.player, state, this.store.baseWorld, world, scaledDt);

    const handlePlayerHit = () => applyPlayerAuraHit(this.store.player, state);

    const swordCallbacks = {
      onHit: (enemy) => {
        const centerX = enemy.x + enemy.w / 2;
        const centerY = enemy.y + enemy.h / 2;
        addHitFlash(state.effects, centerX, centerY, world.width, world.height, this.store.rng);
        triggerSlowdown(state.effects, 0.18, 0.55);
      },
    };

    const swung = applyInputToPlayer(
      this.store.player,
      this.store.input,
      state,
      this.store.shrine,
      this.store.towers,
      this.store.walls,
      this.store.barricades,
      this.store.world,
    );
    if (swung) {
      swingSword(this.store.player, state.enemies, 25, swordCallbacks);
    }

    if (this.store.player.swingTimer > 0) {
      updateSwordCollision(this.store.player, state.enemies, swordCallbacks);
    }

    updatePlayer(this.store.player, world, scaledDt, this.store.shrine);
    updateCamera(this.store.camera, this.store.player, world);
    resolveEnemyAttacks(
      state.enemies,
      [...this.store.walls, ...this.store.towers, ...this.store.barricades],
      world,
      scaledDt,
      this.store.rng,
      state.enemyProjectiles,
    );
    updateTowers(this.store.towers, state.enemies, state.projectiles, state.shrineTech, scaledDt);

    const projectileResults = updateProjectiles(
      state.projectiles,
      state.enemies,
      [...this.store.walls, ...this.store.towers, ...this.store.barricades],
      this.store.player,
      world,
      state.effects,
      scaledDt,
      this.store.rng,
    );
    state.projectiles = projectileResults.remaining;
    const hostileProjectiles = updateProjectiles(
      state.enemyProjectiles,
      state.enemies,
      [...this.store.walls, ...this.store.towers, ...this.store.barricades],
      this.store.player,
      world,
      state.effects,
      scaledDt,
      this.store.rng,
      handlePlayerHit,
    );
    state.enemyProjectiles = hostileProjectiles.remaining;
    updateEnemySpawns(
      state,
      world,
      (side, enemyType) =>
        createEnemy(side, world, [...this.store.walls, ...this.store.towers], state.modifiers, enemyType),
      scaledDt,
      this.store.rng,
      state.effects,
    );
    checkCrownLoss(state.enemies, this.store.player, state, state.effects, handlePlayerHit);
    updateCrownDrop(state, scaledDt);
    this.store.barricades = this.store.barricades.filter((b) => b.hp > 0);
    state.enemies = cleanupEnemies(state.enemies, world);
    updateDayNight(state, world, scaledDt);
    const outcome = checkEndConditions(state, world);
    if (outcome === 'loss' && !state.menuOpen) {
      this.transitionMenu('end');
    } else if (outcome === 'ascend' && !state.menuOpen) {
      state.hudText = `Island ${state.islandLevel} cleared. Ascend when ready.`;
      this.transitionMenu('ascend');
    }

    state.time += scaledDt;
    return { snapshot: this.getSnapshot(), outcome };
  }
}
