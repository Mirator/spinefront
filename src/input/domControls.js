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
    { id: 'control-left', onStart: () => (input.left = true), onEnd: () => (input.left = false), ignoreEnded: true },
    { id: 'control-right', onStart: () => (input.right = true), onEnd: () => (input.right = false), ignoreEnded: true },
    { id: 'control-up', onStart: () => engageUpJump('control-up'), onEnd: () => releaseUpJump('control-up'), ignoreEnded: true },
    { id: 'control-down', onStart: () => (input.down = true), onEnd: () => (input.down = false), ignoreEnded: true },
    { id: 'control-jump', onStart: () => engageUpJump('control-jump'), onEnd: () => releaseUpJump('control-jump'), ignoreEnded: true },
    { id: 'control-attack', onStart: () => (input.attack = true), onEnd: () => (input.attack = false), ignoreEnded: true },
    { id: 'control-interact', onStart: () => (input.interact = true), onEnd: () => (input.interact = false), ignoreEnded: true },
    { id: 'control-restart', onStart: () => onReset(), onEnd: () => {}, autoRelease: true },
  ];

  const touchHandlers = touchControls.map((cfg) => bindTouchControl(cfg, isEnded));

  return () => {
    document.removeEventListener('keydown', keydown);
    document.removeEventListener('keyup', keyup);
    touchHandlers.forEach((cleanup) => cleanup());
  };
}

function bindTouchControl(config, isEnded) {
  const { id, onStart, onEnd, ignoreEnded = false, autoRelease = false } = config;
  const el = document.getElementById(id);
  if (!el) return () => {};
  const handleStart = (e) => {
    e.preventDefault();
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
