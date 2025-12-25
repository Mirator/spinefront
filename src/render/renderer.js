import { COLORS } from '../core/constants.js';
import { clamp, lerpColor } from '../systems/math.js';

function drawRoundedRect(ctx, x, y, w, h, r = 12) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function createRenderer({ canvas, colors = COLORS }) {
  const ctx = canvas.getContext('2d');
  const interactiveRegions = {
    menuToggle: null,
    menuStart: null,
  };

  function drawPlayer(player) {
    ctx.fillStyle = colors.player;
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.fillStyle = colors.playerEye;
    ctx.fillRect(player.x + (player.facing > 0 ? player.w - 10 : 4), player.y + 10, 6, 6);
    if (player.crown) {
      ctx.fillStyle = colors.crown;
      ctx.fillRect(player.x + player.w / 2 - 8, player.y - 8, 16, 8);
    }
  }

  function drawPlayerAttack(player) {
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

  function drawHitFlashes(effects, world) {
    if (!effects.hitFlashes.length) return;
    ctx.save();
    effects.hitFlashes.forEach((flash) => {
      const fade = clamp(flash.timer / flash.duration, 0, 1);
      const x = flash.x * world.width;
      const y = flash.y * world.height;
      ctx.globalAlpha = fade;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.ellipse(x, y, 12, 4, (flash.angle * Math.PI) / 180, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawVignette(effects) {
    if (effects.vignette.timer <= 0) return;
    const strength = (effects.vignette.timer / effects.vignette.duration) * effects.vignette.intensity;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.max(canvas.width, canvas.height) * 0.75;
    const gradient = ctx.createRadialGradient(cx, cy, radius * 0.25, cx, cy, radius);
    gradient.addColorStop(0, 'rgba(248, 113, 113, 0)');
    gradient.addColorStop(1, 'rgba(248, 113, 113, 0.55)');
    ctx.save();
    ctx.globalAlpha = strength;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  function drawHUD(snapshot) {
    const { state, world, player, shrine } = snapshot;
    const nearShrine = player.x + player.w > shrine.x - 18 && player.x < shrine.x + shrine.w + 18;
    const hudLines = [
      `Nights: ${state.nightsSurvived}/${world.nightsToWin}`,
      `Gold: ${state.currency}`,
    ];
    const shrineLine = state.shrineUnlocked
      ? 'Shrine: Unlocked — towers fire faster'
      : nearShrine
        ? `E: Unlock shrine (10 gold)${state.currency < 10 ? ' — need gold' : ''}`
        : 'Shrine: Locked (approach to unlock)';
    hudLines.push(shrineLine);
    if (state.hudText) {
      hudLines.push(state.hudText);
    }

    ctx.save();
    const padding = 12;
    const maxWidth = 280;
    const lineHeight = 18;
    const blockHeight = padding * 2 + hudLines.length * lineHeight;
    const x = canvas.width - maxWidth - 12;
    const y = 12;
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    drawRoundedRect(ctx, x, y, maxWidth, blockHeight, 10);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '14px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'top';
    hudLines.forEach((line, idx) => {
      ctx.fillText(line, x + padding, y + padding + idx * lineHeight);
    });
    ctx.restore();
  }

  function drawHelpBar() {
    ctx.save();
    ctx.font = '13px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(229, 231, 235, 0.9)';
    const text =
      'Move: A/D or ←/→ | Jump: Space | Ladder: W/S or ↑/↓ | Sprint: Shift | Attack: F | Interact: E | Restart: R | Menu: Esc';
    ctx.fillText(text, canvas.width / 2, canvas.height - 12);
    ctx.restore();
  }

  function drawMenuToggle(state) {
    const paddingX = 12;
    const paddingY = 9;
    const text = state.menuOpen ? 'Close menu' : 'Menu';
    ctx.save();
    ctx.font = '14px Inter, system-ui, sans-serif';
    const textWidth = ctx.measureText(text).width;
    const w = textWidth + paddingX * 2;
    const h = 34;
    const x = 14;
    const y = 14;
    interactiveRegions.menuToggle = { x, y, w, h };
    ctx.fillStyle = 'rgba(17, 24, 39, 0.8)';
    ctx.strokeStyle = state.menuOpen ? 'rgba(251, 191, 36, 0.8)' : 'rgba(59, 130, 246, 0.65)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = state.menuOpen ? '#fbbf24' : '#bfdbfe';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + paddingX, y + h / 2);
    ctx.restore();
  }

  function drawMenuOverlay(snapshot) {
    const { state } = snapshot;
    if (!state.menuOpen) {
      interactiveRegions.menuStart = null;
      return;
    }
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const panelWidth = Math.min(520, canvas.width - 40);
    const panelHeight = 260;
    const panelX = (canvas.width - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;

    ctx.fillStyle = 'rgba(17, 24, 39, 0.9)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, panelX, panelY, panelWidth, panelHeight, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText((state.menuStatus || 'Run paused').toUpperCase(), panelX + 18, panelY + 16);

    ctx.fillStyle = '#e5e7eb';
    ctx.font = '22px Inter, system-ui, sans-serif';
    ctx.fillText('Hold the Outpost', panelX + 18, panelY + 36);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px Inter, system-ui, sans-serif';
    const message = state.menuMessage || 'Survive 3 nights, defend the crown, and unlock the shrine.';
    ctx.fillText(message, panelX + 18, panelY + 64);

    ctx.font = '13px Inter, system-ui, sans-serif';
    const items = [
      'Win by surviving 3 nights.',
      'Keep walls and towers standing to slow the horde.',
      'Unlock shrine tech for 10 gold to speed up tower fire rate.',
      'Income arrives at dawn (+10) and at the start of each night (+5).',
    ];
    items.forEach((line, idx) => {
      ctx.fillText(`• ${line}`, panelX + 18, panelY + 96 + idx * 18);
    });

    const startLabel = state.menuStartLabel || 'Start run';
    const buttonWidth = Math.max(190, ctx.measureText(startLabel).width + 32);
    const buttonHeight = 42;
    const buttonX = panelX + panelWidth - buttonWidth - 18;
    const buttonY = panelY + panelHeight - buttonHeight - 18;
    interactiveRegions.menuStart = { x: buttonX, y: buttonY, w: buttonWidth, h: buttonHeight };
    ctx.fillStyle = 'rgba(59, 130, 246, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    drawRoundedRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f9fafb';
    ctx.textBaseline = 'middle';
    ctx.fillText(startLabel, buttonX + 16, buttonY + buttonHeight / 2);

    ctx.fillStyle = '#e5e7eb';
    const actions = [
      'Open/close menu: Esc',
      'Restart: R',
      'Mobile: Drag left pad to move/up/down',
      'Mobile: Right buttons: Jump / Attack / Interact',
    ];
    actions.forEach((line, idx) => {
      ctx.fillText(line, panelX + 18, panelY + 178 + idx * 18);
    });
    ctx.restore();
  }

  function drawOutcome(state, world) {
    if (!state.ended) return;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = state.crownLost ? '#f87171' : '#34d399';
    ctx.font = '28px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const message = state.crownLost ? 'Crown lost! You were overrun.' : 'Victory! Dawn rises and you endure.';
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    ctx.font = '16px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#e5e7eb';
    const sub = 'Press Enter to continue or R to restart';
    ctx.fillText(sub, canvas.width / 2, canvas.height / 2 + 28);
    ctx.restore();
  }

  function drawBackground(state, world) {
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
  }

  function draw(snapshot) {
    const { world, state, player, shrine, walls, towers, enemies, projectiles } = snapshot;

    // World layer (shaken)
    ctx.save();
    ctx.translate(state.effects.shakeOffset.x, state.effects.shakeOffset.y);
    drawBackground(state, world);
    drawShrine(shrine, state.shrineUnlocked);
    drawStructures(walls, towers);
    drawEnemies(enemies);
    drawProjectiles(projectiles);
    drawPlayer(player);
    drawPlayerAttack(player);
    drawHitFlashes(state.effects, world);
    drawVignette(state.effects);
    ctx.restore();

    // UI layer (stable)
    drawHUD(snapshot);
    drawMenuToggle(state);
    drawHelpBar();
    drawOutcome(state, world);
    drawMenuOverlay(snapshot);
  }

  function getInteractiveRegions() {
    return { ...interactiveRegions };
  }

  return { render: draw, getInteractiveRegions };
}
