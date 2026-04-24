import { createCanvas, type CanvasRenderingContext2D } from 'canvas';
import type { DbUser } from '../types/index.js';
import { calcProgress, formatMinutes } from './progress.js';
import { ACHIEVEMENTS, getUserAchievements, checkAndUnlock } from './achievements.js';
import { getCravingStats, getCheckinCount } from './craving.js';

const BOT_HANDLE = '@notsmokefun_bot';

function nextMilestoneDays(current: number): number {
  const steps = [7, 14, 21, 30, 50, 100, 180, 365, 500, 730, 1000];
  for (const d of steps) {
    if (d > current) return d;
  }
  return current + 100;
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

/** Упрощённая иллюстрация: лёгкие + листья + птицы */
function drawLungsHero(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number) {
  const s = scale;
  // Свечение сзади
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 140 * s);
  glow.addColorStop(0, 'rgba(255,255,255,0.95)');
  glow.addColorStop(0.35, 'rgba(200,245,220,0.5)');
  glow.addColorStop(1, 'rgba(200,235,220,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 135 * s, 0, Math.PI * 2);
  ctx.fill();

  const leaf = '#2e7d32';
  const leafLight = '#43a047';
  const leafDark = '#1b5e20';

  // Левое «лёгкое»
  ctx.save();
  ctx.translate(cx - 55 * s, cy);
  ctx.scale(s, s);
  ctx.fillStyle = leaf;
  ctx.beginPath();
  ctx.ellipse(0, 0, 48, 72, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = leafDark;
  ctx.lineWidth = 2;
  ctx.stroke();
  // жилки
  ctx.strokeStyle = leafLight;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -60);
  ctx.quadraticCurveTo(8, 0, 0, 65);
  ctx.stroke();
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 18, -35);
    ctx.quadraticCurveTo(i * 28, 5, i * 12, 50);
    ctx.stroke();
  }
  ctx.restore();

  // Правое
  ctx.save();
  ctx.translate(cx + 55 * s, cy);
  ctx.scale(s, s);
  ctx.fillStyle = leaf;
  ctx.beginPath();
  ctx.ellipse(0, 0, 48, 72, 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = leafDark;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = leafLight;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -60);
  ctx.quadraticCurveTo(-8, 0, 0, 65);
  ctx.stroke();
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 18, -35);
    ctx.quadraticCurveTo(i * 28, 5, i * 12, 50);
    ctx.stroke();
  }
  ctx.restore();

  // Простые «птицы»
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  const birds: [number, number, number][] = [
    [-120, -35, 0.9],
    [115, -50, 0.75],
    [-95, 55, 0.65],
    [100, 40, 0.7],
  ];
  for (const [bx, by, sz] of birds) {
    ctx.save();
    ctx.translate(cx + bx * s, cy + by * s);
    ctx.scale(sz * s, sz * s);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(8, -6, 18, -2);
    ctx.quadraticCurveTo(10, 4, 0, 0);
    ctx.fill();
    ctx.restore();
  }
}

function drawCalendarIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, dayNum: string) {
  const w = size;
  const h = size * 1.05;
  ctx.fillStyle = '#fff';
  fillRoundRect(ctx, x, y, w, h, 6);
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 2;
  strokeRoundRect(ctx, x, y, w, h, 6, '#b8860b', 2);
  ctx.fillStyle = '#c9a227';
  ctx.fillRect(x, y, w, h * 0.28);
  ctx.fillStyle = '#2e7d32';
  ctx.font = `bold ${size * 0.42}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(dayNum, x + w / 2, y + h * 0.62);
}

function drawMiniLung(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = '#43a047';
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.45, r * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + r * 0.55, y, r * 0.45, r * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawRubleIcon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = `bold ${r * 1.1}px sans-serif`;
  ctx.fillStyle = '#b8860b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('₽', x, y + 1);
}

function drawBulb(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  const s = scale;
  ctx.fillStyle = '#fdd835';
  ctx.beginPath();
  ctx.arc(x, y - 4 * s, 12 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fbc02d';
  ctx.fillRect(x - 6 * s, y + 4 * s, 12 * s, 8 * s);
  ctx.fillStyle = '#b8860b';
  ctx.fillRect(x - 4 * s, y + 12 * s, 8 * s, 3 * s);
}

function statBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pct: number) {
  fillRoundRect(ctx, x, y, w, h, h / 2, '#e0e8e4');
  const p = Math.max(0, Math.min(1, pct));
  if (p > 0) {
    const g = ctx.createLinearGradient(x, y, x + w * p, y);
    g.addColorStop(0, '#66bb6a');
    g.addColorStop(1, '#2e7d32');
    fillRoundRect(ctx, x, y, Math.max(h, w * p), h, h / 2, g);
  }
}

export function generateStatsImage(user: DbUser): Buffer {
  const progress = calcProgress(user);
  checkAndUnlock(user);
  const unlocked = new Set(getUserAchievements(user.id));
  const cravingStats = getCravingStats(user.id);
  const checkins = getCheckinCount(user.id);

  const W = 720;
  const H = 1180;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const PAD = 36;
  const cardR = 28;

  // Внешнее свечение (имитация)
  for (let i = 6; i >= 1; i--) {
    ctx.save();
    ctx.globalAlpha = 0.04 + (7 - i) * 0.02;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#ffd700');
    g.addColorStop(1, '#daa520');
    strokeRoundRect(ctx, 10 - i, 10 - i, W - 20 + i * 2, H - 20 + i * 2, cardR + i, g, 4);
    ctx.restore();
  }

  // Карточка: мятный градиент
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#c5ebe3');
  bg.addColorStop(0.45, '#e8f7f1');
  bg.addColorStop(1, '#b8e0d4');
  fillRoundRect(ctx, 14, 14, W - 28, H - 28, cardR, bg);
  strokeRoundRect(ctx, 14, 14, W - 28, H - 28, cardR, 'rgba(184, 134, 11, 0.35)', 2);

  const gold = '#9a7b1a';
  const goldLight = '#c9a227';
  const dark = '#2d3a35';

  const text = (
    s: string,
    x: number,
    y: number,
    sz: number,
    color: string,
    align: CanvasTextAlign = 'left',
    bold = false,
    fontFamily = 'sans-serif'
  ) => {
    ctx.fillStyle = color;
    ctx.font = `${bold ? 'bold ' : ''}${sz}px ${fontFamily}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(s, x, y);
  };

  let y = 52;

  // Заголовок
  text('ВАШ УСПЕХ', W / 2, y, 34, gold, 'center', true, 'sans-serif');
  y += 18;

  // Герой
  drawLungsHero(ctx, W / 2, y + 130, 1);
  y += 268;

  // Подзаголовок статистики
  text('СТАТИСТИКА', W / 2, y, 22, goldLight, 'center', false, 'Georgia, "Times New Roman", serif');
  y += 36;

  const days = progress.smokeFreeDays;
  const winRate = cravingStats.total > 0 ? cravingStats.resisted / cravingStats.total : 0.55;
  const recoveryPct = Math.min(99, Math.round(22 + days * 1.05 + winRate * 38));
  const healthEnergy = Math.min(99, Math.round(12 + days * 0.7 + Math.min(28, checkins * 1.2)));

  const colW = (W - PAD * 2) / 4;
  const colCenters = [0, 1, 2, 3].map((i) => PAD + colW * i + colW / 2);

  // Иконки и числа — 4 колонки
  const iconY = y;
  drawCalendarIcon(ctx, colCenters[0] - 26, iconY, 52, String(days));
  drawMiniLung(ctx, colCenters[1], iconY + 28, 32);
  drawRubleIcon(ctx, colCenters[2], iconY + 28, 22);
  drawBulb(ctx, colCenters[3], iconY + 22, 1);

  y += 78;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = dark;
  ctx.textAlign = 'center';
  ctx.fillText(String(days), colCenters[0], y);
  ctx.fillText(`${recoveryPct}%`, colCenters[1], y);
  ctx.fillText(progress.moneySaved.toLocaleString('ru-RU'), colCenters[2], y);
  ctx.fillText(`+${healthEnergy}%`, colCenters[3], y);

  y += 6;
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#5a6d66';
  const labels = ['ДНЕЙ БЕЗ ДЫМА', 'ВОССТАНОВЛЕНИЕ', 'СБЕРЕЖЕНИЯ', 'ЗДОРОВЬЕ И ЭНЕРГИЯ'];
  labels.forEach((lab, i) => {
    ctx.fillText(lab, colCenters[i], y + 14);
  });

  y += 36;
  // Полоса восстановления под 2-й колонкой
  const barW = colW - 16;
  statBar(ctx, colCenters[1] - barW / 2, y, barW, 10, recoveryPct / 100);
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#5a6d66';
  ctx.fillText(`${recoveryPct}% complete`, colCenters[1], y + 24);

  y += 44;

  // Следующий шаг
  const next = nextMilestoneDays(days);
  const bannerGrad = ctx.createLinearGradient(PAD, y, W - PAD, y);
  bannerGrad.addColorStop(0, '#e8d89a');
  bannerGrad.addColorStop(0.5, '#f5e6a8');
  bannerGrad.addColorStop(1, '#e8d89a');
  fillRoundRect(ctx, PAD, y, W - PAD * 2, 44, 12, bannerGrad);
  ctx.strokeStyle = 'rgba(184, 134, 11, 0.4)';
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, PAD, y, W - PAD * 2, 44, 12, 'rgba(184, 134, 11, 0.4)', 1);
  text(`СЛЕДУЮЩИЙ ШАГ: ${next} ДНЕЙ!`, W / 2, y + 30, 15, dark, 'center', true);

  y += 64;

  // Доп. строка: жизнь + яд (компактно)
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#4a5c55';
  ctx.textAlign = 'center';
  ctx.fillText(
    `❤️ ${formatMinutes(progress.lifeRegainedMinutes)} жизни  ·  🚫 ${progress.poisonAvoided} яда`,
    W / 2,
    y
  );
  y += 28;

  // Достижения — одна строка счётчика
  const achN = unlocked.size;
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#5a6d66';
  ctx.fillText(`Достижения: ${achN} / ${ACHIEVEMENTS.length}`, W / 2, y);

  y += 36;
  if (user.motivation) {
    const mot = user.motivation.length > 80 ? user.motivation.slice(0, 79) + '…' : user.motivation;
    ctx.font = 'italic 12px Georgia, serif';
    ctx.fillStyle = '#4a5c55';
    ctx.fillText(`«${mot}»`, W / 2, y);
    y += 28;
  }

  // Подвал
  y = H - 88;
  ctx.strokeStyle = 'rgba(184, 134, 11, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();

  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#6d7a73';
  ctx.textAlign = 'left';
  ctx.fillText(BOT_HANDLE, PAD + 8, y + 28);

  // Бейдж
  const badgeW = 168;
  const badgeH = 30;
  const bx = W - PAD - badgeW - 4;
  const by = y + 10;
  const badgeG = ctx.createLinearGradient(bx, by, bx + badgeW, by);
  badgeG.addColorStop(0, '#f0d878');
  badgeG.addColorStop(1, '#daa520');
  fillRoundRect(ctx, bx, by, badgeW, badgeH, badgeH / 2, badgeG);
  ctx.strokeStyle = 'rgba(139, 105, 20, 0.5)';
  strokeRoundRect(ctx, bx, by, badgeW, badgeH, badgeH / 2, 'rgba(139, 105, 20, 0.5)', 1);
  ctx.font = 'italic 11px Georgia, serif';
  ctx.fillStyle = '#4a3c10';
  ctx.textAlign = 'center';
  ctx.fillText('achievement unlocked', bx + badgeW / 2, by + 20);

  return canvas.toBuffer('image/png');
}
