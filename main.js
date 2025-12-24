const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const fxLayer = document.getElementById('fx-layer');
const canvasWrap = document.getElementById('canvas-wrap');

const WORLD = {
  width: canvas.width,
  height: canvas.height,
  ground: canvas.height - 80,
  gravity: 1800,
  dayLength: 30, // seconds per day cycle
  nightsToWin: 3,
};

const input = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  sprint: false,
  attack: false,
  interact: false,
};

function createEffectsState() {
  return {
    hitFlashes: [],
    screenShake: { power: 0, duration: 0, baseDuration: 0 },
    shakeOffset: { x: 0, y: 0 },
    vignette: { timer: 0, duration: 0, intensity: 0 },
    slowdown: { timer: 0, duration: 0, minScale: 1 },
    timeScale: 1,
  };
}

const state = {
  time: 0,
  dayTimer: 0,
  isNight: false,
  nightsSurvived: 0,
  currency: 10,
  crownLost: false,
  ended: false,
  shrineUnlocked: false,
  entities: [],
  enemies: [],
  projectiles: [],
  hudText: '',
  waveTimer: 0,
  waveInterval: 0,
  effects: createEffectsState(),
};

const colors = {
  player: '#fbbf24',
  playerEye: '#111827',
  wall: '#9ca3af',
  tower: '#60a5fa',
  enemy: '#f87171',
  shrine: '#34d399',
  crown: '#fcd34d',
};

function createPlayer() {
  return {
    type: 'player',
    x: 120,
    y: WORLD.ground - 40,
    w: 28,
    h: 40,
    vx: 0,
    vy: 0,
    speed: 220,
    sprintSpeed: 340,
    jumpForce: 650,
    onGround: false,
    onLadder: false,
    facing: 1,
    attackCooldown: 0.4,
    attackTimer: 0,
    crown: true,
  };
}

function createWall(x) {
  return {
    type: 'wall',
    x,
    y: WORLD.ground - 60,
    w: 40,
    h: 60,
    hp: 120,
    maxHp: 120,
  };
}

function createTower(x) {
  return {
    type: 'tower',
    x,
    y: WORLD.ground - 90,
    w: 36,
    h: 90,
    hp: 160,
    maxHp: 160,
    fireRate: 1.4,
    fireTimer: 0,
  };
}

function createShrine() {
  return {
    type: 'shrine',
    x: WORLD.width / 2 - 25,
    y: WORLD.ground - 50,
    w: 50,
    h: 50,
  };
}

function createEnemy(side) {
  const spawnPadding = 80;
  const x = side === 'left' ? -spawnPadding : WORLD.width + spawnPadding;
  return {
    type: 'enemy',
    x,
    y: WORLD.ground - 36,
    w: 28,
    h: 36,
    vx: side === 'left' ? 65 : -65,
    speed: 65,
    attack: 12,
    attackRate: 1,
    attackTimer: 0,
    target: null,
    hp: 50,
  };
}

const player = createPlayer();
const shrine = createShrine();
const walls = [createWall(260), createWall(640)];
const towers = [createTower(280), createTower(620)];

state.entities.push(player, shrine, ...walls, ...towers);

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function addHitFlash(x, y) {
  state.effects.hitFlashes.push({
    x: clamp(x / canvas.width, 0, 1),
    y: clamp(y / canvas.height, 0, 1),
    timer: 0.2,
    duration: 0.2,
    angle: Math.random() * 50 - 25,
  });
}

function triggerScreenShake(power = 4, duration = 0.2) {
  const shake = state.effects.screenShake;
  shake.power = Math.max(power, shake.power);
  shake.duration = Math.max(duration, shake.duration);
  shake.baseDuration = Math.max(duration, shake.duration);
}

function triggerSlowdown(duration = 0.35, minScale = 0.6) {
  state.effects.slowdown.timer = duration;
  state.effects.slowdown.duration = duration;
  state.effects.slowdown.minScale = minScale;
  state.effects.timeScale = minScale;
}

function triggerDangerFlash() {
  state.effects.vignette.timer = 0.55;
  state.effects.vignette.duration = 0.55;
  state.effects.vignette.intensity = 0.8;
  triggerSlowdown(0.45, 0.55);
}

