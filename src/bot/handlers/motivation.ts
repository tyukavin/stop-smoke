import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { mainMenuKb } from '../keyboards/main.js';
import { getUser } from '../../services/user.js';
import { getContentForUser } from '../../services/content.js';
import { calcProgress } from '../../services/progress.js';

export function motivationHandlers(bot: Bot<BotContext>) {
  bot.hears('💡 Мотивация', async (ctx) => {
    const user = getUser(ctx.from!.id);
    if (!user?.onboarding_done) { await ctx.reply('Сначала /start'); return; }

    const c = getContentForUser(user.id, 'motivation');
    const p = calcProgress(user);

    let text = `💡 <b>Напоминание</b>\n\n${c?.text || 'Ты свободен! 🔓'}\n`;

    if (user.motivation) {
      text += `\n💭 <b>Твоя причина:</b>\n<i>«${user.motivation}»</i>\n`;
    }

    text += `\n🔓 Свободен: <b>${p.smokeFreeDays}</b> дн.\n` +
      `🚫 Не впустил: <b>${p.unitsAvoided}</b> ${p.deviceLabel}\n` +
      `💰 Не отдал: <b>${p.moneySaved.toLocaleString('ru')}₽</b>`;

    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: mainMenuKb() });
  });
}
