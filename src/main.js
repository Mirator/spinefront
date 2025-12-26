import { COLORS } from './core/constants.js';
import { GameSession } from './core/session.js';
import { bindDomControls } from './input/domControls.js';
import { createRenderer } from './render/renderer.js';
import { MENU_STATES } from './state/machine.js';

const canvas = document.getElementById('game');
const fullscreenButton = document.getElementById('fullscreen-toggle');
const mobileControls = document.querySelector('.mobile-controls');

const session = new GameSession({ width: canvas.width, height: canvas.height });

const renderer = createRenderer({ canvas, colors: COLORS, onReset: () => resetGame() });

if (typeof window !== 'undefined') {
  window.__spinefront = {
    session,
    store: session.store,
    renderer,
    snapshot: () => session.getSnapshot(),
    getSeed: () => session.getState().randomSeed,
    setSeed: (seed, { reset = false } = {}) => {
      const normalized = session.setSeed(seed);
      if (reset) {
        resetGame();
      }
      return normalized;
    },
  };
}

function syncMenuUiState() {
  if (!mobileControls) return;
  const state = session.getState();
  mobileControls.dataset.menuOpen = state.menuOpen ? 'true' : 'false';
  mobileControls.classList.toggle('is-menu-open', state.menuOpen);
}

function resetGame() {
  session.reset();
  syncMenuUiState();
  window.dispatchEvent(new CustomEvent('spinefront:reset'));
  renderer.render(session.getSnapshot());
}

function startFromMenu(reset = false) {
  session.startFromMenu({ reset });
  syncMenuUiState();
  renderer.render(session.getSnapshot());
}

function toggleMenu(reason = 'paused') {
  session.toggleMenu(reason);
  syncMenuUiState();
  renderer.render(session.getSnapshot());
}

const controlsCleanup = bindDomControls({
  applyInput: (update) => session.applyInput(update),
  isEnded: () => session.getState().ended,
  onReset: () => resetGame(),
  isMenuOpen: () => session.getState().menuOpen,
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

  session.resize(canvas.width, canvas.height);
}

let accumulator = 0;
const fixedDelta = 1 / 60;
let last = performance.now();

function loop(now) {
  const frame = Math.min(0.1, (now - last) / 1000);
  last = now;
  const state = session.getState();
  if (state.menuOpen || state.paused) {
    accumulator = 0;
    renderer.render(session.getSnapshot());
    requestAnimationFrame(loop);
    return;
  }
  accumulator += frame;
  while (accumulator >= fixedDelta) {
    session.step(fixedDelta);
    accumulator -= fixedDelta;
  }
  renderer.render(session.getSnapshot());
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

renderer.render(session.getSnapshot());
session.setMenuState(MENU_STATES.INTRO);
syncMenuUiState();
renderer.render(session.getSnapshot());

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

  if (session.getState().menuOpen && pointInRect(x, y, regions.menuStart)) {
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
