import { COLORS } from './core/constants.js';
import { resetInputState } from './core/input.js';
import { bindDomControls } from './input/domControls.js';
import { createGameStore, resetGameStore, updateWorldDimensions } from './state/store.js';
import { updateCamera } from './state/camera.js';
import { createEnemy } from './state/entities.js';
import { createRenderer } from './render/renderer.js';
import { addHitFlash, triggerScreenShake, triggerSlowdown, updateEffects } from './systems/effects.js';
import { applyInputToPlayer, updatePlayer } from './systems/movement.js';
import {
  checkCrownLoss,
  cleanupEnemies,
  resolveEnemyAttacks,
  swingSword,
  updateSwordCollision,
  updateProjectiles,
  updateTowers,
} from './systems/combat.js';
import { updateDayNight, checkEndConditions } from './systems/cycle.js';
import { updateEnemySpawns } from './systems/spawning.js';

const canvas = document.getElementById('game');
const fullscreenButton = document.getElementById('fullscreen-toggle');
const mobileControls = document.querySelector('.mobile-controls');

const store = createGameStore({ width: canvas.width, height: canvas.height });

const renderer = createRenderer({ canvas, colors: COLORS, onReset: () => resetGame() });

if (typeof window !== 'undefined') {
  window.__spinefront = {
    store,
    renderer,
    snapshot: () => snapshot(),
  };
}

function syncMenuUiState() {
  if (!mobileControls) return;
  mobileControls.dataset.menuOpen = store.state.menuOpen ? 'true' : 'false';
  mobileControls.classList.toggle('is-menu-open', store.state.menuOpen);
}

function resetGame() {
  resetGameStore(store);
  store.state.menuOpen = false;
  store.state.paused = false;
  syncMenuUiState();
  window.dispatchEvent(new CustomEvent('spinefront:reset'));
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
  syncMenuUiState();
  updateMenu(reason);
}

function closeMenu() {
  store.state.menuOpen = false;
  store.state.paused = false;
  store.state.hasStarted = true;
  syncMenuUiState();
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

function isFullscreenActive() {
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}

function refreshFullscreenButton() {
  if (!fullscreenButton) return;
  const active = isFullscreenActive();
  fullscreenButton.textContent = active ? 'Exit fullscreen' : 'Go fullscreen';
  fullscreenButton.setAttribute('aria-pressed', active ? 'true' : 'false');
  fullscreenButton.classList.toggle('active', active);
}

async function toggleFullscreen() {
  try {
    if (isFullscreenActive()) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      }
    } else {
      const target = document.documentElement;
      if (target.requestFullscreen) {
        await target.requestFullscreen({ navigationUI: 'hide' });
      } else if (target.webkitRequestFullscreen) {
        await target.webkitRequestFullscreen();
      }
    }
  } catch (err) {
    console.error('Unable to toggle fullscreen', err);
  } finally {
    refreshFullscreenButton();
    resizeCanvas();
  }
}

fullscreenButton?.addEventListener('click', (event) => {
  event.preventDefault();
  toggleFullscreen();
});

function resizeCanvas() {
  const aspect = 16 / 9;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let targetWidth = Math.round(viewportWidth);
  let targetHeight = Math.round(targetWidth / aspect);

  if (targetHeight > viewportHeight) {
    targetHeight = Math.round(viewportHeight);
    targetWidth = Math.round(targetHeight * aspect);
  }

  const minWidth = 320;
  if (targetWidth < minWidth) {
    targetWidth = minWidth;
    targetHeight = Math.round(targetWidth / aspect);
  }

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  updateWorldDimensions(store, canvas.width, canvas.height);
}

function snapshot() {
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

function gameStep(dt) {
  if (store.state.menuOpen || store.state.paused) return renderer.render(snapshot());
  if (store.state.ended) {
    store.state.paused = true;
    return renderer.render(snapshot());
  }

  const swordCallbacks = {
    onHit: (enemy) => {
      const centerX = enemy.x + enemy.w / 2;
      const centerY = enemy.y + enemy.h / 2;
      addHitFlash(store.state.effects, centerX, centerY, store.world.width, store.world.height);
      triggerScreenShake(store.state.effects, 5, 0.22);
      triggerSlowdown(store.state.effects, 0.18, 0.55);
    },
  };

  const swung = applyInputToPlayer(store.player, store.input, store.state, store.shrine, store.towers);
  if (swung) {
    swingSword(store.player, store.state.enemies, 25, swordCallbacks);
  }

  if (store.player.swingTimer > 0) {
    updateSwordCollision(store.player, store.state.enemies, swordCallbacks);
  }

  updatePlayer(store.player, store.world, dt, store.shrine);
  updateCamera(store.camera, store.player, store.world);
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
document.addEventListener('fullscreenchange', () => {
  refreshFullscreenButton();
  resizeCanvas();
});
document.addEventListener('webkitfullscreenchange', () => {
  refreshFullscreenButton();
  resizeCanvas();
});
resizeCanvas();
refreshFullscreenButton();

renderer.render(snapshot());
openMenu('intro');
updateMenu('intro');

requestAnimationFrame(loop);

window.addEventListener('beforeunload', () => {
  controlsCleanup();
});

function pointInRect(x, y, rect) {
  return rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function handlePointer(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;
  const regions = renderer.getInteractiveRegions();

  if (store.state.menuOpen && pointInRect(x, y, regions.menuStart)) {
    event.preventDefault();
    startFromMenu();
    return;
  }

  if (pointInRect(x, y, regions.menuToggle)) {
    event.preventDefault();
    toggleMenu('paused');
  }
}

canvas.addEventListener('pointerdown', handlePointer);
