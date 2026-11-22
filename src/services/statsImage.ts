import { createCanvas, type CanvasRenderingContext2D } from 'canvas';
import type { DbUser } from '../types/index.js';
import { config } from '../config.js';
import { calcProgress, calcGoalProgress, formatMinutes } from './progress.js';
import { ACHIEVEMENTS, getUserAchievements, checkAndUnlock } from './achievements.js';
import { getCravingStats, getCheckinCount } from './craving.js';
import { HEALTH_MILESTONES } from './health.js';

function nextMilestoneDays(current: number): { prev: number; next: number } {
  const steps = [1, 3, 7, 14, 21, 30, 60, 90, 180, 365, 500, 730, 1000];
  let prev = 0;
  for (const d of steps) {
    if (d > current) return { prev, next: d };
    prev = d;
  }
  return { prev: current, next: current + 100 };
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string | CanvasGradient
) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function strokeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  stroke: string | CanvasGradient,
  lineWidth: number
) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

/** Word-wrap helper returning up to maxLines lines that fit maxWidth. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 2
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) {
        // Fit remainder into final line with ellipsis if needed
        let rest = [current, ...words.slice(words.indexOf(word) + 1)].join(' ');
        while (ctx.measureText(rest + '…').width > maxWidth && rest.length > 3) {
          rest = rest.slice(0, -1).trimEnd();
        }
        lines.push(rest.length < text.length ? rest + '…' : rest);
        return lines;
      }
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

/** Minimal geometric icons (crisp on both macOS and Linux Cairo without relying on emoji fonts). */
function drawCoinIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.round(r * 1.15)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('₽', cx, cy + 1);
  ctx.restore();
}

function drawShieldIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.88, cy - r * 0.55);
  ctx.lineTo(cx + r * 0.88, cy + r * 0.12);
  ctx.quadraticCurveTo(cx + r * 0.82, cy + r * 0.78, cx, cy + r * 1.05);
  ctx.quadraticCurveTo(cx - r * 0.82, cy + r * 0.78, cx - r * 0.88, cy + r * 0.12);
  ctx.lineTo(cx - r * 0.88, cy - r * 0.55);
  ctx.closePath();
  ctx.stroke();

  // Checkmark inside shield
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.36, cy + r * 0.04);
  ctx.lineTo(cx - r * 0.08, cy + r * 0.34);
  ctx.lineTo(cx + r * 0.42, cy - r * 0.28);
  ctx.stroke();
  ctx.restore();
}

function drawHeartIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.85);
  ctx.bezierCurveTo(cx - r * 1.25, cy + r * 0.1, cx - r * 1.1, cy - r * 0.95, cx, cy - r * 0.32);
  ctx.bezierCurveTo(cx + r * 1.1, cy - r * 0.95, cx + r * 1.25, cy + r * 0.1, cx, cy + r * 0.85);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawPulseIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx - r * 0.45, cy);
  ctx.lineTo(cx - r * 0.2, cy - r * 0.75);
  ctx.lineTo(cx + r * 0.18, cy + r * 0.75);
  ctx.lineTo(cx + r * 0.45, cy - r * 0.25);
  ctx.lineTo(cx + r, cy - r * 0.25);
  ctx.stroke();
  ctx.restore();
}

function drawStarIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, fill: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.44;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * rad;
    const y = cy + Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGlassCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 28
) {
  const fill = ctx.createLinearGradient(x, y, x, y + h);
  fill.addColorStop(0, 'rgba(255, 255, 255, 0.085)');
  fill.addColorStop(1, 'rgba(255, 255, 255, 0.03)');
  fillRoundRect(ctx, x, y, w, h, r, fill);

  const border = ctx.createLinearGradient(x, y, x, y + h);
  border.addColorStop(0, 'rgba(167, 243, 208, 0.28)');
  border.addColorStop(1, 'rgba(255, 255, 255, 0.06)');
  strokeRoundRect(ctx, x, y, w, h, r, border, 1.5);
}

function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  pct: number,
  colorStart: string,
  colorEnd: string
) {
  fillRoundRect(ctx, x, y, w, h, h / 2, 'rgba(255, 255, 255, 0.10)');
  const clamped = Math.max(0, Math.min(1, pct));
  if (clamped > 0.01) {
    const bw = Math.max(h, w * clamped);
    const g = ctx.createLinearGradient(x, y, x + bw, y);
    g.addColorStop(0, colorStart);
    g.addColorStop(1, colorEnd);
    fillRoundRect(ctx, x, y, bw, h, h / 2, g);
  }
}

