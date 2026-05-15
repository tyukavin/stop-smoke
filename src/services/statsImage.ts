import { createCanvas, type CanvasRenderingContext2D } from 'canvas';
import type { DbUser } from '../types/index.js';
import { config } from '../config.js';
import { calcProgress } from './progress.js';
import { ACHIEVEMENTS, getUserAchievements, checkAndUnlock } from './achievements.js';
import { getCravingStats, getCheckinCount } from './craving.js';

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

/** Лёгкие + листья + птицы (увеличенная версия для центральной иллюстрации) */
function drawLungsHero(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number) {
  const s = scale;

  // Свечение сзади
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 160 * s);
  glow.addColorStop(0, 'rgba(255,255,255,0.98)');
  glow.addColorStop(0.3, 'rgba(210,248,230,0.6)');
  glow.addColorStop(1, 'rgba(180,230,210,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 155 * s, 0, Math.PI * 2);
  ctx.fill();

  const leaf = '#2e7d32';
  const leafLight = '#66bb6a';
  const leafDark = '#1b5e20';

  // Левое «лёгкое» — три листа
  const drawLeafGroup = (offsetX: number, flip: boolean) => {
    const sign = flip ? -1 : 1;
    const leaves: [number, number, number, number, number][] = [
      // x, y, rx, ry, angle
      [offsetX, 0, 46, 70, -0.06 * sign],
      [offsetX - 22 * sign, -30, 32, 48, -0.35 * sign],
      [offsetX + 18 * sign, -18, 28, 42, 0.2 * sign],
    ];
    for (const [lx, ly, rx, ry, ang] of leaves) {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(ang);
      // основной лист
      ctx.fillStyle = leaf;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = leafDark;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      // центральная жилка
      ctx.strokeStyle = leafLight;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -ry + 5);
      ctx.quadraticCurveTo(6 * sign, 0, 0, ry - 5);
      ctx.stroke();
      // боковые жилки
      ctx.lineWidth = 1;
      for (let i = -1; i <= 1; i += 2) {
        ctx.beginPath();
        ctx.moveTo(i * rx * 0.35, -ry * 0.3);
        ctx.quadraticCurveTo(i * rx * 0.6, ry * 0.1, i * rx * 0.25, ry * 0.55);
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  ctx.save();
  ctx.translate(cx - 58 * s, cy);
  ctx.scale(s, s);
  drawLeafGroup(0, false);
  ctx.restore();

  ctx.save();
  ctx.translate(cx + 58 * s, cy);
  ctx.scale(s, s);
  drawLeafGroup(0, true);
  ctx.restore();

  // Стебель-трахея
  ctx.save();
  ctx.translate(cx, cy + 20 * s);
  ctx.scale(s, s);
  ctx.strokeStyle = '#2e7d32';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -90);
  ctx.quadraticCurveTo(0, -30, 0, 20);
  ctx.stroke();
  ctx.restore();

  // Птицы
  ctx.fillStyle = 'rgba(255,255,255,0.93)';
  const birds: [number, number, number][] = [
    [-130, -55, 0.95],
    [120, -65, 0.78],
    [-100, 60, 0.68],
    [108, 50, 0.72],
    [-60, -80, 0.55],
    [65, -75, 0.5],
  ];
  for (const [bx, by, sz] of birds) {
    ctx.save();
    ctx.translate(cx + bx * s, cy + by * s);
    ctx.scale(sz * s, sz * s);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(7, -6, 17, -2);
    ctx.quadraticCurveTo(9, 4, 0, 0);
    ctx.fill();
    ctx.restore();
  }
}

/** Иконка календаря — для «ДНЕЙ БЕЗ ДЫМА» */
function drawCalendarIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const w = size;
  const h = size * 1.1;
  const x = cx - w / 2;
  const y = cy - h / 2;
  // тело
  fillRoundRect(ctx, x, y, w, h, 7, '#fff');
  strokeRoundRect(ctx, x, y, w, h, 7, '#b8860b', 2);
  // шапка
  ctx.fillStyle = '#c9a227';
  ctx.save();
  roundRectPath(ctx, x, y, w, h * 0.3, 7);
  ctx.fill();
  // fix bottom of header to be flat
  ctx.fillRect(x, y + h * 0.15, w, h * 0.15);
  ctx.restore();
  // петли
  ctx.strokeStyle = '#8a6c0a';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  [[x + w * 0.28, y], [x + w * 0.72, y]].forEach(([px, py]) => {
    ctx.beginPath();
    ctx.moveTo(px, py + 4);
    ctx.lineTo(px, py - 5);
    ctx.stroke();
  });
  // точки сетки
  ctx.fillStyle = '#aaa';
  const dotR = size * 0.045;
  const rowY = [y + h * 0.52, y + h * 0.72];
  const colX = [x + w * 0.22, x + w * 0.5, x + w * 0.78];
  for (const ry of rowY) {
    for (const rx of colX) {
      ctx.beginPath();
      ctx.arc(rx, ry, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Иконка мини-лёгких */
function drawMiniLungIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const r = size * 0.42;
  // левая доля
  ctx.fillStyle = '#43a047';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.55, cy, r * 0.42, r * 0.7, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2e7d32';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // правая доля
  ctx.beginPath();
  ctx.ellipse(cx + r * 0.55, cy, r * 0.42, r * 0.7, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2e7d32';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // трахея
  ctx.strokeStyle = '#1b5e20';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.5);
  ctx.lineTo(cx, cy - r * 1.05);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.55, cy - r * 0.3);
  ctx.quadraticCurveTo(cx, cy - r * 0.6, cx + r * 0.55, cy - r * 0.3);
  ctx.stroke();
}

/** Иконка мешка с деньгами */
function drawMoneySackIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const r = size * 0.42;
  // тело мешка
  const g = ctx.createRadialGradient(cx, cy + r * 0.1, r * 0.1, cx, cy + r * 0.1, r * 0.9);
  g.addColorStop(0, '#f5e06a');
  g.addColorStop(1, '#c9a227');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.15, r * 0.78, r * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#9a7b1a';
  ctx.lineWidth = 2;
  ctx.stroke();
  // «шея» мешка
  ctx.fillStyle = '#e0c060';
  ctx.beginPath();
  ctx.ellipse(cx, cy - r * 0.55, r * 0.28, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#9a7b1a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // символ $
  ctx.fillStyle = '#5a3e10';
  ctx.font = `bold ${size * 0.38}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', cx, cy + r * 0.18);
}

/** Иконка лампочки */
function drawBulbIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const r = size * 0.38;
  // свечение
  const glow = ctx.createRadialGradient(cx, cy - r * 0.1, 0, cx, cy - r * 0.1, r * 1.5);
  glow.addColorStop(0, 'rgba(255,245,100,0.55)');
  glow.addColorStop(1, 'rgba(255,245,100,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.1, r * 1.5, 0, Math.PI * 2);
  ctx.fill();
  // колба
  const bg = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.4, 0, cx, cy - r * 0.1, r);
  bg.addColorStop(0, '#fff9c4');
  bg.addColorStop(0.6, '#fdd835');
  bg.addColorStop(1, '#f9a825');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.15, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e65100';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // цоколь
  ctx.fillStyle = '#bdbdbd';
  ctx.fillRect(cx - r * 0.42, cy + r * 0.75, r * 0.84, r * 0.55);
  ctx.fillStyle = '#9e9e9e';
  ctx.fillRect(cx - r * 0.36, cy + r * 1.3, r * 0.72, r * 0.25);
  // нить
  ctx.strokeStyle = '#ef6c00';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.8);
  ctx.quadraticCurveTo(cx + r * 0.2, cy - r * 0.1, cx, cy + r * 0.4);
  ctx.stroke();
}

/** Прогресс-бар */
function statBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pct: number) {
  fillRoundRect(ctx, x, y, w, h, h / 2, '#d0e8e0');
  const p = Math.max(0, Math.min(1, pct));
  if (p > 0.01) {
    const g = ctx.createLinearGradient(x, y, x + w * p, y);
    g.addColorStop(0, '#81c784');
    g.addColorStop(1, '#2e7d32');
    fillRoundRect(ctx, x, y, Math.max(h, w * p), h, h / 2, g);
  }
}

/** Прямоугольная рамка-ячейка со значением */
function drawValueBox(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  value: string,
  fontSize: number
) {
  const x = cx - w / 2;
  const y = cy - h / 2;
  fillRoundRect(ctx, x, y, w, h, 6, 'rgba(255,255,255,0.55)');
  strokeRoundRect(ctx, x, y, w, h, 6, 'rgba(80,110,90,0.35)', 1.5);
  ctx.fillStyle = '#2d3a35';
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, cx, cy + 1);
}

export function generateStatsImage(user: DbUser): Buffer {
  const progress = calcProgress(user);
  checkAndUnlock(user);
  const unlocked = new Set(getUserAchievements(user.id));
  const cravingStats = getCravingStats(user.id);
  const checkins = getCheckinCount(user.id);

  const W = 576;
  const H = 900;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const PAD = 28;
  const cardR = 32;

  // Внешнее свечение (имитация тени)
  for (let i = 6; i >= 1; i--) {
    ctx.save();
    ctx.globalAlpha = 0.03 + (7 - i) * 0.018;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#ffd700');
    g.addColorStop(1, '#daa520');
    strokeRoundRect(ctx, 8 - i, 8 - i, W - 16 + i * 2, H - 16 + i * 2, cardR + i, g, 4);
    ctx.restore();
  }

  // Фон карточки: мятный градиент
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#b8ded6');
  bg.addColorStop(0.4, '#ddf3eb');
  bg.addColorStop(1, '#a8d8cc');
  fillRoundRect(ctx, 12, 12, W - 24, H - 24, cardR, bg);
  strokeRoundRect(ctx, 12, 12, W - 24, H - 24, cardR, 'rgba(184,134,11,0.35)', 2);

  const gold = '#8a6a10';
  const goldMid = '#b8930e';
  const dark = '#2d3a35';

  const txt = (
    s: string,
    x: number,
    y: number,
    sz: number,
    color: string,
    align: CanvasTextAlign = 'center',
    bold = false,
    italic = false
  ) => {
    ctx.fillStyle = color;
    ctx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${sz}px ${italic ? 'Georgia, serif' : 'sans-serif'}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(s, x, y);
  };

  // ─── Заголовок ───
  let y = 60;
  txt('ВАШ УСПЕХ', W / 2, y, 36, gold, 'center', true);
  y += 14;

  // ─── Центральная иллюстрация ───
  drawLungsHero(ctx, W / 2, y + 125, 1);
  y += 262;

  // ─── СТАТИСТИКА ───
  txt('СТАТИСТИКА', W / 2, y, 20, goldMid, 'center', false, true);
  y += 30;

  // Вычисляем значения
  const days = progress.smokeFreeDays;
  const winRate = cravingStats.total > 0 ? cravingStats.resisted / cravingStats.total : 0.5;
  const recoveryPct = Math.min(99, Math.round(20 + days * 1.1 + winRate * 40));
  const healthEnergy = Math.min(99, Math.round(10 + days * 0.75 + Math.min(30, checkins * 1.3)));
  const moneySaved = Math.round(progress.moneySaved);

  // Четыре колонки
  const colW = (W - PAD * 2) / 4;
  const colX = [0, 1, 2, 3].map((i) => PAD + colW * i + colW / 2);

  const iconSize = 46;
  const iconY = y + iconSize / 2 + 4;

  // Иконки
  drawCalendarIcon(ctx, colX[0], iconY, iconSize);
  drawMiniLungIcon(ctx, colX[1], iconY, iconSize);
  drawMoneySackIcon(ctx, colX[2], iconY, iconSize);
  drawBulbIcon(ctx, colX[3], iconY, iconSize);

  y += iconSize + 14;

  // Подписи колонок
  ctx.font = '9px sans-serif';
  ctx.fillStyle = '#4a6055';
  ctx.textBaseline = 'alphabetic';
  const labels = ['ДНЕЙ БЕЗ ДЫМА', 'ВОССТАНОВЛЕНИЕ', 'СБЕРЕЖЕНИЯ', 'ЗДОРОВЬЕ\nИ ЭНЕРГИЯ'];
  labels.forEach((lab, i) => {
    ctx.textAlign = 'center';
    const parts = lab.split('\n');
    if (parts.length === 1) {
      ctx.fillText(lab, colX[i], y);
    } else {
      ctx.fillText(parts[0], colX[i], y);
      ctx.fillText(parts[1], colX[i], y + 11);
    }
  });
  y += 24;

  // Прогресс-бар восстановления под 2-й колонкой
  const barW = colW - 14;
  statBar(ctx, colX[1] - barW / 2, y, barW, 9, recoveryPct / 100);
  y += 20;

  // Значения в рамочках [ ___ ]
  const boxH = 32;
  const boxW = colW - 14;
  const boxY = y + boxH / 2;

  drawValueBox(ctx, colX[0], boxY, boxW, boxH, String(days), 15);
  drawValueBox(ctx, colX[1], boxY, boxW, boxH, `${recoveryPct}%`, 14);
  drawValueBox(ctx, colX[2], boxY, boxW, boxH, `${moneySaved.toLocaleString('ru-RU')}₽`, 13);
  drawValueBox(ctx, colX[3], boxY, boxW, boxH, `+${healthEnergy}%`, 14);

  y += boxH + 24;

  // ─── Баннер «СЛЕДУЮЩИЙ ШАГ» ───
  const next = nextMilestoneDays(days);
  const bannerG = ctx.createLinearGradient(PAD, y, W - PAD, y);
  bannerG.addColorStop(0, '#e8d898');
  bannerG.addColorStop(0.5, '#f7ecb0');
  bannerG.addColorStop(1, '#e8d898');
  fillRoundRect(ctx, PAD, y, W - PAD * 2, 46, 14, bannerG);
  strokeRoundRect(ctx, PAD, y, W - PAD * 2, 46, 14, 'rgba(184,134,11,0.4)', 1.5);
  txt(`СЛЕДУЮЩИЙ ШАГ: ${next} ДНЕЙ!`, W / 2, y + 31, 15, dark, 'center', true);

  y += 68;

  // ─── Дополнительная статистика ───
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#3d5048';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const achN = unlocked.size;
  ctx.fillText(`Достижения: ${achN} / ${ACHIEVEMENTS.length}`, W / 2, y);

  if (user.motivation) {
    y += 22;
    const mot = user.motivation.length > 70 ? user.motivation.slice(0, 69) + '…' : user.motivation;
    ctx.font = 'italic 11px Georgia, serif';
    ctx.fillStyle = '#3d5048';
    ctx.textAlign = 'center';
    ctx.fillText(`«${mot}»`, W / 2, y);
  }

  // ─── Подвал ───
  const footerY = H - 78;
  ctx.strokeStyle = 'rgba(184,134,11,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, footerY);
  ctx.lineTo(W - PAD, footerY);
  ctx.stroke();

  // Имя бота (из конфига / .env)
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#6d7a73';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(config.botHandle, PAD + 8, footerY + 28);

  // Бейдж «achievement unlocked»
  const badgeW = 160;
  const badgeH = 28;
  const bx = W - PAD - badgeW - 4;
  const by = footerY + 10;
  const badgeG = ctx.createLinearGradient(bx, by, bx + badgeW, by);
  badgeG.addColorStop(0, '#f0d870');
  badgeG.addColorStop(1, '#daa520');
  fillRoundRect(ctx, bx, by, badgeW, badgeH, badgeH / 2, badgeG);
  strokeRoundRect(ctx, bx, by, badgeW, badgeH, badgeH / 2, 'rgba(139,105,20,0.5)', 1);
  ctx.font = 'italic 10px Georgia, serif';
  ctx.fillStyle = '#4a3c10';
  ctx.textAlign = 'center';
  ctx.fillText('achievement unlocked', bx + badgeW / 2, by + 19);

  return canvas.toBuffer('image/png');
}
