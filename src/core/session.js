import { resetInputState } from './input.js';
import { createEnemy } from '../state/entities.js';
import {
  ascendGameStore,
  createGameStore,
  resetGameStore,
  setStoreSeed,
  updateWorldDimensions,
} from '../state/store.js';
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
} from '../systems/combat.js';
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
    enemies: store.state.enemies,
    projectiles: store.state.projectiles,
  };
}

export class GameSession {
  constructor(dimensions = {}) {
    this.store = createGameStore(dimensions);
    this.snapshot = createSnapshot(this.store);
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

  updateMenu(reason = 'paused') {
    const { state } = this.store;
    const islandLine =
      state.island?.bonus?.name && state.island?.bonus?.description
        ? `${state.island.bonus.name}: ${state.island.bonus.description}`
        : 'Hold the line on this island, then ascend.';
    let headline = 'Run paused';
    let detail = islandLine;
    if (reason === 'intro') {
      headline = 'Ready to deploy';
    } else if (reason === 'ended') {
      headline = 'Run complete';
      detail = 'Defeat or victory, regroup and launch a fresh climb.';
    } else if (reason === 'ascend') {
      headline = `Island ${state.islandLevel} cleared`;
      detail = 'Climb to the next sky island with what you have learned.';
    }
    const startLabel = state.pendingAscend
      ? 'Ascend'
      : state.ended || !state.hasStarted
        ? 'Start run'
        : reason === 'paused'
          ? 'Resume run'
          : 'Start run';
    state.menuStatus = headline;
    state.menuMessage = detail;
    state.menuStartLabel = startLabel;
  }

  openMenu(reason = 'paused') {
    const { state } = this.store;
    state.menuOpen = true;
    state.paused = true;
    resetInputState(this.store.input);
    this.updateMenu(reason);
  }

  closeMenu() {
    const { state } = this.store;
    state.menuOpen = false;
    state.paused = false;
    state.hasStarted = true;
    this.updateMenu();
  }

  toggleMenu(reason = 'paused') {
    const { state } = this.store;
    if (state.menuOpen) {
      this.closeMenu();
    } else {
      const nextReason = state.ended ? 'ended' : reason;
      this.openMenu(nextReason);
    }
  }

  reset(options = {}) {
    resetGameStore(this.store, options);
    this.store.state.menuOpen = false;
    this.store.state.paused = false;
    this.store.state.hasStarted = true;
    this.updateMenu('intro');
    return this.getSnapshot();
  }

  ascend() {
    ascendGameStore(this.store);
    this.updateMenu('ascend');
    return this.getSnapshot();
  }

  startFromMenu({ reset = false } = {}) {
    const { state } = this.store;
    if (reset || state.ended || (!state.hasStarted && !state.pendingAscend)) {
      this.reset();
    } else if (state.pendingAscend) {
      this.ascend();
      state.pendingAscend = false;
    }
    this.closeMenu();
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

    const swordCallbacks = {
      onHit: (enemy) => {
        const centerX = enemy.x + enemy.w / 2;
        const centerY = enemy.y + enemy.h / 2;
        addHitFlash(state.effects, centerX, centerY, world.width, world.height, this.store.rng);
        triggerSlowdown(state.effects, 0.18, 0.55);
      },
    };

    const swung = applyInputToPlayer(this.store.player, this.store.input, state, this.store.shrine, this.store.towers);
    if (swung) {
      swingSword(this.store.player, state.enemies, 25, swordCallbacks);
    }

    if (this.store.player.swingTimer > 0) {
      updateSwordCollision(this.store.player, state.enemies, swordCallbacks);
    }

    updatePlayer(this.store.player, world, scaledDt, this.store.shrine);
    updateCamera(this.store.camera, this.store.player, world);
    resolveEnemyAttacks(state.enemies, [...this.store.walls, ...this.store.towers], world, scaledDt, this.store.rng);
    updateTowers(this.store.towers, state.enemies, state.projectiles, state.shrineUnlocked, scaledDt);

    const projectileResults = updateProjectiles(
      state.projectiles,
      state.enemies,
      world,
      state.effects,
      scaledDt,
      this.store.rng,
    );
    state.projectiles = projectileResults.remaining;
    updateEnemySpawns(
      state,
      world,
      (side) => createEnemy(side, world, this.store.towers, state.modifiers),
      scaledDt,
      this.store.rng,
    );
    checkCrownLoss(state.enemies, this.store.player, state, state.effects);
    state.enemies = cleanupEnemies(state.enemies, world);
    updateDayNight(state, world, scaledDt);
    const outcome = checkEndConditions(state, world);
    if (outcome === 'loss' && !state.menuOpen) {
      this.openMenu('ended');
    } else if (outcome === 'ascend' && !state.menuOpen) {
      state.hudText = `Island ${state.islandLevel} cleared. Ascend when ready.`;
      this.openMenu('ascend');
    }

    state.time += scaledDt;
    return { snapshot: this.getSnapshot(), outcome };
  }
}
