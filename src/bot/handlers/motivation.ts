import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { mainMenuKb } from '../keyboards/main.js';
import { getUser } from '../../services/user.js';
import { botConfigGetRaw } from '../../services/botConfig.js';
import { getContentForUser } from '../../services/content.js';
import { calcProgress } from '../../services/progress.js';
import { maybeSendMeme } from '../../services/memeHelper.js';

export async function handleMotivation(ctx: BotContext): Promise<void> {
  const user = getUser(ctx.from!.id);
  if (!user?.onboarding_done) {
    await ctx.reply(botConfigGetRaw('txt_need_onboarding'), { parse_mode: 'HTML' });
    return;
  }

  const c = getContentForUser(user.id, 'motivation');
  const p = calcProgress(user);

  let text = `💡 <b>Ловите мудрость</b>\n\n${c?.text || 'Ты свободен! 🔓'}\n`;

  if (user.motivation) {
    text += `\n💭 <b>Твоя причина:</b> <i>«${user.motivation}»</i>\n`;
  }

  text += `\n🔓 Свободен: <b>${p.smokeFreeDays}</b> дн. | ` +
    `🚫 <b>${p.unitsAvoided}</b> ${p.deviceLabel} | ` +
    `💰 <b>${p.moneySaved.toLocaleString('ru')}₽</b>`;

  await ctx.reply(text, { parse_mode: 'HTML', reply_markup: mainMenuKb() });
  await maybeSendMeme(ctx, 'motivation', 0.35);
}

export function motivationHandlers(_bot: Bot<BotContext>) {
  /* главное меню → mainMenuTextRouter */
}