function updateEffects(dt) {
  state.effects.hitFlashes = state.effects.hitFlashes
    .map((flash) => ({ ...flash, timer: flash.timer - dt }))
    .filter((flash) => flash.timer > 0);

  const shake = state.effects.screenShake;
  if (shake.duration > 0) {
    const falloff = shake.baseDuration > 0 ? shake.duration / shake.baseDuration : 0;
    const magnitude = shake.power * falloff;
    state.effects.shakeOffset.x = (Math.random() * 2 - 1) * magnitude;
    state.effects.shakeOffset.y = (Math.random() * 2 - 1) * magnitude;
    shake.duration = Math.max(0, shake.duration - dt);
    shake.power = Math.max(0, shake.power * 0.9);
  } else {
    state.effects.shakeOffset.x = 0;
    state.effects.shakeOffset.y = 0;
    shake.power = 0;
    shake.baseDuration = 0;
  }

  const vig = state.effects.vignette;
  if (vig.timer > 0) {
    vig.timer = Math.max(0, vig.timer - dt);
  }

  const slow = state.effects.slowdown;
  if (slow.timer > 0) {
    const progress = 1 - slow.timer / slow.duration;
    state.effects.timeScale = slow.minScale + (1 - slow.minScale) * progress;
    slow.timer = Math.max(0, slow.timer - dt);
  } else {
    state.effects.timeScale = 1;
  }
}

function renderEffects() {
  if (fxLayer) {
    fxLayer.innerHTML = '';
    state.effects.hitFlashes.forEach((flash) => {
      const flashEl = document.createElement('div');
      flashEl.className = 'hit-flash';
      const fade = flash.timer / flash.duration;
      flashEl.style.left = `${flash.x * 100}%`;
      flashEl.style.top = `${flash.y * 100}%`;
      flashEl.style.opacity = fade;
      flashEl.style.transform = `translate(-50%, -50%) rotate(${flash.angle}deg) scale(${1 + (1 - fade) * 0.35})`;
      fxLayer.appendChild(flashEl);
    });

    if (state.effects.vignette.timer > 0) {
      const strength =
        (state.effects.vignette.timer / state.effects.vignette.duration) * state.effects.vignette.intensity;
      const vignetteEl = document.createElement('div');
      vignetteEl.className = 'vignette';
      vignetteEl.style.opacity = strength;
      fxLayer.appendChild(vignetteEl);
    }
  }

  if (canvasWrap) {
    canvasWrap.style.transform = `translate(${state.effects.shakeOffset.x}px, ${state.effects.shakeOffset.y}px)`;
  }
}

function resetEffects() {
  state.effects = createEffectsState();
  if (fxLayer) {
    fxLayer.innerHTML = '';
  }
  if (canvasWrap) {
    canvasWrap.style.transform = 'translate(0px, 0px)';
  }
}

function handleInput(dt) {
  if (state.ended) return;
  player.onLadder = player.x + player.w / 2 > shrine.x - 8 && player.x + player.w / 2 < shrine.x + shrine.w + 8;
  const accel = input.sprint ? player.sprintSpeed : player.speed;
  player.vx = 0;
  if (input.left) {
    player.vx = -accel;
    player.facing = -1;
  } else if (input.right) {
    player.vx = accel;
    player.facing = 1;
  }

  if (player.onLadder && (input.up || input.down)) {
    player.vy = (input.up ? -1 : 1) * 160;
  } else if (player.onGround && input.jump) {
    player.vy = -player.jumpForce;
    player.onGround = false;
  }

  if (input.attack && player.attackTimer <= 0) {
    swingSword();
    player.attackTimer = player.attackCooldown;
  }

  if (input.interact && player.onLadder && !state.shrineUnlocked && state.currency >= 10) {
    state.currency -= 10;
    state.shrineUnlocked = true;
    state.hudText = 'Shrine tech unlocked! Towers shoot faster.';
    towers.forEach((t) => (t.fireRate = Math.max(0.7, t.fireRate * 0.75)));
  }

  player.attackTimer = Math.max(0, player.attackTimer - dt);
}

