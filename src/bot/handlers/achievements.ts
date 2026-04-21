import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { mainMenuKb } from '../keyboards/main.js';
import { getUser } from '../../services/user.js';
import { botConfigGetRaw } from '../../services/botConfig.js';
import { ACHIEVEMENTS, checkAndUnlock, getUserAchievements } from '../../services/achievements.js';

export async function handleAchievements(ctx: BotContext): Promise<void> {
  const user = getUser(ctx.from!.id);
  if (!user?.onboarding_done) {
    await ctx.reply(botConfigGetRaw('txt_need_onboarding'), { parse_mode: 'HTML' });
    return;
  }

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
}

export function achievementsHandlers(_bot: Bot<BotContext>) {
  /* главное меню → mainMenuTextRouter */
}
