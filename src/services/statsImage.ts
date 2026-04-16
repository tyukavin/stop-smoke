import { createCanvas, type CanvasRenderingContext2D } from 'canvas';
import type { DbUser } from '../types/index.js';
import { calcProgress, formatDuration, formatMinutes } from './progress.js';
import { ACHIEVEMENTS, getUserAchievements, checkAndUnlock } from './achievements.js';
import { getCravingStats, getCheckinCount } from './craving.js';

export function generateStatsImage(user: DbUser): Buffer {
  const progress = calcProgress(user);
  checkAndUnlock(user);
  const unlocked = new Set(getUserAchievements(user.id));
  const cravingStats = getCravingStats(user.id);
  const checkins = getCheckinCount(user.id);

  const W = 800;
  const H = 1100;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const PAD = 32;

  // ═══════ BACKGROUND ═══════
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0a0e1a');
  bgGrad.addColorStop(0.5, '#111827');
  bgGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Decorative circles
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = '#6c5ce7';
  ctx.beginPath(); ctx.arc(W - 80, 120, 200, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#00cec9';
  ctx.beginPath(); ctx.arc(80, H - 150, 180, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fd79a8';
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 300, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Border with glow
  const borderGrad = ctx.createLinearGradient(0, 0, W, H);
  borderGrad.addColorStop(0, '#6c5ce7');
  borderGrad.addColorStop(0.5, '#00cec9');
  borderGrad.addColorStop(1, '#fd79a8');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(8, 8, W - 16, H - 16, 20); ctx.stroke();

  // Inner subtle border
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(14, 14, W - 28, H - 28, 17); ctx.stroke();

  // ═══════ HELPERS ═══════
  const text = (s: string, x: number, y: number, sz: number, color: string, align: CanvasTextAlign = 'left', bold = false) => {
    ctx.fillStyle = color;
    ctx.font = `${bold ? 'bold ' : ''}${sz}px sans-serif`;
    ctx.textAlign = align;
    ctx.fillText(s, x, y);
  };

  const roundRect = (x: number, y: number, w: number, h: number, r: number, fill: string, border?: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
    if (border) { ctx.strokeStyle = border; ctx.lineWidth = 1; ctx.stroke(); }
  };

  const progressBar = (x: number, y: number, w: number, h: number, pct: number, color1: string, color2: string) => {
    roundRect(x, y, w, h, h / 2, 'rgba(255,255,255,0.06)');
    if (pct > 0) {
      const grad = ctx.createLinearGradient(x, y, x + w, y);
      grad.addColorStop(0, color1);
      grad.addColorStop(1, color2);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, Math.max(h, w * Math.min(pct, 1)), h, h / 2);
      ctx.fill();
    }
  };

  let y = 40;
  const name = user.first_name || user.username || `User`;

  // ═══════ HEADER ═══════
  // Avatar circle with gradient border
  const avX = W / 2, avY = y + 40;
  const avGrad = ctx.createLinearGradient(avX - 40, avY - 40, avX + 40, avY + 40);
  avGrad.addColorStop(0, '#6c5ce7');
  avGrad.addColorStop(1, '#00cec9');
  ctx.strokeStyle = avGrad;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(avX, avY, 36, 0, Math.PI * 2); ctx.stroke();

  // Avatar letter
  const letter = (name[0] || '?').toUpperCase();
  ctx.fillStyle = 'rgba(108,92,231,0.2)';
  ctx.beginPath(); ctx.arc(avX, avY, 34, 0, Math.PI * 2); ctx.fill();
  text(letter, avX, avY + 12, 32, '#e0e0e0', 'center', true);

  text(name, avX, avY + 56, 20, '#e0e0e0', 'center', true);

  // Days badge
  const daysText = `${progress.smokeFreeDays} дн. свободы`;
  const daysBadgeW = ctx.measureText(daysText).width + 40;
  const titleGrad = ctx.createLinearGradient(avX - daysBadgeW / 2, avY + 66, avX + daysBadgeW / 2, avY + 66);
  titleGrad.addColorStop(0, '#6c5ce7');
  titleGrad.addColorStop(1, '#00cec9');
  ctx.fillStyle = titleGrad;
  ctx.beginPath(); ctx.roundRect(avX - daysBadgeW / 2, avY + 66, daysBadgeW, 28, 14); ctx.fill();
  text(daysText, avX, avY + 85, 14, '#fff', 'center', true);

  y = avY + 110;

  // ═══════ MAIN STATS GRID ═══════
  const statsData = [
    { icon: '🚫', value: String(progress.unitsAvoided), label: `${progress.deviceLabel} не использовано`, color: '#e74c3c' },
    { icon: '💰', value: `${progress.moneySaved.toLocaleString('ru')} ₽`, label: 'сэкономлено', color: '#f39c12' },
    { icon: '❤️', value: formatMinutes(progress.lifeRegainedMinutes), label: 'возвращено жизни', color: '#e84393' },
    { icon: '☠️', value: progress.poisonAvoided, label: 'яда не впущено', color: '#00b894' },
  ];

  const cardW = (W - PAD * 2 - 12) / 2;
  const cardH = 80;

  for (let i = 0; i < statsData.length; i++) {
    const s = statsData[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = PAD + col * (cardW + 12);
    const cy = y + row * (cardH + 10);

    roundRect(cx, cy, cardW, cardH, 12, 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.06)');

    // Colored dot
    ctx.fillStyle = s.color;
    ctx.beginPath(); ctx.arc(cx + 18, cy + 25, 5, 0, Math.PI * 2); ctx.fill();

    text(s.icon + ' ' + s.value, cx + 32, cy + 32, 18, '#fff', 'left', true);
    text(s.label, cx + 16, cy + 56, 11, '#888');
  }

  y += 2 * (cardH + 10) + 12;

  // ═══════ CRAVING BATTLE BAR ═══════
  roundRect(PAD, y, W - PAD * 2, 75, 14, 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.06)');

  const winRate = cravingStats.total > 0 ? cravingStats.resisted / cravingStats.total : 0;
  text('⚔️ Битвы с Чудовищем', PAD + 16, y + 24, 14, '#e0e0e0', 'left', true);

  const barX = PAD + 16;
  const barW = W - PAD * 2 - 32;
  progressBar(barX, y + 34, barW, 12, winRate, '#6c5ce7', '#00cec9');

  text(`${cravingStats.resisted}/${cravingStats.total} побед`, barX, y + 65, 12, '#888');
  if (cravingStats.total > 0) {
    text(`${Math.round(winRate * 100)}%`, barX + barW, y + 65, 16, '#00cec9', 'right', true);
  }
  text(`📋 ${checkins} чекинов`, barX + barW / 2, y + 65, 12, '#888', 'center');

  y += 90;

  // ═══════ ACHIEVEMENTS ═══════
  const achGrad = ctx.createLinearGradient(PAD, y, W - PAD, y);
  achGrad.addColorStop(0, '#6c5ce7');
  achGrad.addColorStop(1, '#00cec9');
  text('🏆 Достижения', PAD, y + 4, 16, '#e0e0e0', 'left', true);
  const achCount = unlocked.size;
  const achPct = achCount / ACHIEVEMENTS.length;

  // Achievement progress bar
  progressBar(PAD + 160, y - 6, 200, 10, achPct, '#f39c12', '#fd79a8');
  text(`${achCount}/${ACHIEVEMENTS.length}`, PAD + 370, y + 4, 13, '#f39c12', 'left', true);

  y += 20;

  // Achievement pills — 3 per row
  const pillW = (W - PAD * 2 - 20) / 3;
  const pillH = 36;
  const pillGap = 8;

  for (let i = 0; i < ACHIEVEMENTS.length; i++) {
    const ach = ACHIEVEMENTS[i];
    const col = i % 3;
    const row = Math.floor(i / 3);
    const px = PAD + col * (pillW + pillGap / 2 + 2);
    const py = y + row * (pillH + 6);
    const isOn = unlocked.has(ach.code);

    if (isOn) {
      const pillGr = ctx.createLinearGradient(px, py, px + pillW, py);
      pillGr.addColorStop(0, 'rgba(0,206,201,0.15)');
      pillGr.addColorStop(1, 'rgba(108,92,231,0.15)');
      ctx.fillStyle = pillGr;
      ctx.beginPath(); ctx.roundRect(px, py, pillW, pillH, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(0,206,201,0.3)';
      ctx.lineWidth = 1; ctx.stroke();
    } else {
      roundRect(px, py, pillW, pillH, 10, 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)');
    }

    ctx.globalAlpha = isOn ? 1 : 0.25;
    text(ach.emoji, px + 10, py + 24, 16, '#fff');
    const titleTrunc = ach.title.length > 14 ? ach.title.slice(0, 13) + '…' : ach.title;
    text(titleTrunc, px + 32, py + 22, 11, isOn ? '#00cec9' : '#555', 'left', isOn);
    if (isOn) {
      text('✓', px + pillW - 14, py + 23, 13, '#00b894', 'right', true);
    }
    ctx.globalAlpha = 1;
  }

  y += Math.ceil(ACHIEVEMENTS.length / 3) * (pillH + 6) + 16;

  // ═══════ MOTIVATION ═══════
  if (user.motivation) {
    const motY = Math.min(y, H - 100);
    roundRect(PAD, motY, W - PAD * 2, 48, 12, 'rgba(108,92,231,0.1)', 'rgba(108,92,231,0.2)');
    const motText = user.motivation.length > 70 ? user.motivation.slice(0, 69) + '…' : user.motivation;
    text(`💭 «${motText}»`, W / 2, motY + 30, 13, '#a29bfe', 'center');
  }

  // ═══════ FOOTER ═══════
  const footGrad = ctx.createLinearGradient(0, H - 50, W, H - 50);
  footGrad.addColorStop(0, '#6c5ce7');
  footGrad.addColorStop(1, '#00cec9');
  ctx.fillStyle = footGrad;
  ctx.fillRect(PAD, H - 42, W - PAD * 2, 1);

  text('🔓 QuitSmoke Bot', W / 2, H - 20, 12, '#555', 'center');
  text('@notsmokefun_bot', W / 2, H - 6, 10, '#444', 'center');

  return canvas.toBuffer('image/png');
}
