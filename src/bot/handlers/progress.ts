import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { mainMenuKb } from '../keyboards/main.js';
import { getUser } from '../../services/user.js';
import { calcProgress, formatDuration, formatMinutes } from '../../services/progress.js';
import { checkAndUnlock, formatAchievement } from '../../services/achievements.js';

export function progressHandlers(bot: Bot<BotContext>) {
  bot.hears('🔓 Моя свобода', async (ctx) => {
    const user = getUser(ctx.from!.id);
    if (!user?.onboarding_done) { await ctx.reply('Сначала /start'); return; }

    const p = calcProgress(user);
    const newAch = checkAndUnlock(user);

    let text =
      `🔓 <b>Ты наслаждаешься свободой уже ${formatDuration(p.smokeFreeDays)}!</b>\n\n` +
      `🚫 Не впустил: <b>${p.poisonAvoided} вредных веществ</b> (${p.unitsAvoided} ${p.deviceLabel})\n` +
      `💰 Не отдал: <b>${p.moneySaved.toLocaleString('ru')}₽</b>\n` +
      `❤️ Вернул жизни: <b>${formatMinutes(p.lifeRegainedMinutes)}</b>\n`;

    if (user.motivation) text += `\n💭 Твоя причина: <i>«${user.motivation}»</i>\n`;
    text += '\nС каждым днём Чудовище слабеет. 💪';

    if (newAch.length) {
      text += '\n\n🌟 <b>Новые достижения!</b>\n';
      for (const code of newAch) text += `\n${formatAchievement(code)}\n`;
    }

    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: mainMenuKb() });
  });

  bot.hears('💰 Экономия', async (ctx) => {
    const user = getUser(ctx.from!.id);
    if (!user?.onboarding_done) { await ctx.reply('Сначала /start'); return; }

    const p = calcProgress(user);
    const pricePerUnit = user.units_in_pack > 0 ? user.price_per_pack / user.units_in_pack : 0;
    const daily = pricePerUnit * user.units_per_day;
    const monthly = daily * 30;
    const yearly = daily * 365;

    let text =
      `💰 <b>Деньги, которые забирала никотиновая индустрия</b>\n\n` +
      `  • В день: <b>${Math.round(daily)}₽</b>\n` +
      `  • В месяц: <b>${Math.round(monthly).toLocaleString('ru')}₽</b>\n` +
      `  • В год: <b>${Math.round(yearly).toLocaleString('ru')}₽</b>\n\n` +
      `🔓 <b>Уже оставил себе: ${p.moneySaved.toLocaleString('ru')}₽</b>\n`;

    const s = p.moneySaved;
    if (s >= 50000) text += '\n  • Отпуск ✈️';
    if (s >= 10000) text += '\n  • Крутые кроссовки 👟';
    if (s >= 5000) text += '\n  • Ресторан 🍽️';
    if (s >= 1000) text += '\n  • Книга или подписка 📚';
    if (s >= 250) text += '\n  • Хороший кофе ☕';
    if (s < 250) text += '\n  • Скоро хватит на кофе! ☕';

    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: mainMenuKb() });
  });
}