export function generateStatsImage(user: DbUser): Buffer {
  const progress = calcProgress(user);
  checkAndUnlock(user);
  const unlockedCodes = getUserAchievements(user.id);
  const unlockedSet = new Set(unlockedCodes);
  const cravingStats = getCravingStats(user.id);
  const checkins = getCheckinCount(user.id);
  const goal = calcGoalProgress(user, progress.moneySaved);

  const W = 1080;
  const H = 1350;
  const PAD = 60;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ─── 1. Deep Obsidian-Emerald Background ───
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#05110f');
  bg.addColorStop(0.45, '#0a221d');
  bg.addColorStop(1, '#061512');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Ambient Aurora Glows
  const glowTop = ctx.createRadialGradient(W * 0.5, 260, 20, W * 0.5, 260, 480);
  glowTop.addColorStop(0, 'rgba(16, 185, 129, 0.28)');
  glowTop.addColorStop(0.5, 'rgba(6, 182, 212, 0.08)');
  glowTop.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowTop;
  ctx.fillRect(0, 0, W, 760);

  const glowBottom = ctx.createRadialGradient(W * 0.82, H * 0.82, 10, W * 0.82, H * 0.82, 420);
  glowBottom.addColorStop(0, 'rgba(245, 158, 11, 0.14)');
  glowBottom.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowBottom;
  ctx.fillRect(0, 600, W, 750);

  // Subtle decorative dot grid
  ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
  for (let gx = 44; gx < W; gx += 44) {
    for (let gy = 44; gy < H; gy += 44) {
      ctx.beginPath();
      ctx.arc(gx, gy, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Outer sleek frame
  strokeRoundRect(ctx, 22, 22, W - 44, H - 44, 42, 'rgba(167, 243, 208, 0.14)', 2);

  // ─── 2. Header Row ───
  const headerY = 74;
  // Status pill
  const pillW = 330;
  const pillH = 48;
  fillRoundRect(ctx, PAD, headerY, pillW, pillH, 24, 'rgba(16, 185, 129, 0.16)');
  strokeRoundRect(ctx, PAD, headerY, pillW, pillH, 24, 'rgba(52, 211, 153, 0.45)', 1.5);
  // Pulsing dot
  ctx.fillStyle = '#34d399';
  ctx.beginPath();
  ctx.arc(PAD + 28, headerY + pillH / 2, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a7f3d0';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('СВОБОДЕН ОТ НИКОТИНА', PAD + 48, headerY + pillH / 2 + 1);

  // User name on right
  const displayName = (user.first_name || user.username || '').trim();
  if (displayName) {
    ctx.fillStyle = 'rgba(236, 253, 245, 0.85)';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const safeName = displayName.length > 22 ? displayName.slice(0, 21) + '…' : displayName;
    ctx.fillText(safeName, W - PAD, headerY + pillH / 2 + 1);
  }

  // ─── 3. Hero Progress Ring ───
  const days = progress.smokeFreeDays;
  const hours = progress.smokeFreeHours;
  const { prev: prevStep, next: nextStep } = nextMilestoneDays(days);
  const ringFrac =
    days === 0
      ? Math.min(1, Math.max(0.05, progress.smokeFreeMinutes / 1440))
      : Math.min(1, Math.max(0.05, (days - prevStep) / Math.max(1, nextStep - prevStep)));

  const ringCx = W / 2;
  const ringCy = 355;
  const ringR = 175;
  const ringWidth = 22;

  // Inner soft circle backdrop
  const innerBg = ctx.createRadialGradient(ringCx, ringCy, 20, ringCx, ringCy, ringR);
  innerBg.addColorStop(0, 'rgba(16, 185, 129, 0.14)');
  innerBg.addColorStop(1, 'rgba(16, 185, 129, 0.02)');
  ctx.fillStyle = innerBg;
  ctx.beginPath();
  ctx.arc(ringCx, ringCy, ringR - 14, 0, Math.PI * 2);
  ctx.fill();

  // Track ring
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
  ctx.lineWidth = ringWidth;
  ctx.beginPath();
  ctx.arc(ringCx, ringCy, ringR, 0, Math.PI * 2);
  ctx.stroke();

  // Active gradient arc
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + Math.PI * 2 * ringFrac;
  const arcGrad = ctx.createLinearGradient(ringCx - ringR, ringCy - ringR, ringCx + ringR, ringCy + ringR);
  arcGrad.addColorStop(0, '#34d399');
  arcGrad.addColorStop(0.55, '#10b981');
  arcGrad.addColorStop(1, '#22d3ee');

  ctx.save();
  ctx.strokeStyle = arcGrad;
  ctx.lineWidth = ringWidth;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(52, 211, 153, 0.55)';
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(ringCx, ringCy, ringR, startAngle, endAngle);
  ctx.stroke();
  ctx.restore();

  // Giant hero counter inside ring
  const heroNum = days > 0 ? String(days) : hours > 0 ? `${hours}ч` : `${progress.smokeFreeMinutes}м`;
  const heroLabel =
    days > 0
      ? pluralRu(days, 'ДЕНЬ БЕЗ ДЫМА', 'ДНЯ БЕЗ ДЫМА', 'ДНЕЙ БЕЗ ДЫМА')
      : hours > 0
        ? 'НА СВОБОДЕ'
        : 'СТАРТ СВОБОДЫ';

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${heroNum.length > 3 ? 92 : 112}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(heroNum, ringCx, ringCy - 18);

  ctx.fillStyle = '#6ee7b7';
  ctx.font = 'bold 21px sans-serif';
  ctx.fillText(heroLabel, ringCx, ringCy + 64);

  // Milestone subtitle below ring
  const nextPct = Math.round(ringFrac * 100);
  const milestonePillText = `Следующая цель: ${nextStep} ${pluralRu(nextStep, 'день', 'дня', 'дней')}  •  ${nextPct}%`;
  ctx.font = '600 20px sans-serif';
  const mpW = Math.max(360, ctx.measureText(milestonePillText).width + 56);
  const mpH = 44;
  const mpY = ringCy + ringR + 28;
  fillRoundRect(ctx, ringCx - mpW / 2, mpY, mpW, mpH, 22, 'rgba(255, 255, 255, 0.06)');
  strokeRoundRect(ctx, ringCx - mpW / 2, mpY, mpW, mpH, 22, 'rgba(255, 255, 255, 0.12)', 1);
  ctx.fillStyle = '#d1fae5';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(milestonePillText, ringCx, mpY + mpH / 2 + 1);

  // ─── 4. 2x2 Glassmorphism Metrics Grid ───
  const gridY = 626;
  const gap = 24;
  const cardW = (W - PAD * 2 - gap) / 2;
  const cardH = 176;

  // Compute health recovery % based on reached WHO milestones + days + checkins
  const reachedHealth = HEALTH_MILESTONES.filter((m) => progress.smokeFreeMinutes >= m.minutes).length;
  const winRate = cravingStats.total > 0 ? cravingStats.resisted / cravingStats.total : 1;
  const recoveryPct = Math.min(
    100,
    Math.max(
      5,
      Math.round((reachedHealth / HEALTH_MILESTONES.length) * 75 + Math.min(15, checkins * 1.5) + winRate * 10)
    )
  );
  const moneySaved = Math.round(progress.moneySaved);

  const cards = [
    {
      x: PAD,
      y: gridY,
      title: 'СЭКОНОМЛЕНО',
      value: `${moneySaved.toLocaleString('ru-RU')} ₽`,
      sub: 'осталось в кармане',
      accent: '#fbbf24',
      icon: 'coin' as const,
    },
    {
      x: PAD + cardW + gap,
      y: gridY,
      title: 'НЕ ВПУЩЕНО',
      value: progress.unitsAvoided.toLocaleString('ru-RU'),
      sub: `${progress.deviceLabel} • ${progress.poisonAvoided} яда`,
      accent: '#34d399',
      icon: 'shield' as const,
    },
    {
      x: PAD,
      y: gridY + cardH + gap,
      title: 'ВЕРНУЛ ЖИЗНИ',
      value: formatMinutes(progress.lifeRegainedMinutes),
      sub: 'дополнительного времени',
      accent: '#fb7185',
      icon: 'heart' as const,
    },
    {
      x: PAD + cardW + gap,
      y: gridY + cardH + gap,
      title: 'ВОССТАНОВЛЕНИЕ',
      value: `${recoveryPct}%`,
      sub: `${reachedHealth} из ${HEALTH_MILESTONES.length} этапов ВОЗ`,
      accent: '#38bdf8',
      icon: 'pulse' as const,
      barPct: recoveryPct / 100,
    },
  ];

  for (const c of cards) {
    drawGlassCard(ctx, c.x, c.y, cardW, cardH, 28);

    // Icon circle badge
    const icx = c.x + 42;
    const icy = c.y + 42;
    ctx.fillStyle = `${c.accent}22`;
    ctx.beginPath();
    ctx.arc(icx, icy, 22, 0, Math.PI * 2);
    ctx.fill();

    if (c.icon === 'coin') drawCoinIcon(ctx, icx, icy, 12, c.accent);
    else if (c.icon === 'shield') drawShieldIcon(ctx, icx, icy, 12, c.accent);
    else if (c.icon === 'heart') drawHeartIcon(ctx, icx, icy, 11, c.accent);
    else drawPulseIcon(ctx, icx, icy, 12, c.accent);

    // Card title
    ctx.fillStyle = 'rgba(209, 250, 229, 0.65)';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.title, c.x + 78, icy + 1);

    // Big value
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${c.value.length > 11 ? 34 : 42}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(c.value, c.x + 28, c.y + 122);

    // Mini progress bar or sublabel
    if (c.barPct !== undefined) {
      drawProgressBar(ctx, c.x + 28, c.y + 138, cardW - 56, 10, c.barPct, '#38bdf8', '#34d399');
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(c.sub, c.x + 28, c.y + 152);
    }
  }

  // ─── 5. Achievements & Goal Showcase Banner ───
  const achY = gridY + cardH * 2 + gap + 24;
  const achH = goal ? 188 : 164;
  drawGlassCard(ctx, PAD, achY, W - PAD * 2, achH, 28);

  const achCount = unlockedSet.size;
  const achTotal = ACHIEVEMENTS.length;

  drawStarIcon(ctx, PAD + 40, achY + 40, 14, '#fbbf24');
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('ДОСТИЖЕНИЯ', PAD + 66, achY + 41);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${achCount} / ${achTotal}`, W - PAD - 28, achY + 41);

  // Achievement progress bar
  drawProgressBar(ctx, PAD + 28, achY + 68, W - PAD * 2 - 56, 12, achCount / Math.max(1, achTotal), '#f59e0b', '#34d399');

  // Show up to 3 latest unlocked achievement pills (or encouragement)
  const unlockedList = ACHIEVEMENTS.filter((a) => unlockedSet.has(a.code)).slice(-3);
  const pillRowY = achY + 98;
  if (unlockedList.length > 0) {
    let px = PAD + 28;
    const maxRowX = W - PAD - 28;
    for (const a of unlockedList) {
      ctx.font = '600 17px sans-serif';
      const label = a.title;
      const pw = Math.min(maxRowX - px, ctx.measureText(label).width + 34);
      if (pw < 90) break;
      fillRoundRect(ctx, px, pillRowY, pw, 38, 19, 'rgba(251, 191, 36, 0.14)');
      strokeRoundRect(ctx, px, pillRowY, pw, 38, 19, 'rgba(251, 191, 36, 0.42)', 1.2);
      ctx.fillStyle = '#fef3c7';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, px + pw / 2, pillRowY + 20);
      px += pw + 12;
    }
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Первая ачивка откроется уже через 1 час свободы!', PAD + 28, pillRowY + 18);
  }

  // Optional Personal Financial Goal strip inside banner
  if (goal) {
    const gText = goal.reached
      ? `Цель «${goal.title}» достигнута!`
      : `Копилка «${goal.title}»: ${goal.percent}% (${goal.savedAmount.toLocaleString('ru-RU')} / ${goal.targetAmount.toLocaleString('ru-RU')} ₽)`;
    ctx.fillStyle = '#6ee7b7';
    ctx.font = '600 17px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(gText, PAD + 28, achY + achH - 24);
  }

  // ─── 6. Motivation Quote & Footer ───
  if (user.motivation) {
    const quoteY = achY + achH + 34;
    ctx.fillStyle = 'rgba(236, 253, 245, 0.72)';
    ctx.font = 'italic 21px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const lines = wrapText(ctx, `«${user.motivation}»`, W - PAD * 2 - 40, 2);
    lines.forEach((line, idx) => {
      ctx.fillText(line, W / 2, quoteY + idx * 28);
    });
  }

  // Footer divider
  const footerY = H - 82;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD, footerY);
  ctx.lineTo(W - PAD, footerY);
  ctx.stroke();

  // Bot handle on left
  ctx.fillStyle = 'rgba(167, 243, 208, 0.75)';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(config.botHandle, PAD, footerY + 34);

  // Date stamp on right
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(dateStr, W - PAD, footerY + 34);

  return canvas.toBuffer('image/png');
}
