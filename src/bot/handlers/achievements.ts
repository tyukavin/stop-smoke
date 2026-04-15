import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { mainMenuKb } from '../keyboards/main.js';
import { getUser } from '../../services/user.js';
import { ACHIEVEMENTS, checkAndUnlock, getUserAchievements } from '../../services/achievements.js';

export function achievementsHandlers(bot: Bot<BotContext>) {
  bot.hears('🏆 Достижения', async (ctx) => {
    const user = getUser(ctx.from!.id);
    if (!user?.onboarding_done) { await ctx.reply('Сначала /start'); return; }

    checkAndUnlock(user);
    const unlocked = new Set(getUserAchievements(user.id));

    let text = '🏆 <b>Достижения</b>\n\n';
    let count = 0;

    for (const a of ACHIEVEMENTS) {
      if (unlocked.has(a.code)) {
        text += `✅ ${a.emoji} <b>${a.title}</b> — ${a.description}\n`;
        count++;
      } else {
        text += `🔒 ${a.emoji} ${a.title} — ???\n`;
      }
    }

    text += `\n📊 Открыто: <b>${count}/${ACHIEVEMENTS.length}</b>`;

    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: mainMenuKb() });
  });
}
