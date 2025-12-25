import { COLORS, ECONOMY } from '../core/constants.js';
import { clamp, hexToRgb, lerpColor } from '../systems/math.js';

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

function shadeColor(hex, factor) {
  const { r, g, b } = hexToRgb(hex);
  const f = clamp(factor, -1, 1);
  const adjust = (c) => {
    const value = f >= 0 ? c + (255 - c) * f : c + c * f;
    return clamp(Math.round(value), 0, 255);
  };
  return `rgb(${adjust(r)}, ${adjust(g)}, ${adjust(b)})`;
}

const shrineCostText = () => `${ECONOMY.shrineCost} gold`;
const shrineHelpCopy = () => `Unlock shrine tech for ${shrineCostText()} to speed up tower fire rate.`;

export function createRenderer({ canvas, colors = COLORS }) {
  const ctx = canvas.getContext('2d');
  const interactiveRegions = {
    menuToggle: null,
    menuStart: null,
  };
  const mobileQueries = [
    '(max-width: 640px)',
    '(pointer: coarse) and (orientation: landscape) and (max-height: 520px)',
  ];

  const isTouchViewport = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return mobileQueries.some((query) => window.matchMedia(query).matches);
  };

  function drawPlayer(player) {
    const bodyX = player.x;
    const bodyY = player.y;
    const bodyW = player.w;
    const bodyH = player.h;
    const facingRight = player.facing > 0;
    const baseColor = colors.player;
    const accent = shadeColor(baseColor, 0.22);
    const outline = shadeColor(baseColor, -0.28);

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(bodyX + bodyW / 2, bodyY + bodyH + 6, bodyW * 0.45, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    const bodyGradient = ctx.createLinearGradient(bodyX, bodyY, bodyX, bodyY + bodyH);
    bodyGradient.addColorStop(0, accent);
    bodyGradient.addColorStop(1, baseColor);
    ctx.fillStyle = bodyGradient;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, bodyX, bodyY, bodyW, bodyH, 14);
    ctx.fill();
    ctx.stroke();

    const visorWidth = bodyW * 0.42;
    const visorHeight = 10;
    const visorX = facingRight ? bodyX + bodyW - visorWidth - 6 : bodyX + 6;
    const visorY = bodyY + bodyH * 0.32;
    ctx.fillStyle = 'rgba(17, 24, 39, 0.9)';
    drawRoundedRect(ctx, visorX, visorY, visorWidth, visorHeight, 5);
    ctx.fill();

    const visorGlow = ctx.createLinearGradient(visorX, visorY, visorX + visorWidth, visorY);
    visorGlow.addColorStop(facingRight ? 0 : 1, 'rgba(255,255,255,0.35)');
    visorGlow.addColorStop(facingRight ? 1 : 0, 'rgba(255,255,255,0)');
    ctx.fillStyle = visorGlow;
    drawRoundedRect(ctx, visorX, visorY, visorWidth, visorHeight, 5);
    ctx.fill();

    ctx.fillStyle = colors.playerEye;
    const eyeSize = 6;
    const eyeX = facingRight ? visorX + visorWidth - eyeSize - 6 : visorX + 6;
    ctx.fillRect(eyeX, visorY + 2, eyeSize, eyeSize);

    const beltY = bodyY + bodyH * 0.64;
    ctx.fillStyle = shadeColor(baseColor, -0.12);
    ctx.fillRect(bodyX + 4, beltY, bodyW - 8, 6);

    ctx.fillStyle = shadeColor(baseColor, 0.35);
    drawRoundedRect(
      ctx,
      bodyX + (facingRight ? bodyW * 0.55 : bodyW * 0.2),
      bodyY + bodyH * 0.08,
      bodyW * 0.28,
      10,
      4,
    );
    ctx.fill();

    if (player.crown) {
      const crownBase = colors.crown;
      const crownX = bodyX + bodyW / 2 - 12;
      const crownY = bodyY - 12;
      ctx.fillStyle = shadeColor(crownBase, -0.1);
      drawRoundedRect(ctx, crownX, crownY + 6, 24, 8, 3);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(crownX, crownY + 8);
      ctx.lineTo(crownX + 6, crownY);
      ctx.lineTo(crownX + 12, crownY + 8);
      ctx.lineTo(crownX + 18, crownY);
      ctx.lineTo(crownX + 24, crownY + 8);
      ctx.closePath();
      ctx.fillStyle = crownBase;
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(crownX + 12, crownY + 6, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
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

  function drawWall(wall) {
    const baseColor = wall.hp > 0 ? colors.wall : '#4b5563';
    const highlight = shadeColor(baseColor, 0.18);
    const shadow = shadeColor(baseColor, -0.18);
    ctx.save();
    const gradient = ctx.createLinearGradient(wall.x, wall.y, wall.x, wall.y + wall.h);
    gradient.addColorStop(0, highlight);
    gradient.addColorStop(1, baseColor);
    ctx.fillStyle = gradient;
    drawRoundedRect(ctx, wall.x, wall.y, wall.w, wall.h, 6);
    ctx.fill();
    ctx.strokeStyle = shadow;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.12)';
    ctx.lineWidth = 1;
    const brickHeight = 10;
    for (let y = wall.y + brickHeight; y < wall.y + wall.h; y += brickHeight) {
      ctx.beginPath();
      ctx.moveTo(wall.x + 4, y);
      ctx.lineTo(wall.x + wall.w - 4, y);
      ctx.stroke();
    }
    ctx.restore();
    drawHpBar(wall);
  }

  function drawTower(tower) {
    const baseColor = tower.hp > 0 ? colors.tower : '#1f2937';
    const highlight = shadeColor(baseColor, 0.2);
    const shadow = shadeColor(baseColor, -0.2);
    ctx.save();

    ctx.globalAlpha = 0.28;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(tower.x + tower.w / 2, tower.y + tower.h + 6, tower.w * 0.55, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    const gradient = ctx.createLinearGradient(tower.x, tower.y, tower.x, tower.y + tower.h);
    gradient.addColorStop(0, highlight);
    gradient.addColorStop(1, baseColor);
    ctx.fillStyle = gradient;
    ctx.strokeStyle = shadow;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, tower.x, tower.y, tower.w, tower.h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = shadeColor(baseColor, 0.4);
    drawRoundedRect(ctx, tower.x + 6, tower.y + 6, tower.w - 12, 10, 4);
    ctx.fill();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    drawRoundedRect(ctx, tower.x + tower.w / 2 - 8, tower.y + tower.h * 0.18, 16, 16, 6);
    ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(tower.x + tower.w / 2, tower.y + tower.h * 0.24, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.moveTo(tower.x + tower.w * 0.2, tower.y + tower.h * 0.55);
    ctx.lineTo(tower.x + tower.w * 0.8, tower.y + tower.h * 0.55);
    ctx.lineTo(tower.x + tower.w * 0.7, tower.y + tower.h * 0.75);
    ctx.lineTo(tower.x + tower.w * 0.3, tower.y + tower.h * 0.75);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#bfdbfe';
    ctx.beginPath();
    ctx.rect(tower.x + tower.w * 0.4, tower.y + tower.h * 0.6, tower.w * 0.2, tower.h * 0.18);
    ctx.fill();

    drawHpBar(tower);
    ctx.restore();
  }

  function drawStructures(walls, towers) {
    walls.forEach(drawWall);
    towers.forEach(drawTower);
  }

  function drawShrine(shrine, shrineUnlocked) {
    const glowColor = shrineUnlocked ? '#65f2c6' : colors.shrine;
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.ellipse(shrine.x + shrine.w / 2, shrine.y + shrine.h / 2, shrine.w * 0.7, shrine.h * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    const gradient = ctx.createLinearGradient(shrine.x, shrine.y, shrine.x, shrine.y + shrine.h);
    gradient.addColorStop(0, shadeColor(glowColor, 0.1));
    gradient.addColorStop(1, shadeColor(glowColor, -0.1));
    ctx.fillStyle = gradient;
    drawRoundedRect(ctx, shrine.x, shrine.y, shrine.w, shrine.h, 12);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    drawRoundedRect(ctx, shrine.x + 8, shrine.y + 8, shrine.w - 16, shrine.h - 16, 8);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(shrine.x + shrine.w / 2, shrine.y + shrine.h / 2, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawEnemies(enemies) {
    enemies.forEach((e) => {
      if (e.hp <= 0) return;
      const baseColor = colors.enemy;
      const shadow = shadeColor(baseColor, -0.25);
      const highlight = shadeColor(baseColor, 0.2);
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(e.x + e.w / 2, e.y + e.h + 6, e.w * 0.45, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      const gradient = ctx.createLinearGradient(e.x, e.y, e.x, e.y + e.h);
      gradient.addColorStop(0, highlight);
      gradient.addColorStop(1, baseColor);
      ctx.fillStyle = gradient;
      ctx.strokeStyle = shadow;
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, e.x, e.y, e.w, e.h, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.moveTo(e.x + e.w * 0.2, e.y + 6);
      ctx.lineTo(e.x + e.w * 0.35, e.y - 8);
      ctx.lineTo(e.x + e.w * 0.5, e.y + 6);
      ctx.lineTo(e.x + e.w * 0.65, e.y - 8);
      ctx.lineTo(e.x + e.w * 0.8, e.y + 6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#0b1020';
      drawRoundedRect(ctx, e.x + 6, e.y + e.h * 0.55, e.w - 12, 10, 5);
      ctx.fill();

      ctx.fillStyle = '#fee2e2';
      ctx.beginPath();
      ctx.arc(e.x + e.w / 2, e.y + e.h * 0.35, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(e.x + e.w / 2 - 8, e.y + e.h * 0.48);
      ctx.lineTo(e.x + e.w / 2 + 8, e.y + e.h * 0.48);
      ctx.stroke();
      ctx.restore();
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
        ? `E: Unlock shrine (${shrineCostText()})${state.currency < ECONOMY.shrineCost ? ' — need gold' : ''}`
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

  function drawMobileHint() {
    ctx.save();
    ctx.font = '13px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(229, 231, 235, 0.9)';
    const text = 'Mobile: Drag left pad to move; tap Jump, Attack, or Interact on the right.';
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
      shrineHelpCopy(),
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
    const touchControlsActive = isTouchViewport();
    if (touchControlsActive) {
      drawMobileHint();
    } else {
      drawHelpBar();
    }
    drawOutcome(state, world);
    drawMenuOverlay(snapshot);
  }

  function getInteractiveRegions() {
    return { ...interactiveRegions };
  }

  return { render: draw, getInteractiveRegions };
}