function swingSword() {
  const arc = { x: player.x + (player.facing > 0 ? player.w : -24), y: player.y, w: 32, h: player.h };
  state.enemies.forEach((enemy) => {
    if (enemy.hp > 0 && overlaps(arc, enemy)) {
      enemy.hp -= 25;
      addHitFlash(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
      triggerScreenShake(4, 0.18);
    }
  });
}

function updatePlayer(dt) {
  if (!player.onLadder) {
    player.vy += WORLD.gravity * dt;
  }

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  player.x = clamp(player.x, 40, WORLD.width - player.w - 40);

  if (player.y + player.h >= WORLD.ground) {
    player.y = WORLD.ground - player.h;
    player.vy = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }
}

function updateEnemies(dt) {
  const targets = [...walls, ...towers];
  state.enemies.forEach((e) => {
    if (e.hp <= 0) return;
    if (!e.target || e.target.hp <= 0) {
      e.target = targets.find((t) => t.hp > 0 && Math.abs(t.x - e.x) < 400);
    }
    if (e.target && e.target.hp > 0) {
      const dir = Math.sign(e.target.x - e.x);
      e.vx = dir * e.speed;
      e.x += e.vx * dt;
      if (overlaps(e, e.target)) {
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          e.target.hp -= e.attack;
          e.attackTimer = 1 / e.attackRate;
        }
      }
    } else {
      e.x += e.vx * dt;
    }
  });
}

function updateTowers(dt) {
  towers.forEach((tower) => {
    if (tower.hp <= 0) return;
    tower.fireTimer -= dt;
    if (tower.fireTimer <= 0) {
      const target = state.enemies.find((e) => e.hp > 0 && Math.abs(e.x - tower.x) < 320);
      if (target) {
        target.hp -= 18;
        tower.fireTimer = tower.fireRate;
        addHitFlash(target.x + target.w / 2, target.y + target.h / 2);
        triggerScreenShake(2.6, 0.14);
      }
    }
  });
}

function spawnEnemies(dt) {
  if (!state.isNight) return;
  state.waveTimer -= dt;
  if (state.waveTimer <= 0) {
    const side = Math.random() > 0.5 ? 'left' : 'right';
    state.enemies.push(createEnemy(side));
    state.waveInterval = Math.max(1.5, 3.5 - state.nightsSurvived);
    state.waveTimer = state.waveInterval;
  }
}

function handleCollisions() {
  let playerHit = false;
  state.enemies.forEach((e) => {
    if (e.hp <= 0) return;
    if (overlaps(e, player)) {
      playerHit = true;
      if (player.crown) {
        player.crown = false;
        state.crownLost = true;
      }
    }
  });

  if (playerHit) {
    triggerDangerFlash();
  }
}

function cleanup() {
  state.enemies = state.enemies.filter((e) => e.hp > 0 && e.x > -120 && e.x < WORLD.width + 120);
}

