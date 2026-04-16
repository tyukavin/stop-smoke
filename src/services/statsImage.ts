import { createCanvas } from 'canvas';
import type { DbUser } from '../types/index.js';
import { calcProgress, formatDuration, formatMinutes } from './progress.js';
import { ACHIEVEMENTS, getUserAchievements, checkAndUnlock } from './achievements.js';
import { getCravingStats } from './craving.js';

export function generateStatsImage(user: DbUser): Buffer {
  const progress = calcProgress(user);
  checkAndUnlock(user);
  const unlocked = new Set(getUserAchievements(user.id));
  const cravingStats = getCravingStats(user.id);

  const W = 800;
  const H = 1000;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0f1117');
  grad.addColorStop(1, '#1a1d27');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Border
  ctx.strokeStyle = '#2a2d3a';
  ctx.lineWidth = 2;
  ctx.roundRect(10, 10, W - 20, H - 20, 16);
  ctx.stroke();

  // Helper functions
  const drawText = (text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left', bold = false) => {
    ctx.fillStyle = color;
    ctx.font = `${bold ? 'bold ' : ''}${size}px sans-serif`;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
  };

  const drawRoundRect = (x: number, y: number, w: number, h: number, r: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  };

  let y = 50;

  // Header
  drawText('🔓 Моя свобода', W / 2, y, 28, '#00cec9', 'center', true);
  y += 20;
  const name = user.first_name || user.username || `ID ${user.telegram_id}`;
  drawText(name, W / 2, y + 20, 18, '#888', 'center');
  y += 55;

  // Main stats cards
  const stats = [
    { label: 'Дней свободы', value: formatDuration(progress.smokeFreeDays), icon: '📅' },
    { label: `Не использовано ${progress.deviceLabel}`, value: String(progress.unitsAvoided), icon: '🚫' },
    { label: 'Сэкономлено', value: `${progress.moneySaved.toLocaleString('ru')} ₽`, icon: '💰' },
    { label: 'Возвращено жизни', value: formatMinutes(progress.lifeRegainedMinutes), icon: '❤️' },
    { label: 'Не впущено вредных в-в', value: progress.poisonAvoided, icon: '☠️' },
  ];

  const cardW = (W - 80) / 2;
  const cardH = 70;
  const gap = 12;
  
  for (let i = 0; i < stats.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = 30 + col * (cardW + gap);
    const cy = y + row * (cardH + gap);
    
    drawRoundRect(cx, cy, i === stats.length - 1 && stats.length % 2 === 1 ? W - 60 : cardW, cardH, 10, '#22252f');
    drawText(stats[i].icon + ' ' + stats[i].value, cx + 14, cy + 30, 18, '#00cec9', 'left', true);
    drawText(stats[i].label, cx + 14, cy + 52, 12, '#888');
  }

  y += Math.ceil(stats.length / 2) * (cardH + gap) + 10;

  // Craving stats
  drawRoundRect(30, y, W - 60, 60, 10, '#22252f');
  drawText(`⚔️ Атак Чудовища: ${cravingStats.total}`, 44, y + 25, 14, '#e0e0e0', 'left', true);
  drawText(`Побеждено: ${cravingStats.resisted}`, 44, y + 45, 13, '#00b894');
  if (cravingStats.total > 0) {
    const winRate = Math.round((cravingStats.resisted / cravingStats.total) * 100);
    drawText(`${winRate}% побед`, W - 44, y + 35, 20, '#6c5ce7', 'right', true);
  }
  y += 80;

  // Achievements
  drawText('🏆 Достижения', 30, y, 20, '#e0e0e0', 'left', true);
  const achCount = [...unlocked].length;
  drawText(`${achCount}/${ACHIEVEMENTS.length}`, W - 30, y, 16, '#6c5ce7', 'right', true);
  y += 16;

  // Achievement grid
  const achPerRow = 6;
  const achSize = 42;
  const achGap = 8;
  const achStartX = 30;

  for (let i = 0; i < ACHIEVEMENTS.length; i++) {
    const ach = ACHIEVEMENTS[i];
    const col = i % achPerRow;
    const row = Math.floor(i / achPerRow);
    const ax = achStartX + col * (achSize + achGap + 75);
    const ay = y + row * (achSize + achGap + 4);
    
    const isUnlocked = unlocked.has(ach.code);
    drawRoundRect(ax, ay, achSize + 70, achSize, 8, isUnlocked ? '#1e3a2f' : '#1a1a22');
    
    ctx.globalAlpha = isUnlocked ? 1 : 0.3;
    drawText(ach.emoji, ax + 8, ay + 28, 20, '#fff');
    drawText(ach.title, ax + 34, ay + 18, 10, isUnlocked ? '#00cec9' : '#555', 'left', isUnlocked);
    if (isUnlocked) {
      drawText('✓', ax + achSize + 52, ay + 28, 14, '#00b894');
    }
    ctx.globalAlpha = 1;
  }

  y += Math.ceil(ACHIEVEMENTS.length / achPerRow) * (achSize + achGap + 4) + 20;

  // Motivation
  if (user.motivation) {
    drawRoundRect(30, Math.min(y, H - 80), W - 60, 50, 10, '#22252f');
    drawText(`💭 «${user.motivation.slice(0, 60)}${user.motivation.length > 60 ? '…' : ''}»`, W / 2, Math.min(y, H - 80) + 30, 14, '#aaa', 'center');
  }

  // Footer
  drawText('QuitSmoke Bot • @notsmokefun_bot', W / 2, H - 20, 11, '#555', 'center');

  return canvas.toBuffer('image/png');
}
