import { COLORS } from '../core/constants.js';
import { clamp, lerpColor } from '../systems/math.js';

export function createRenderer({ canvas, fxLayer, canvasWrap, hud, colors = COLORS, onReset }) {
  const ctx = canvas.getContext('2d');

  function renderEffects(effects, world) {
    if (fxLayer) {
      fxLayer.innerHTML = '';
      effects.hitFlashes.forEach((flash) => {
        const flashEl = document.createElement('div');
        flashEl.className = 'hit-flash';
        const fade = flash.timer / flash.duration;
        flashEl.style.left = `${flash.x * 100}%`;
        flashEl.style.top = `${flash.y * 100}%`;
        flashEl.style.opacity = fade;
        flashEl.style.transform = `translate(-50%, -50%) rotate(${flash.angle}deg) scale(${1 + (1 - fade) * 0.35})`;
        fxLayer.appendChild(flashEl);
      });

      if (effects.vignette.timer > 0) {
        const strength = (effects.vignette.timer / effects.vignette.duration) * effects.vignette.intensity;
        const vignetteEl = document.createElement('div');
        vignetteEl.className = 'vignette';
        vignetteEl.style.opacity = strength;
        fxLayer.appendChild(vignetteEl);
      }
    }

    if (canvasWrap) {
      canvasWrap.style.transform = `translate(${effects.shakeOffset.x}px, ${effects.shakeOffset.y}px)`;
    }
  }

  function drawPlayer(ctx, player) {
    ctx.fillStyle = colors.player;
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.fillStyle = colors.playerEye;
    ctx.fillRect(player.x + (player.facing > 0 ? player.w - 10 : 4), player.y + 10, 6, 6);
    if (player.crown) {
      ctx.fillStyle = colors.crown;
      ctx.fillRect(player.x + player.w / 2 - 8, player.y - 8, 16, 8);
    }
  }

  function drawPlayerAttack(ctx, player) {
    if (player.swingTimer <= 0) return;
    const dir = player.swingFacing;
    const progress = 1 - player.swingTimer / player.swingDuration;
    const swingSweep = Math.PI * (0.45 + progress * 0.55);
    const startAngle = dir > 0 ? -Math.PI * 0.65 : Math.PI * 1.65;
    const endAngle = startAngle + swingSweep * dir;
    const cx = player.x + player.w / 2 + dir * (player.w * 0.35);
    const cy = player.y + player.h * 0.55;
    const radius = player.h * 0.95;
    const alpha = 0.2 + 0.6 * progress;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.shadowBlur = 14;
    ctx.shadowColor = `rgba(255, 255, 255, ${alpha})`;
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle, dir < 0);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 8, startAngle, endAngle, dir < 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawHpBar(entity) {
    const ratio = clamp(entity.hp / entity.maxHp, 0, 1);
    ctx.fillStyle = '#111827';
    ctx.fillRect(entity.x, entity.y - 8, entity.w, 6);
    ctx.fillStyle = ratio > 0.5 ? '#34d399' : '#fbbf24';
    ctx.fillRect(entity.x, entity.y - 8, entity.w * ratio, 6);
  }

  function drawStructures(walls, towers) {
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

  function drawShrine(shrine, shrineUnlocked) {
    ctx.fillStyle = shrineUnlocked ? '#65f2c6' : colors.shrine;
    ctx.fillRect(shrine.x, shrine.y, shrine.w, shrine.h);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(shrine.x + 8, shrine.y + 8, shrine.w - 16, shrine.h - 16);
  }

  function drawEnemies(enemies) {
    enemies.forEach((e) => {
      if (e.hp <= 0) return;
      ctx.fillStyle = colors.enemy;
      ctx.fillRect(e.x, e.y, e.w, e.h);
    });
  }

  function drawProjectiles(projectiles) {
    ctx.save();
    ctx.lineCap = 'round';
    projectiles.forEach((p) => {
      const tailX = p.x - p.vx * 0.05;
      const tailY = p.y - p.vy * 0.05;
      const gradient = ctx.createLinearGradient(tailX, tailY, p.x, p.y);
      gradient.addColorStop(0, `${p.color}40`);
      gradient.addColorStop(1, p.color);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = p.radius * 2;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawCelestials(state, world) {
    const phase = clamp(state.dayTimer / world.dayLength, 0, 1);
    const arcHeight = 120;
    const minX = 60;
    const maxX = canvas.width - 60;

    if (!state.isNight) {
      const sunX = clamp(minX + (maxX - minX) * phase, minX, maxX);
      const sunY = 120 - Math.sin(phase * Math.PI) * arcHeight;
      const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 70);
      glow.addColorStop(0, 'rgba(251, 191, 36, 0.9)');
      glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 70, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fcd34d';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 18, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const moonX = clamp(maxX - (maxX - minX) * phase, minX, maxX);
      const moonY = 130 - Math.sin(phase * Math.PI) * arcHeight;
      const glow = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 80);
      glow.addColorStop(0, 'rgba(96, 165, 250, 0.8)');
      glow.addColorStop(1, 'rgba(96, 165, 250, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 80, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e5e7eb';
      ctx.beginPath();
      ctx.arc(moonX, moonY, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0c1324';
      ctx.beginPath();
      ctx.arc(moonX + 6, moonY - 2, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHUD(snapshot) {
    const { state, world, player, shrine } = snapshot;
    hud.innerHTML = '';
    const nearShrine = player.x + player.w > shrine.x - 18 && player.x < shrine.x + shrine.w + 18;
    const dayRatio = clamp(state.dayTimer / world.dayLength, 0, 1);
    const waveRatio = state.isNight && state.waveInterval > 0 ? clamp(state.waveTimer / state.waveInterval, 0, 1) : 0;

    const cycleTag = document.createElement('span');
    cycleTag.className = 'tag tag-bar';
    cycleTag.innerHTML = `<strong>Cycle:</strong> ${state.isNight ? 'Night' : 'Day'}`;
    const cycleBar = document.createElement('div');
    cycleBar.className = 'progress';
    const cycleFill = document.createElement('div');
    cycleFill.className = 'progress-fill';
    cycleFill.style.width = `${dayRatio * 100}%`;
    const cycleDayColor = lerpColor('#fbbf24', '#22d3ee', state.skyBlend);
    const cycleNightColor = lerpColor('#0ea5e9', '#6366f1', state.skyBlend);
    cycleFill.style.background = `linear-gradient(90deg, ${cycleDayColor}, ${cycleNightColor})`;
    cycleBar.appendChild(cycleFill);
    const cycleNote = document.createElement('div');
    cycleNote.className = 'progress-label';
    cycleNote.textContent = `${Math.floor(state.dayTimer)}s / ${world.dayLength}s`;
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
      { label: 'Nights', value: `${state.nightsSurvived}/${world.nightsToWin}` },
      { label: 'Gold', value: state.currency },
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

    if (state.ended) {
      const button = document.createElement('button');
      button.className = 'tag restart';
      button.textContent = 'Restart';
      button.onclick = onReset;
      hud.appendChild(button);
    }
  }

  function draw(snapshot) {
    const { world, state, player, shrine, walls, towers, enemies, projectiles } = snapshot;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const skyTop = lerpColor('#78bef5', '#0c1324', state.skyBlend);
    const skyBottom = lerpColor('#1e3a8a', '#0f172a', state.skyBlend);
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, skyTop);
    gradient.addColorStop(1, skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const duskStrength = 1 - Math.abs(0.5 - state.skyBlend) * 1.8;
    if (duskStrength > 0) {
      const dusk = ctx.createLinearGradient(0, 0, 0, canvas.height);
      dusk.addColorStop(0, `rgba(252, 211, 77, ${0.18 * duskStrength})`);
      dusk.addColorStop(1, `rgba(79, 70, 229, ${0.25 * duskStrength})`);
      ctx.fillStyle = dusk;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    drawCelestials(state, world);

    ctx.fillStyle = lerpColor('#115e38', '#0b3323', state.skyBlend);
    ctx.fillRect(0, world.ground, canvas.width, canvas.height - world.ground);
    ctx.fillStyle = lerpColor('#1d7048', '#124030', state.skyBlend);
    ctx.fillRect(0, world.ground + 26, canvas.width, 16);

    drawShrine(shrine, state.shrineUnlocked);
    drawStructures(walls, towers);
    drawEnemies(enemies);
    drawProjectiles(projectiles);
    drawPlayer(ctx, player);
    drawPlayerAttack(ctx, player);
    if (state.crownLost || state.nightsSurvived >= world.nightsToWin) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = state.crownLost ? '#f87171' : '#34d399';
      ctx.font = '32px Inter, sans-serif';
      const message = state.crownLost
        ? 'Crown lost! You were overrun.'
        : 'Victory! Dawn rises and you endure.';
      ctx.fillText(message, canvas.width / 2 - 210, canvas.height / 2);
    }
    drawHUD(snapshot);
    renderEffects(state.effects, world);
  }

  return { render: draw };
}
