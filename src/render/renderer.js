import { AURA, COLORS, ECONOMY, GOLD_BURDEN, SHRINE_TECH } from '../core/constants.js';
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

    const time = performance.now() / 1000;
    const breathe = Math.sin(time * 2.5); // -1 to 1

    ctx.save();

    // Config for the new "Ethereal" aura
    const auraRgb = hexToRgb(auraColor);
    const baseAlpha = player.critical ? 0.35 : 0.15;
    const pulseIntensity = player.critical ? 0.2 : 0.08;
    const currentAlpha = baseAlpha + (breathe * 0.5 + 0.5) * pulseIntensity;

    // Layer 1: Subtle wide field (The "presence")
    const outerRadius = auraRadius * (1.1 + breathe * 0.05);
    const glow1 = ctx.createRadialGradient(auraCenterX, auraCenterY, bodyW * 0.2, auraCenterX, auraCenterY, outerRadius);
    glow1.addColorStop(0, `rgba(${auraRgb.r}, ${auraRgb.g}, ${auraRgb.b}, ${currentAlpha})`);
    glow1.addColorStop(0.6, `rgba(${auraRgb.r}, ${auraRgb.g}, ${auraRgb.b}, ${currentAlpha * 0.4})`);
    glow1.addColorStop(1, `rgba(${auraRgb.r}, ${auraRgb.g}, ${auraRgb.b}, 0)`);

    ctx.globalCompositeOperation = 'screen'; // Softer than lighter, but additive
    ctx.fillStyle = glow1;
    ctx.beginPath();
    ctx.arc(auraCenterX, auraCenterY, outerRadius, 0, Math.PI * 2);
    ctx.fill();

    // Layer 2: Core intensity (The "source")
    // Only visible if strictly needed, or very subtle close to body
    const innerRadius = bodyW * 0.8 + 10 * auraRatio;
    const glow2 = ctx.createRadialGradient(auraCenterX, auraCenterY, 0, auraCenterX, auraCenterY, innerRadius);
    glow2.addColorStop(0, `rgba(255, 255, 255, ${currentAlpha * 0.8})`);
    glow2.addColorStop(1, `rgba(${auraRgb.r}, ${auraRgb.g}, ${auraRgb.b}, 0)`);

    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = glow2;
    ctx.beginPath();
    ctx.arc(auraCenterX, auraCenterY, innerRadius, 0, Math.PI * 2);
    ctx.fill();

    // No hard stroke anymore
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

  function drawJumpPuzzles(puzzles = [], activePuzzle, camera, world) {
    if (!puzzles?.length || !world) return;
    puzzles.forEach((puzzle) => {
      const status = puzzle.state;
      const base =
        status === 'completed' || status === 'resolved'
          ? '#34d399'
          : status === 'failed'
            ? '#f87171'
            : colors.beacon;
      const x = puzzle.x - 10;
      const topY = world.ground - 120;
      const height = 110;
      ctx.save();
      ctx.fillStyle = shadeColor(base, -0.2);
      drawRoundedRect(ctx, x + 4, topY + 8, 12, height, 6);
      ctx.fill();
      ctx.fillStyle = base;
      drawRoundedRect(ctx, x, topY, 12, height, 8);
      ctx.fill();
      if (activePuzzle?.id === puzzle.id) {
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(x + 6, topY - 12, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#0b1120';
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      const label =
        status === 'completed' || status === 'resolved'
          ? 'Cleared'
          : status === 'failed'
            ? 'Failed'
            : 'Puzzle';
      ctx.fillText(label, x + 6, topY + height + 10);
      ctx.restore();
    });
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
    const islandName = state.island?.bonus?.name || 'Skybound Outpost';
    const padding = 12;
    const itemGap = 24;

    // Top Right Status Bar
    ctx.save();
    ctx.font = '700 16px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'middle';

    // Calculate widths for layout
    const goldText = `${state.currency}`;
    const nightsText = `${state.nightsSurvived}/${world.nightsToWin}`;
    const legacyText = `${state.legacy || 0}`;

    const goldWidth = ctx.measureText(goldText).width + 24;
    const nightsWidth = ctx.measureText(nightsText).width + 24;
    const legacyWidth = ctx.measureText(legacyText).width + 24;

    const totalWidth = goldWidth + nightsWidth + legacyWidth + padding * 2;
    const barHeight = 40;
    const x = canvas.width - totalWidth - 12;
    const y = 12;

    // Background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    drawRoundedRect(ctx, x, y, totalWidth, barHeight, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    let curX = x + padding;
    const centerY = y + barHeight / 2;

    // Gold Icon & Text
    ctx.beginPath();
    ctx.arc(curX + 8, centerY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fcd34d'; // Gold color
    ctx.fill();
    ctx.fillStyle = '#fef3c7';
    ctx.textAlign = 'left';
    ctx.fillText(goldText, curX + 20, centerY);
    curX += goldWidth;

    // Legacy Icon & Text
    if (state.legacy > 0) {
      ctx.save();
      ctx.translate(curX + 8, centerY);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#60a5fa'; // Blue diamond
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
      ctx.fillStyle = '#dbeafe';
      ctx.fillText(legacyText, curX + 20, centerY);
      curX += legacyWidth;
    }

    // Nights Icon & Text
    ctx.beginPath();
    ctx.arc(curX + 8, centerY, 6, 0, Math.PI * 2);
    ctx.fillStyle = state.isNight ? '#818cf8' : '#fbbf24'; // Moon/Sun color
    ctx.fill();
    if (state.isNight) {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(curX + 10, centerY - 2, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#e5e7eb';
    ctx.fillText(nightsText, curX + 20, centerY);

    ctx.restore();

    // Contextual Prompts (Minimalist)
    ctx.save();
    ctx.font = '600 13px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';

    // Shrine Interaction
    const nearShrine = player.x + player.w > shrine.x - 18 && player.x < shrine.x + shrine.w + 18;
    if (nearShrine && !state.shrineUnlocked) {
      const unlockCost = Math.max(SHRINE_TECH.costs[0] ?? ECONOMY.shrineCost, ECONOMY.shrineCost);
      const canAfford = state.currency >= unlockCost;

      const px = player.x + player.w / 2;
      const py = player.y - 40;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      drawRoundedRect(ctx, px - 60, py - 30, 120, 26, 13);
      ctx.fill();

      ctx.fillStyle = canAfford ? '#34d399' : '#f87171';
      ctx.fillText(`[E] Unlock ${unlockCost}`, px, py - 13);
    }

    // Puzzle Interaction
    if (state.pendingPuzzleReward) {
      const px = player.x + player.w / 2;
      const py = player.y - 60;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      drawRoundedRect(ctx, px - 80, py - 24, 160, 24, 12);
      ctx.fill();
      ctx.fillStyle = '#f472b6';
      ctx.fillText(`[E] Claim Reward`, px, py - 8);
    }

    ctx.restore();
  }

  function drawHelpBar() {
    // Intentionally empty - removing persistent help text
  }

  function drawMobileHint() {
    if (!isTouchViewport()) return;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    // Simple visualize touch zones if needed, or just keep it clean
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
    // Backdrop
    ctx.fillStyle = 'rgba(11, 19, 43, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pattern or vignette
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const gradient = ctx.createRadialGradient(cx, cy, 100, cx, cy, canvas.width * 0.8);
    gradient.addColorStop(0, 'rgba(11, 19, 43, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const isStart = state.menuStatus === 'Start' || state.menuStatus === 'Intro';

    // Main Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 20;
    ctx.font = '800 64px Inter, system-ui, sans-serif';
    ctx.fillText('SPINEFRONT', cx, cy - 80);

    // Subtitle / Status
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#9ca3af';
    ctx.font = '500 20px Inter, system-ui, sans-serif';
    const subTitle = isStart ? 'HOLD THE OUTPOST' : 'PAUSED';
    ctx.fillText(subTitle, cx, cy - 40);

    // Button
    const startLabel = state.menuStartLabel || (isStart ? 'START' : 'RESUME');
    const buttonW = 220;
    const buttonH = 56;
    const bx = cx - buttonW / 2;
    const by = cy + 40;

    interactiveRegions.menuStart = { x: bx, y: by, w: buttonW, h: buttonH };

    // Button Glow
    const bgGlow = ctx.createLinearGradient(bx, by, bx, by + buttonH);
    bgGlow.addColorStop(0, '#3b82f6');
    bgGlow.addColorStop(1, '#2563eb');

    ctx.fillStyle = bgGlow;
    ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
    ctx.shadowBlur = 15;
    drawRoundedRect(ctx, bx, by, buttonW, buttonH, 28);
    ctx.fill();

    // Button Text
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 20px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(startLabel, cx, by + buttonH / 2);

    // Footer Controls
    ctx.fillStyle = '#64748b';
    ctx.font = '14px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'bottom';
    ctx.fillText('WASD / ARROWS to Move  •  SPACE to Jump  •  F to Attack  •  E to Interact', cx, canvas.height - 30);

    ctx.restore();
  }

  function drawOutcome(state, world) {
    if (!state.ended) return;
    ctx.save();

    // Dramatic Overlay
    const overlayColor = state.playerFallen ? 'rgba(50, 0, 0, 0.85)' : 'rgba(0, 50, 30, 0.85)';
    ctx.fillStyle = overlayColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Victory/Defeat Title
    const title = state.playerFallen ? 'DEFEAT' : 'VICTORY';
    const color = state.playerFallen ? '#f87171' : '#34d399';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 80px Inter, system-ui, sans-serif';

    // Text Shadow
    ctx.shadowColor = color;
    ctx.shadowBlur = 30;
    ctx.fillStyle = color;
    ctx.fillText(title, cx, cy - 60);

    // Subtext
    ctx.shadowBlur = 0;
    ctx.font = '500 24px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#e5e7eb';
    const sub = state.playerFallen
      ? 'Your aura has collapsed.'
      : 'The dawn has arrived.';
    ctx.fillText(sub, cx, cy + 20);

    // Stats
    ctx.font = '16px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    const stats = `Nights: ${state.nightsSurvived}  •  Gold: ${state.currency}  •  Legacy: ${state.legacy || 0}`;
    ctx.fillText(stats, cx, cy + 60);

    // Restart Prompt
    ctx.font = '600 16px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#fcd34d';
    ctx.fillText('Press [R] to Restart', cx, cy + 120);

    ctx.restore();

  }

  function drawParallax(ctx, camera, factor, color, offsetY, seed) {
    const parallaxX = camera.x * factor;
    const rng = createRng(seed);
    const nodes = 12;
    const width = 2000;
    const step = width / (nodes - 1);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(camera.x - 100, camera.h); // Start bottom-left

    const startX = Math.floor((camera.x - parallaxX) / width) * width + parallaxX;

    // Draw two full widths to cover screen wrap
    for (let loop = 0; loop < 2; loop++) {
      const baseX = startX + loop * width;
      if (baseX > camera.x + camera.w + 100) continue;

      for (let i = 0; i < nodes; i++) {
        const x = baseX + i * step - parallaxX; // Apply parallax shift
        const featureHeight = 60 + rng.uniform(0, 1) * 80;
        const y = camera.h - offsetY - featureHeight * (0.5 + 0.5 * Math.sin(i * 1.5 + seed));

        // Connect smoothly
        if (loop === 0 && i === 0) {
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    }

    ctx.lineTo(camera.x + camera.w + 100, camera.h);
    ctx.lineTo(camera.x - 100, camera.h);
    ctx.fill();
  }

  function drawProceduralLayer(ctx, camera, factor, color, baseY, seed, scaleY = 1) {
    const viewX = camera.x * factor;
    const nodes = 20;
    const chunkWidth = 1200;
    const step = chunkWidth / nodes;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(camera.x, camera.h);

    const startIdx = Math.floor((camera.x - viewX) / step) - 2;
    const endIdx = startIdx + Math.ceil(camera.w / step) + 4;

    for (let i = startIdx; i <= endIdx; i++) {
      const rng = createRng(seed ^ i * 73);
      const h = rng.uniform(20, 100) * scaleY;
      const x = i * step + viewX;
      const y = camera.h - baseY - h;
      ctx.lineTo(x, y);
    }

    ctx.lineTo(camera.x + camera.w, camera.h);
    ctx.lineTo(camera.x, camera.h);
    ctx.closePath();
    ctx.fill();
  }

  function drawVegetation(ctx, surfacePoints, seed) {
    if (surfacePoints.length < 2) return;
    const rng = createRng(seed);
    ctx.fillStyle = shadeColor(colors.islandTop, -0.2); // Darker grass

    for (let i = 0; i < surfacePoints.length - 1; i++) {
      const pt = surfacePoints[i];
      const next = surfacePoints[i + 1];
      const dist = Math.abs(next.x - pt.x);

      if (dist > 20 && dist < 100) { // Only on relatively flat processing
        const count = Math.floor(dist / 12);
        for (let j = 0; j < count; j++) {
          if (rng.uniform(0, 1) > 0.6) continue;
          const t = j / count;
          const x = pt.x + (next.x - pt.x) * t;
          const y = pt.y + (next.y - pt.y) * t;

          // Draw tuft
          const h = rng.uniform(4, 9);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - 2, y - h);
          ctx.lineTo(x + 2, y - h);
          ctx.fill();
        }
      }
    }
  }

  function drawBackground(state, world, camera) {
    ctx.clearRect(-state.effects.shakeOffset.x, -state.effects.shakeOffset.y, canvas.width, canvas.height);
    const altitudeBlend = clamp((state.islandLevel - 1) * 0.12, 0, 1);

    // Enhanced Sky Gradient
    const skyTop = lerpColor('#a5f3fc', '#0f172a', state.skyBlend); // Pale blue to deep night
    const skyMid = lerpColor('#e0f2fe', '#1e293b', state.skyBlend);
    const skyBot = lerpColor('#f0f9ff', '#334155', state.skyBlend);

    const gradient = ctx.createLinearGradient(0, 0, 0, camera.h);
    gradient.addColorStop(0, skyTop);
    gradient.addColorStop(0.6, skyMid);
    gradient.addColorStop(1, skyBot);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, camera.w, camera.h);

    // Dusk Overlay
    const duskStrength = 1 - Math.abs(0.5 - state.skyBlend) * 2; // Peak at 0.5
    if (duskStrength > 0) {
      const dusk = ctx.createLinearGradient(0, 0, 0, camera.h);
      dusk.addColorStop(0, `rgba(253, 186, 116, ${0.4 * duskStrength})`); // Orange/Peach
      dusk.addColorStop(1, `rgba(129, 140, 248, ${0.3 * duskStrength})`); // Indigo
      ctx.fillStyle = dusk;
      ctx.fillRect(0, 0, camera.w, camera.h);
    }

    drawCelestials(state, world, camera);

    // Parallax Layers
    const seed = state.randomSeed || 123;
    const nightMode = state.skyBlend > 0.8;
    const mountainColor = nightMode ? '#1e293b' : '#cbd5e1';  // Slate-ish
    const hillColor = nightMode ? '#334155' : '#94a3b8';

    drawProceduralLayer(ctx, camera, 0.2, mountainColor, -50, seed, 1.5);
    drawProceduralLayer(ctx, camera, 0.5, hillColor, -120, seed + 1, 0.8);

    // Atmosphere/Clouds below island
    const cloudGradient = ctx.createLinearGradient(0, camera.h - 150, 0, camera.h);
    cloudGradient.addColorStop(0, 'rgba(255,255,255,0)');
    cloudGradient.addColorStop(1, nightMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.4)');
    ctx.fillStyle = cloudGradient;
    ctx.fillRect(0, camera.h - 150, camera.w, 150);

    // Island Rendering
    const groundY = world.ground - camera.y;
    const islandTop = lerpColor(colors.islandTop, shadeColor(colors.islandTop, -0.4), state.skyBlend * 0.8);
    const islandShadow = lerpColor(colors.islandShadow, '#022c22', state.skyBlend * 0.9);

    ctx.save();
    const islandSeed = (state.randomSeed || 1) ^ ((state.islandLevel || 1) * 977);
    const islandRng = createRng(islandSeed);

    const leftOverhang = 80 + islandRng.uniform(-10, 30);
    const rightOverhang = 90 + islandRng.uniform(-10, 30);
    const slabDepth = 110;

    // --- Detailed Island Shape Generation ---
    const surfacePoints = [];
    const minX = -leftOverhang;
    const maxX = camera.w + rightOverhang;
    const detailStep = 30;

    // Generate top surface
    ctx.beginPath();
    ctx.moveTo(minX, groundY);
    surfacePoints.push({ x: minX, y: groundY });

    for (let x = minX; x <= maxX; x += detailStep) {
      const noise = islandRng.uniform(-4, 4);
      const y = groundY + noise;
      ctx.lineTo(x, y);
      surfacePoints.push({ x, y });
    }

    // Right edge
    const rightEdgeY = groundY + slabDepth * 0.4;
    ctx.lineTo(maxX + 10, rightEdgeY);

    // Bottom rough edge
    const bottomPoints = [];
    for (let x = maxX; x >= minX; x -= 40) {
      const y = groundY + slabDepth + islandRng.uniform(-15, 25) + (Math.sin(x * 0.01) * 20);
      ctx.lineTo(x, y);
      bottomPoints.push({ x, y });
    }

    // Close shape
    ctx.lineTo(minX - 10, groundY + slabDepth * 0.3);
    ctx.closePath();

    // Fill Main Body (Gradient)
    const islandGrad = ctx.createLinearGradient(0, groundY, 0, groundY + slabDepth);
    islandGrad.addColorStop(0, islandTop);
    islandGrad.addColorStop(1, islandShadow);
    ctx.fillStyle = islandGrad;
    ctx.fill();

    // Add "Dirt/Rock" texture/noise to the side
    ctx.globalCompositeOperation = 'source-atop'; // Only draw on the island
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    for (let i = 0; i < 40; i++) {
      const rx = islandRng.uniform(minX, maxX);
      const ry = islandRng.uniform(groundY + 10, groundY + slabDepth);
      const rw = islandRng.uniform(10, 60);
      const rh = islandRng.uniform(4, 15);
      ctx.beginPath();
      ctx.ellipse(rx, ry, rw, rh, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    // Top Strip (Grass hint)
    ctx.strokeStyle = shadeColor(islandTop, 0.15);
    ctx.lineWidth = 4;
    ctx.beginPath();
    surfacePoints.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // Vegetation
    drawVegetation(ctx, surfacePoints, islandSeed);

    // Debris (Floating Rocks)
    const debrisCount = 6 + islandRng.int(0, 3);
    for (let i = 0; i < debrisCount; i++) {
      const dx = camera.w * (0.1 + 0.8 * (i / debrisCount)) + islandRng.uniform(-40, 40);
      const dy = groundY + slabDepth + islandRng.uniform(20, 100);
      const size = islandRng.uniform(10, 25);

      ctx.fillStyle = islandShadow;
      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(islandRng.uniform(0, Math.PI * 2));
      drawRoundedRect(ctx, -size / 2, -size / 2, size, size * 0.6, 4);
      ctx.fill();
      ctx.restore();
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
    drawJumpPuzzles(state.jumpPuzzles, state.activePuzzle, activeCamera, world);
    drawEnemies(enemies);
    drawProjectiles(projectiles);
    drawProjectiles(enemyProjectiles);
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