function updateDayNight(dt) {
  state.dayTimer += dt;
  if (state.dayTimer >= WORLD.dayLength) {
    state.dayTimer = 0;
    state.isNight = !state.isNight;
    if (state.isNight) {
      state.nightsSurvived += 1;
      state.currency += 5;
      state.waveInterval = Math.max(1.5, 3.5 - state.nightsSurvived);
      state.waveTimer = state.waveInterval;
      state.hudText = `Night ${state.nightsSurvived} begins.`;
    } else {
      state.currency += 10;
      state.waveTimer = 0;
      state.waveInterval = 0;
      state.hudText = `Sunrise! You earned income.`;
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const skyTop = state.isNight ? '#0b1221' : '#1e3a8a';
  const skyBottom = state.isNight ? '#0f172a' : '#0b1221';
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, skyTop);
  gradient.addColorStop(1, skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0c3a2f';
  ctx.fillRect(0, WORLD.ground, canvas.width, canvas.height - WORLD.ground);
  ctx.fillStyle = '#164e3b';
  ctx.fillRect(0, WORLD.ground + 26, canvas.width, 16);

  drawShrine();
  drawStructures();
  drawPlayer();
  drawEnemies();
  drawHUD();
}

function drawPlayer() {
  ctx.fillStyle = colors.player;
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.fillStyle = colors.playerEye;
  ctx.fillRect(player.x + (player.facing > 0 ? player.w - 10 : 4), player.y + 10, 6, 6);
  if (player.crown) {
    ctx.fillStyle = colors.crown;
    ctx.fillRect(player.x + player.w / 2 - 8, player.y - 8, 16, 8);
  }
}

function drawStructures() {
  walls.forEach((wall) => {
    ctx.fillStyle = wall.hp > 0 ? colors.wall : '#374151';
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    drawHpBar(wall);
  });
  towers.forEach((tower) => {
    ctx.fillStyle = tower.hp > 0 ? colors.tower : '#1f2937';
    ctx.fillRect(tower.x, tower.y, tower.w, tower.h);
    drawHpBar(tower);
  });
}

function drawShrine() {
  ctx.fillStyle = state.shrineUnlocked ? '#65f2c6' : colors.shrine;
  ctx.fillRect(shrine.x, shrine.y, shrine.w, shrine.h);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(shrine.x + 8, shrine.y + 8, shrine.w - 16, shrine.h - 16);
}

function drawEnemies() {
  state.enemies.forEach((e) => {
    if (e.hp <= 0) return;
    ctx.fillStyle = colors.enemy;
    ctx.fillRect(e.x, e.y, e.w, e.h);
  });
}

function drawHpBar(entity) {
  const ratio = clamp(entity.hp / entity.maxHp, 0, 1);
  ctx.fillStyle = '#111827';
  ctx.fillRect(entity.x, entity.y - 8, entity.w, 6);
  ctx.fillStyle = ratio > 0.5 ? '#34d399' : '#fbbf24';
  ctx.fillRect(entity.x, entity.y - 8, entity.w * ratio, 6);
}

function drawHUD() {
  const hud = document.getElementById('hud');
  hud.innerHTML = '';
  const nearShrine = overlaps(player, { x: shrine.x - 18, y: shrine.y - 18, w: shrine.w + 36, h: shrine.h + 36 });
  const dayRatio = clamp(state.dayTimer / WORLD.dayLength, 0, 1);
  const waveRatio = state.isNight && state.waveInterval > 0 ? clamp(state.waveTimer / state.waveInterval, 0, 1) : 0;

  const cycleTag = document.createElement('span');
  cycleTag.className = 'tag tag-bar';
  cycleTag.innerHTML = `<strong>Cycle:</strong> ${state.isNight ? 'Night' : 'Day'}`;
  const cycleBar = document.createElement('div');
  cycleBar.className = 'progress';
  const cycleFill = document.createElement('div');
  cycleFill.className = 'progress-fill';
  cycleFill.style.width = `${dayRatio * 100}%`;
  cycleBar.appendChild(cycleFill);
  const cycleNote = document.createElement('div');
  cycleNote.className = 'progress-label';
  cycleNote.textContent = `${Math.floor(state.dayTimer)}s / ${WORLD.dayLength}s`;
  cycleBar.appendChild(cycleNote);
  cycleTag.appendChild(cycleBar);
  hud.appendChild(cycleTag);

  if (state.isNight) {
    const waveTag = document.createElement('span');
    waveTag.className = 'tag tag-bar warn';
    waveTag.innerHTML = `<strong>Next wave:</strong> ${Math.max(0, state.waveTimer).toFixed(1)}s`;
    const waveBar = document.createElement('div');
    waveBar.className = 'progress thin';
    const waveFill = document.createElement('div');
    waveFill.className = 'progress-fill warn';
    waveFill.style.width = `${waveRatio * 100}%`;
    waveBar.appendChild(waveFill);
    waveTag.appendChild(waveBar);
    hud.appendChild(waveTag);
  }

  const tags = [
    { label: 'Nights', value: `${state.nightsSurvived}/${WORLD.nightsToWin}` },
    { label: 'Gold', value: state.currency },
    { label: 'Crown', value: player.crown ? 'Safe' : 'Lost' },
    { label: 'Walls', value: walls.map((w) => Math.max(0, Math.floor(w.hp))).join(' / ') },
    { label: 'Towers', value: towers.map((t) => Math.max(0, Math.floor(t.hp))).join(' / ') },
  ];
  tags.forEach((tag) => {
    const el = document.createElement('span');
    el.className = 'tag';
    el.innerHTML = `<strong>${tag.label}:</strong> ${tag.value}`;
    hud.appendChild(el);
  });

  const shrineTag = document.createElement('span');
  shrineTag.className = 'tag';
  if (state.shrineUnlocked) {
    shrineTag.innerHTML = '<strong>Shrine:</strong> Unlocked — towers fire faster';
  } else if (nearShrine) {
    const canBuy = state.currency >= 10;
    shrineTag.innerHTML = `<strong>E:</strong> Unlock shrine (10 gold) — towers fire faster${!canBuy ? ' (need gold)' : ''}`;
  } else {
    shrineTag.innerHTML = '<strong>Shrine:</strong> Locked (approach to unlock)';
  }
  hud.appendChild(shrineTag);

  if (state.hudText) {
    const notice = document.createElement('span');
    notice.className = 'tag';
    notice.textContent = state.hudText;
    hud.appendChild(notice);
  }

  if (state.crownLost) {
    state.ended = true;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f87171';
    ctx.font = '32px Inter, sans-serif';
    ctx.fillText('Crown lost! You were overrun.', canvas.width / 2 - 180, canvas.height / 2);
  } else if (state.nightsSurvived >= WORLD.nightsToWin) {
    state.ended = true;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#34d399';
    ctx.font = '32px Inter, sans-serif';
    ctx.fillText('Victory! Dawn rises and you endure.', canvas.width / 2 - 210, canvas.height / 2);
  }

  if (state.ended) {
    const button = document.createElement('button');
    button.className = 'tag restart';
    button.textContent = 'Restart';
    button.addEventListener('click', resetGame);
    hud.appendChild(button);
  }

  renderEffects();
}

function resetGame() {
  state.time = 0;
  state.dayTimer = 0;
  state.isNight = false;
  state.nightsSurvived = 0;
  state.currency = 10;
  state.crownLost = false;
  state.ended = false;
  state.shrineUnlocked = false;
  state.hudText = '';
  state.waveTimer = 0;
  state.waveInterval = 0;
  state.enemies = [];
  state.projectiles = [];
  resetEffects();
  Object.keys(input).forEach((key) => {
    input[key] = false;
  });

  const freshPlayer = createPlayer();
  Object.assign(player, freshPlayer);
  player.x = freshPlayer.x;
  player.y = freshPlayer.y;

  [walls[0], walls[1]].forEach((wall, idx) => {
    const resetWall = createWall(idx === 0 ? 260 : 640);
    Object.assign(wall, resetWall);
  });
  [towers[0], towers[1]].forEach((tower, idx) => {
    const resetTower = createTower(idx === 0 ? 280 : 620);
    Object.assign(tower, resetTower);
  });
}

function gameStep(dt) {
  if (state.crownLost || state.nightsSurvived >= WORLD.nightsToWin) {
    state.ended = true;
    return draw();
  }
  handleInput(dt);
  updatePlayer(dt);
  updateEnemies(dt);
  updateTowers(dt);
  spawnEnemies(dt);
  handleCollisions();
  cleanup();
  updateDayNight(dt);
  draw();
}

let accumulator = 0;
const fixedDelta = 1 / 60;
let last = performance.now();

function loop(now) {
  const frame = Math.min(0.1, (now - last) / 1000);
  last = now;
  accumulator += frame;
  while (accumulator >= fixedDelta) {
    updateEffects(fixedDelta);
    const scaledDt = fixedDelta * state.effects.timeScale;
    gameStep(scaledDt);
    accumulator -= fixedDelta;
    state.time += scaledDt;
  }
  requestAnimationFrame(loop);
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR') {
    resetGame();
    return;
  }
  if (state.ended) return;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = true;
  if (e.code === 'ArrowUp' || e.code === 'KeyW') input.up = true;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') input.down = true;
  if (e.code === 'Space') input.jump = true;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.sprint = true;
  if (e.code === 'KeyF') input.attack = true;
  if (e.code === 'KeyE') input.interact = true;
});

document.addEventListener('keyup', (e) => {
  if (state.ended) return;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = false;
  if (e.code === 'ArrowUp' || e.code === 'KeyW') input.up = false;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') input.down = false;
  if (e.code === 'Space') input.jump = false;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.sprint = false;
  if (e.code === 'KeyF') input.attack = false;
  if (e.code === 'KeyE') input.interact = false;
});

draw();
requestAnimationFrame(loop);
