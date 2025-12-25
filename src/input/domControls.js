export function bindDomControls({ input, isEnded, onReset, isMenuOpen = () => false, onStart, onToggleMenu }) {
  const upJumpSources = new Set();

  const engageUpJump = (source) => {
    upJumpSources.add(source);
    input.up = true;
    input.jump = true;
  };

  const releaseUpJump = (source) => {
    upJumpSources.delete(source);
    const active = upJumpSources.size > 0;
    input.up = active;
    input.jump = active;
  };

  const keydown = (e) => {
    if (e.code === 'Escape' && typeof onToggleMenu === 'function') {
      onToggleMenu();
      return;
    }
    if (isMenuOpen()) {
      if ((e.code === 'Enter' || e.code === 'Space') && typeof onStart === 'function') {
        onStart();
      }
      return;
    }
    if (e.code === 'KeyR') {
      onReset();
      return;
    }
    if (isEnded()) return;
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
      engageUpJump(e.code);
      return;
    }
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') input.down = true;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.sprint = true;
    if (e.code === 'KeyF') input.attack = true;
    if (e.code === 'KeyE') input.interact = true;
  };

  const keyup = (e) => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
      releaseUpJump(e.code);
      return;
    }
    if (isEnded()) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') input.down = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.sprint = false;
    if (e.code === 'KeyF') input.attack = false;
    if (e.code === 'KeyE') input.interact = false;
  };

  document.addEventListener('keydown', keydown);
  document.addEventListener('keyup', keyup);

  const touchControls = [
    { id: 'control-jump', onStart: () => engageUpJump('control-jump'), onEnd: () => releaseUpJump('control-jump'), ignoreEnded: true },
    { id: 'control-attack', onStart: () => (input.attack = true), onEnd: () => (input.attack = false), ignoreEnded: true },
    { id: 'control-interact', onStart: () => (input.interact = true), onEnd: () => (input.interact = false), ignoreEnded: true },
  ];

  const touchHandlers = touchControls.map((cfg) => bindTouchControl(cfg, isEnded, isMenuOpen));
  const joystickCleanup = bindVirtualJoystick({
    id: 'control-joystick',
    onMove: (dir) => {
      input.left = dir.left;
      input.right = dir.right;
      input.up = dir.up;
      input.down = dir.down;
    },
    onEnd: () => {
      input.left = false;
      input.right = false;
      input.up = false;
      input.down = false;
    },
    isEnded,
    isMenuOpen,
  });

  return () => {
    document.removeEventListener('keydown', keydown);
    document.removeEventListener('keyup', keyup);
    touchHandlers.forEach((cleanup) => cleanup());
    joystickCleanup();
  };
}

function bindTouchControl(config, isEnded, isMenuOpen = () => false) {
  const { id, onStart, onEnd, ignoreEnded = false, autoRelease = false } = config;
  const el = document.getElementById(id);
  if (!el) return () => {};

  const menuOpen = () => Boolean(isMenuOpen && isMenuOpen());

  const handleStart = (e) => {
    e.preventDefault();
    if (menuOpen()) {
      el.classList.remove('pressed');
      return;
    }
    if (ignoreEnded && isEnded()) return;
    el.classList.add('pressed');
    if (typeof onStart === 'function') onStart();
    if (autoRelease) {
      setTimeout(() => el.classList.remove('pressed'), 140);
    }
  };
  const handleEnd = (e) => {
    e.preventDefault();
    el.classList.remove('pressed');
    if (menuOpen()) return;
    if (typeof onEnd === 'function') onEnd();
  };

  el.addEventListener('touchstart', handleStart, { passive: false });
  el.addEventListener('touchend', handleEnd, { passive: false });
  el.addEventListener('touchcancel', handleEnd, { passive: false });
  el.addEventListener('pointerdown', handleStart);
  el.addEventListener('pointerup', handleEnd);
  el.addEventListener('pointercancel', handleEnd);

  return () => {
    el.removeEventListener('touchstart', handleStart);
    el.removeEventListener('touchend', handleEnd);
    el.removeEventListener('touchcancel', handleEnd);
    el.removeEventListener('pointerdown', handleStart);
    el.removeEventListener('pointerup', handleEnd);
    el.removeEventListener('pointercancel', handleEnd);
  };
}

function bindVirtualJoystick({ id, onMove, onEnd, isEnded = () => false, isMenuOpen = () => false }) {
  const el = document.getElementById(id);
  if (!el) return () => {};

  const threshold = 18;
  const resetDirections = () => {
    if (typeof onEnd === 'function') onEnd();
  };

  let active = false;
  let startX = 0;
  let startY = 0;

  const updateFromDelta = (dx, dy) => {
    const dir = {
      left: dx < -threshold,
      right: dx > threshold,
      up: dy < -threshold,
      down: dy > threshold,
    };
    if (typeof onMove === 'function') onMove(dir);
  };

  const handleStart = (e) => {
    if (e.cancelable) e.preventDefault();
    if (isMenuOpen()) return;
    if (isEnded()) return;
    const point = e.touches ? e.touches[0] : e;
    startX = point.clientX;
    startY = point.clientY;
    active = true;
    el.classList.add('pressed');
    updateFromDelta(0, 0);
  };

  const handleMove = (e) => {
    if (e.cancelable) e.preventDefault();
    if (!active) return;
    if (isMenuOpen()) {
      el.classList.remove('pressed');
      active = false;
      return resetDirections();
    }
    const point = e.touches ? e.touches[0] : e;
    const dx = point.clientX - startX;
    const dy = point.clientY - startY;
    updateFromDelta(dx, dy);
  };

  const handleEnd = () => {
    if (!active) return;
    active = false;
    el.classList.remove('pressed');
    resetDirections();
  };

  el.addEventListener('touchstart', handleStart, { passive: false });
  el.addEventListener('touchmove', handleMove, { passive: false });
  el.addEventListener('touchend', handleEnd);
  el.addEventListener('touchcancel', handleEnd);
  el.addEventListener('pointerdown', handleStart);
  el.addEventListener('pointermove', handleMove);
  el.addEventListener('pointerup', handleEnd);
  el.addEventListener('pointercancel', handleEnd);
  el.addEventListener('lostpointercapture', handleEnd);

  return () => {
    el.removeEventListener('touchstart', handleStart);
    el.removeEventListener('touchmove', handleMove);
    el.removeEventListener('touchend', handleEnd);
    el.removeEventListener('touchcancel', handleEnd);
    el.removeEventListener('pointerdown', handleStart);
    el.removeEventListener('pointermove', handleMove);
    el.removeEventListener('pointerup', handleEnd);
    el.removeEventListener('pointercancel', handleEnd);
    el.removeEventListener('lostpointercapture', handleEnd);
  };
}
