import { AURA, COLORS, ECONOMY, SHRINE_TECH } from '../core/constants.js';
import { createRng } from '../core/random.js';
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

function branchLabel(branchId) {
  return SHRINE_TECH.branches[branchId]?.label || 'Unknown';
}

function shrineTierSummary(s) {
  const cadence = s.branches?.cadence || 0;
  const power = s.branches?.power || 0;
  return `Cadence ${cadence}/${SHRINE_TECH.costs.length} | Power ${power}/${SHRINE_TECH.costs.length}`;
}

const unlockCost = () => Math.max(SHRINE_TECH.costs[0] ?? ECONOMY.shrineCost, ECONOMY.shrineCost);
const shrineCostText = () => `${unlockCost()} gold`;
const shrineHelpCopy = () => `Unlock shrine tech for ${shrineCostText()} to pick a tech branch.`;

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
    const auraMax = player.maxAura || AURA.max;
    const auraRatio = clamp((player.aura ?? auraMax) / auraMax, 0, 1);
    const auraColor = player.critical ? '#f87171' : baseColor;
    const auraPulse = player.critical ? 0.2 : 0;
    const auraRadius = bodyW * 0.9 + 26 * auraRatio;
    const auraCenterX = bodyX + bodyW / 2;
    const auraCenterY = bodyY + bodyH / 2;

    ctx.save();
    const auraRgb = hexToRgb(auraColor);
    const glow = ctx.createRadialGradient(auraCenterX, auraCenterY, bodyW * 0.3, auraCenterX, auraCenterY, auraRadius);
    glow.addColorStop(0, `rgba(${auraRgb.r}, ${auraRgb.g}, ${auraRgb.b}, ${0.22 + auraPulse})`);
    glow.addColorStop(1, `rgba(${auraRgb.r}, ${auraRgb.g}, ${auraRgb.b}, 0)`);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.fillRect(auraCenterX - auraRadius, auraCenterY - auraRadius, auraRadius * 2, auraRadius * 2);
    ctx.globalCompositeOperation = 'source-over';

    ctx.lineWidth = player.critical ? 6 : 4;
    ctx.strokeStyle = `rgba(${auraRgb.r}, ${auraRgb.g}, ${auraRgb.b}, ${0.4 + auraPulse})`;
    ctx.beginPath();
    ctx.ellipse(auraCenterX, auraCenterY, auraRadius, auraRadius * 0.8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

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

  function drawBarricade(barricade) {
    const baseColor = barricade.hp > 0 ? colors.barricade : '#92400e';
    const highlight = shadeColor(baseColor, 0.25);
    const shadow = shadeColor(baseColor, -0.28);
    ctx.save();
    ctx.fillStyle = baseColor;
    ctx.strokeStyle = shadow;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, barricade.x, barricade.y, barricade.w, barricade.h, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = highlight;
    ctx.fillRect(barricade.x + 4, barricade.y + 6, barricade.w - 8, 6);
    ctx.restore();
    drawHpBar(barricade);
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

  function drawStructures(walls, towers, barricades = []) {
    walls.forEach(drawWall);
    towers.forEach(drawTower);
    barricades.forEach(drawBarricade);
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

  function drawWyvern(enemy, carrier) {
    const wyvernX = enemy.x + enemy.w / 2;
    const wyvernY = (carrier?.height ?? enemy.y - 40) - 14;
    ctx.save();
    ctx.fillStyle = colors.wyvern;
    ctx.strokeStyle = shadeColor(colors.wyvern, -0.2);
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(wyvernX - 22, wyvernY);
    ctx.quadraticCurveTo(wyvernX - 10, wyvernY - 18, wyvernX, wyvernY - 4);
    ctx.quadraticCurveTo(wyvernX + 10, wyvernY - 18, wyvernX + 22, wyvernY);
    ctx.quadraticCurveTo(wyvernX + 8, wyvernY + 6, wyvernX, wyvernY + 2);
    ctx.quadraticCurveTo(wyvernX - 8, wyvernY + 6, wyvernX - 22, wyvernY);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = shadeColor(colors.wyvern, 0.25);
    ctx.beginPath();
    ctx.ellipse(wyvernX, wyvernY + 8, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(wyvernX, wyvernY + 10);
    ctx.lineTo(enemy.x + enemy.w / 2, enemy.y + 6);
    ctx.stroke();
    ctx.restore();
  }

  function drawEnemies(enemies) {
    enemies.forEach((e) => {
      if (e.hp <= 0) return;
      const baseColor = e.variant === 'sapper' ? colors.sapper : colors.enemy;
      const shadow = shadeColor(baseColor, -0.25);
      const highlight = shadeColor(baseColor, 0.2);
      const carried = e.carrier && (!e.carrier.hasDropped || e.carrier.dropTimer > 0);
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

      if (e.variant === 'sapper') {
        ctx.fillStyle = shadeColor(baseColor, -0.35);
        ctx.fillRect(e.x + e.w * 0.28, e.y + e.h * 0.48, e.w * 0.44, 5);
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.arc(e.x + e.w * 0.7, e.y + e.h * 0.52, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(e.x + e.w / 2 - 8, e.y + e.h * 0.48);
      ctx.lineTo(e.x + e.w / 2 + 8, e.y + e.h * 0.48);
      ctx.stroke();
      if (carried) {
        drawWyvern(e, e.carrier);
      }
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

  function drawDroppedCrown(drop) {
    if (!drop?.active) return;
    ctx.save();
    const base = colors.crown;
    ctx.fillStyle = shadeColor(base, -0.1);
    const x = drop.x;
    const y = drop.y;
    drawRoundedRect(ctx, x - 12, y - 6, 24, 10, 3);
    ctx.fill();
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 2);
    ctx.lineTo(x - 6, y - 12);
    ctx.lineTo(x, y - 2);
    ctx.lineTo(x + 6, y - 12);
    ctx.lineTo(x + 12, y - 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(x, y - 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef3c7';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${drop.timer.toFixed(1)}s`, x, y + 14);
    ctx.restore();
  }

  function drawCelestials(state, world, camera) {
    const phase = clamp(state.dayTimer / world.dayLength, 0, 1);
    const arcHeight = 120;
    const minX = 60;
    const maxX = camera.w - 60;

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

  function drawEdgeWarnings(effects, camera) {
    if (!effects.warnings?.length) return;
    ctx.save();
    effects.warnings.forEach((warning) => {
      const alpha = clamp(warning.timer / warning.duration, 0, 1);
      const x = warning.side === 'left' ? 24 : camera.w - 24;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = colors.beacon;
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x + (warning.side === 'left' ? 18 : -18), 44);
      ctx.lineTo(x, 68);
      ctx.closePath();
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
    const islandName = state.island?.bonus?.name || 'Skybound Outpost';
    const shrineTech = state.shrineTech || { branches: { cadence: 0, power: 0 } };
    const selection = shrineTech.selection || 'cadence';
    const nextTier = (shrineTech.branches?.[selection] || 0) + 1;
    const costIndex = Math.min(nextTier - 1, SHRINE_TECH.costs.length - 1);
    const baseNextCost = SHRINE_TECH.costs[costIndex] ?? unlockCost();
    const nextCost = nextTier === 1 ? Math.max(baseNextCost, ECONOMY.shrineCost) : baseNextCost;
    const auraMax = player.maxAura || AURA.max;
    const auraPercent = Math.round(clamp((player.aura ?? auraMax) / auraMax, 0, 1) * 100);
    const hudLines = [
      `Island ${state.islandLevel || 1}: ${islandName}`,
      `Nights: ${state.nightsSurvived}/${world.nightsToWin}`,
      `Gold: ${state.currency}`,
      `Aura: ${auraPercent}%${player.critical ? ' (critical!)' : ''}`,
    ];
    if (state.island?.bonus?.description) {
      hudLines.push(`Bonus: ${state.island.bonus.description}`);
    }
    const shrineLine = state.shrineUnlocked
      ? `Shrine: ${branchLabel(selection)} — ${shrineTierSummary(shrineTech)}`
      : nearShrine
        ? `E: Unlock shrine (${nextCost} gold) — focus ${branchLabel(selection)} (up/down to switch)${state.currency < nextCost ? ' — need gold' : ''}`
        : 'Shrine: Locked (approach to unlock)';
    hudLines.push(shrineLine);
    if (!state.isNight) {
      hudLines.push(`Day build: Repair (-${ECONOMY.repairCost}) near walls/towers or E+↓ for barricade (-${ECONOMY.barricadeCost}).`);
    }
    if (state.droppedCrown?.active) {
      hudLines.push(`Crown dropped! ${state.droppedCrown.timer.toFixed(1)}s to recover.`);
    }
    if (state.isNight && state.waveDescriptors?.length) {
      const preview = state.waveDescriptors.slice(0, 3);
      const summary = preview
        .map((d) => `${d.side === 'left' ? 'L' : 'R'}-${d.enemyType}${d.burst ? '!' : ''}`)
        .join(' | ');
      hudLines.push(`Next wave: ${summary}`);
    }
    if (state.pendingAscend) {
      hudLines.push('Ascend ready: open the menu to climb.');
    }
    if (state.hudText) {
      hudLines.push(state.hudText);
    }

    ctx.save();
    const padding = 12;
    const maxWidth = 340;
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
      'Move: A/D or ←/→ | Jump: Space | Ladder: W/S or ↑/↓ | Sprint: Shift | Attack: F | Interact/Build: E (E+↓ for barricade) | Restart: R | Menu: Esc';
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

    if (state.island?.bonus?.name) {
      ctx.fillStyle = '#a5f3fc';
      ctx.font = '13px Inter, system-ui, sans-serif';
      ctx.fillText(
        `Island bonus: ${state.island.bonus.name} — ${state.island.bonus.description || ''}`,
        panelX + 18,
        panelY + 84,
      );
    }

    ctx.font = '13px Inter, system-ui, sans-serif';
    const items = [
      'Endure 3 nights to ascend to the next sky island.',
      'Keep walls and towers standing to slow the corruption.',
      'Carry gold and stand within your walls to recover your light aura.',
      shrineHelpCopy(),
      'Income arrives at dawn (+10) and at the start of each night (+5), plus any island bonus.',
      `Daytime: repair walls/towers (Interact) or place barricades with Interact+Down.`,
    ];
    items.forEach((line, idx) => {
      ctx.fillText(`• ${line}`, panelX + 18, panelY + 110 + idx * 18);
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
    const lossColor = state.crownLost || state.playerFallen ? '#f87171' : '#34d399';
    ctx.fillStyle = lossColor;
    ctx.font = '28px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const message = state.crownLost
      ? 'Crown lost! You were overrun.'
      : state.playerFallen
        ? 'You fell into the clouds.'
        : 'Victory! Dawn rises and you endure.';
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    ctx.font = '16px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#e5e7eb';
    const sub = 'Press Enter to continue or R to restart';
    ctx.fillText(sub, canvas.width / 2, canvas.height / 2 + 28);
    ctx.restore();
  }

  function drawBackground(state, world, camera) {
    ctx.clearRect(-state.effects.shakeOffset.x, -state.effects.shakeOffset.y, canvas.width, canvas.height);
    const altitudeBlend = clamp((state.islandLevel - 1) * 0.12, 0, 1);
    const skyTop = lerpColor('#c7e9ff', '#0c1324', state.skyBlend * 0.7 + altitudeBlend * 0.3);
    const skyBottom = lerpColor('#6bb7ff', '#0f1c3c', state.skyBlend * 0.7 + altitudeBlend * 0.3);
    const gradient = ctx.createLinearGradient(0, 0, 0, camera.h);
    gradient.addColorStop(0, skyTop);
    gradient.addColorStop(1, skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, camera.w, camera.h);

    const duskStrength = 1 - Math.abs(0.5 - state.skyBlend) * 1.8;
    if (duskStrength > 0) {
      const dusk = ctx.createLinearGradient(0, 0, 0, camera.h);
      dusk.addColorStop(0, `rgba(252, 211, 77, ${0.18 * duskStrength})`);
      dusk.addColorStop(1, `rgba(79, 70, 229, ${0.25 * duskStrength})`);
      ctx.fillStyle = dusk;
      ctx.fillRect(0, 0, camera.w, camera.h);
    }

    drawCelestials(state, world, camera);

    const groundY = world.ground - camera.y;
    const islandTop = lerpColor(colors.islandTop, shadeColor(colors.islandTop, -0.15), state.skyBlend * 0.5);
    const islandShadow = lerpColor(colors.islandShadow, '#0b3323', state.skyBlend * 0.8);

    const drawCloud = (x, y, scale = 1, alpha = 0.4) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.ellipse(x, y, 40 * scale, 18 * scale, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 26 * scale, y + 8 * scale, 32 * scale, 14 * scale, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 26 * scale, y + 6 * scale, 26 * scale, 12 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const cloudSeed = state.islandLevel || 1;
    drawCloud((cloudSeed * 57) % camera.w, 90 + (cloudSeed % 4) * 14, 1, 0.45);
    drawCloud((cloudSeed * 31 + 140) % camera.w, 140, 0.8, 0.35);
    drawCloud((cloudSeed * 73 + 260) % camera.w, 200, 1.15, 0.5);

    ctx.save();
    const islandSeed = (state.randomSeed || 1) ^ ((state.islandLevel || 1) * 977);
    const islandRng = createRng(islandSeed);
    const leftOverhang = 72 + islandRng.uniform(-18, 22);
    const rightOverhang = 84 + islandRng.uniform(-22, 28);
    const slabDepth = 94 + islandRng.uniform(-10, 24);
    const stratumDepth = 134 + islandRng.uniform(-12, 26);

    const topGradient = ctx.createLinearGradient(0, groundY - 70, 0, groundY + slabDepth);
    topGradient.addColorStop(0, shadeColor(islandTop, 0.18));
    topGradient.addColorStop(1, islandTop);
    ctx.fillStyle = topGradient;
    ctx.beginPath();
    const ridgeCount = 7;
    const ridgeStep = (camera.w + leftOverhang + rightOverhang) / (ridgeCount - 1);
    ctx.moveTo(-leftOverhang, groundY);
    for (let i = 0; i < ridgeCount; i += 1) {
      const ridgeX = -leftOverhang + ridgeStep * i;
      const ridgeY = groundY + islandRng.uniform(-10, 12);
      ctx.lineTo(ridgeX, ridgeY);
    }
    ctx.lineTo(camera.w + rightOverhang, groundY + slabDepth * 0.42);
    ctx.lineTo(camera.w + rightOverhang * 0.45, groundY + slabDepth);
    ctx.lineTo(camera.w * 0.48, groundY + slabDepth + islandRng.uniform(-6, 14));
    ctx.lineTo(camera.w * 0.2, groundY + slabDepth * 0.9);
    ctx.lineTo(-leftOverhang * 0.22, groundY + slabDepth * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = islandShadow;
    const underbellyY = groundY + slabDepth * 0.74;
    ctx.beginPath();
    ctx.moveTo(-leftOverhang * 0.1, underbellyY + islandRng.uniform(-6, 8));
    ctx.lineTo(camera.w + rightOverhang * 0.24, underbellyY + islandRng.uniform(-4, 10));
    ctx.lineTo(camera.w + rightOverhang * 0.1, underbellyY + stratumDepth * 0.35);
    ctx.lineTo(camera.w * 0.64, underbellyY + stratumDepth * 0.65 + islandRng.uniform(-10, 12));
    ctx.lineTo(camera.w * 0.32, underbellyY + stratumDepth * 0.52 + islandRng.uniform(-8, 10));
    ctx.lineTo(-leftOverhang * 0.06, underbellyY + stratumDepth * 0.32);
    ctx.closePath();
    ctx.fill();

    const columnCount = 4;
    for (let i = 0; i < columnCount; i += 1) {
      const center = camera.w * (0.18 + i * 0.18) + islandRng.uniform(-30, 30);
      const width = 62 + islandRng.uniform(-12, 18);
      const height = stratumDepth * 0.5 + islandRng.uniform(-8, 36);
      ctx.fillStyle = shadeColor(islandShadow, i % 2 === 0 ? -0.04 : 0.06);
      ctx.beginPath();
      ctx.moveTo(center - width * 0.48, underbellyY + islandRng.uniform(-6, 6));
      ctx.lineTo(center + width * 0.48, underbellyY + islandRng.uniform(-6, 6));
      ctx.lineTo(center + width * 0.32, underbellyY + height);
      ctx.lineTo(center - width * 0.42, underbellyY + height * 0.92);
      ctx.closePath();
      ctx.fill();
    }

    const debrisCount = 5 + islandRng.int(0, 2);
    ctx.fillStyle = shadeColor(islandShadow, -0.12);
    for (let i = 0; i < debrisCount; i += 1) {
      const driftX = camera.w * (0.12 + 0.16 * i) + islandRng.uniform(-28, 28);
      const driftY = underbellyY + stratumDepth * 0.9 + islandRng.uniform(-12, 22);
      const rockWidth = 24 + islandRng.uniform(-6, 10);
      const rockHeight = 10 + islandRng.uniform(-4, 8);
      drawRoundedRect(ctx, driftX, driftY, rockWidth, rockHeight, 4);
      ctx.fill();
    }

    ctx.restore();
  }

  function draw(snapshot) {
    const {
      world,
      state,
      camera,
      player,
      shrine,
      walls,
      towers,
      barricades = [],
      enemies,
      projectiles,
      enemyProjectiles = [],
    } = snapshot;
    const activeCamera = camera || { x: 0, y: 0, w: canvas.width, h: canvas.height };

    // World layer (shaken)
    ctx.save();
    ctx.translate(state.effects.shakeOffset.x, state.effects.shakeOffset.y);
    drawBackground(state, world, activeCamera);

    ctx.save();
    ctx.translate(-activeCamera.x, -activeCamera.y);
    drawShrine(shrine, state.shrineUnlocked);
    drawStructures(walls, towers, barricades);
    drawEnemies(enemies);
    drawProjectiles(projectiles);
    drawProjectiles(enemyProjectiles);
    drawDroppedCrown(state.droppedCrown);
    drawPlayer(player);
    drawPlayerAttack(player);
    drawHitFlashes(state.effects, world);
    ctx.restore();

    drawVignette(state.effects);
    ctx.restore();

    // UI layer (stable)
    drawEdgeWarnings(state.effects, activeCamera);
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
