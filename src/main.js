import { COLORS } from './core/constants.js';
import { resetInputState } from './core/input.js';
import { bindDomControls } from './input/domControls.js';
import { createGameStore, resetGameStore, updateWorldDimensions } from './state/store.js';
import { createEnemy } from './state/entities.js';
import { createRenderer } from './render/renderer.js';
import { addHitFlash, triggerScreenShake, updateEffects } from './systems/effects.js';
import { applyInputToPlayer, updatePlayer } from './systems/movement.js';
import {
  checkCrownLoss,
  cleanupEnemies,
  resolveEnemyAttacks,
  swingSword,
  updateProjectiles,
  updateTowers,
} from './systems/combat.js';
import { updateDayNight, checkEndConditions } from './systems/cycle.js';
import { updateEnemySpawns } from './systems/spawning.js';

const canvas = document.getElementById('game');

const store = createGameStore({ width: canvas.width, height: canvas.height });

const renderer = createRenderer({ canvas, colors: COLORS, onReset: () => resetGame() });

function resetGame() {
  resetGameStore(store);
  store.state.menuOpen = false;
  store.state.paused = false;
  renderer.render(snapshot());
}

function updateMenu(reason = 'paused') {
  const headline = reason === 'intro' ? 'Ready to deploy' : reason === 'ended' ? 'Run complete' : 'Run paused';
  const detail =
    reason === 'ended'
      ? 'Victory or defeat, regroup and launch a fresh run.'
      : 'Survive 3 nights, defend the crown, and unlock the shrine for faster towers.';
  const startLabel =
    store.state.ended || !store.state.hasStarted ? 'Start run' : reason === 'paused' ? 'Resume run' : 'Start run';
  store.state.menuStatus = headline;
  store.state.menuMessage = detail;
  store.state.menuStartLabel = startLabel;
}

function openMenu(reason = 'paused') {
  store.state.menuOpen = true;
  store.state.paused = true;
  resetInputState(store.input);
  updateMenu(reason);
}

function closeMenu() {
  store.state.menuOpen = false;
  store.state.paused = false;
  store.state.hasStarted = true;
  updateMenu();
}

function startFromMenu(reset = false) {
  if (reset || store.state.ended || !store.state.hasStarted) {
    resetGame();
  }
  closeMenu();
}

function toggleMenu(reason = 'paused') {
  if (store.state.menuOpen) {
    closeMenu();
  } else {
    const nextReason = store.state.ended ? 'ended' : reason;
    openMenu(nextReason);
  }
}

const controlsCleanup = bindDomControls({
  input: store.input,
  isEnded: () => store.state.ended,
  onReset: () => resetGame(),
  isMenuOpen: () => store.state.menuOpen,
  onStart: () => startFromMenu(),
  onToggleMenu: () => toggleMenu('paused'),
});

function handlePointer(event) {
  const regions = renderer.getInteractiveRegions();
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  const inside = (rect) => rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;

  if (inside(regions.menuToggle)) {
    toggleMenu('paused');
    return;
  }

  if (store.state.menuOpen && inside(regions.menuStart)) {
    startFromMenu();
  }
}

function resizeCanvas() {
  const maxWidth = window.innerWidth - 20;
  const maxHeight = window.innerHeight - 20;
  const basedOnHeight = Math.round(maxHeight * (16 / 9));
  const targetWidth = Math.max(320, Math.min(Math.round(maxWidth), basedOnHeight));
  const targetHeight = Math.round(targetWidth * (9 / 16));

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  updateWorldDimensions(store, canvas.width, canvas.height);
}

function snapshot() {
  return {
    world: store.world,
    state: store.state,
    player: store.player,
    shrine: store.shrine,
    walls: store.walls,
    towers: store.towers,
    enemies: store.state.enemies,
    projectiles: store.state.projectiles,
  };
}

function gameStep(dt) {
  if (store.state.menuOpen || store.state.paused) return renderer.render(snapshot());
  if (store.state.ended) {
    store.state.paused = true;
    return renderer.render(snapshot());
  }

  const swung = applyInputToPlayer(store.player, store.input, store.state, store.shrine, store.towers);
  if (swung) {
    swingSword(store.player, store.state.enemies, 25, {
      onHit: (enemy) => {
        const centerX = enemy.x + enemy.w / 2;
        const centerY = enemy.y + enemy.h / 2;
        addHitFlash(store.state.effects, centerX, centerY, store.world.width, store.world.height);
        triggerScreenShake(store.state.effects, 4, 0.18);
      },
    });
  }

  updatePlayer(store.player, store.world, dt);
  resolveEnemyAttacks(store.state.enemies, [...store.walls, ...store.towers], dt);
  updateTowers(store.towers, store.state.enemies, store.state.projectiles, store.state.shrineUnlocked, dt);

  const projectileResults = updateProjectiles(store.state.projectiles, store.state.enemies, store.world, store.state.effects, dt);
  store.state.projectiles = projectileResults.remaining;
  updateEnemySpawns(store.state, store.world, (side) => createEnemy(side, store.world), dt);
  checkCrownLoss(store.state.enemies, store.player, store.state, store.state.effects);
  store.state.enemies = cleanupEnemies(store.state.enemies, store.world);
  updateDayNight(store.state, store.world, dt);
  checkEndConditions(store.state, store.world);
  if (store.state.ended && !store.state.menuOpen) {
    openMenu('ended');
  }
  renderer.render(snapshot());
}

let accumulator = 0;
const fixedDelta = 1 / 60;
let last = performance.now();

function loop(now) {
  const frame = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (store.state.menuOpen || store.state.paused) {
    accumulator = 0;
    renderer.render(snapshot());
    requestAnimationFrame(loop);
    return;
  }
  accumulator += frame;
  while (accumulator >= fixedDelta) {
    updateEffects(store.state.effects, fixedDelta);
    const scaledDt = fixedDelta * store.state.effects.timeScale;
    gameStep(scaledDt);
    accumulator -= fixedDelta;
    store.state.time += scaledDt;
  }
  requestAnimationFrame(loop);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

renderer.render(snapshot());
openMenu('intro');
updateMenu('intro');

requestAnimationFrame(loop);

window.addEventListener('beforeunload', () => {
  controlsCleanup();
});

canvas.addEventListener('pointerdown', handlePointer);
