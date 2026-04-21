import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { mythCategoriesKb, mythResultKb } from '../keyboards/main.js';
import { getUser } from '../../services/user.js';
import { getContentForUser } from '../../services/content.js';
import { maybeSendMeme } from '../../services/memeHelper.js';
import { botConfigGetRaw } from '../../services/botConfig.js';

function mythMenuText(): string {
  return botConfigGetRaw('txt_myth_menu');
}

function isMythMenuMessage(msg: unknown): boolean {
  if (!msg || typeof msg !== 'object' || !('text' in msg)) return false;
  const text = (msg as { text?: string }).text;
  if (typeof text !== 'string') return false;
  const stripped = mythMenuText().replace(/<[^>]+>/g, '');
  return stripped.length > 10 ? text.includes(stripped.slice(0, 40).trim()) : text.includes('Убийца мифов');
}

export async function handleMythsMenu(ctx: BotContext): Promise<void> {
  const user = getUser(ctx.from!.id);
  if (!user?.onboarding_done) {
    await ctx.reply(botConfigGetRaw('txt_need_onboarding'), { parse_mode: 'HTML' });
    return;
  }
  await ctx.reply(mythMenuText(), { parse_mode: 'HTML', reply_markup: mythCategoriesKb() });
}

export function mythsHandlers(bot: Bot<BotContext>) {
  bot.command('myth', handleMythsMenu);

  // Back to myths menu — new message under the myth so the myth text stays in chat
  bot.callbackQuery('myths_menu', async (ctx) => {
    const mid = ctx.callbackQuery?.message?.message_id;
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
    } catch { /* ignore if already edited */ }
    await ctx.reply(mythMenuText(), {
      parse_mode: 'HTML',
      reply_markup: mythCategoriesKb(),
      ...(mid !== undefined ? { reply_to_message_id: mid } : {}),
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^myth_(.+)$/, async (ctx) => {
    const category = ctx.match![1];
    const user = getUser(ctx.from!.id);
    if (!user) { await ctx.answerCallbackQuery(); return; }

    const c = category === 'random'
      ? getContentForUser(user.id, 'myth')
      : getContentForUser(user.id, 'myth', category);

    const mythText = c?.text || '💪 Все мифы в этой категории уже разрушены! Попробуй другую.';

    const msg = ctx.callbackQuery?.message;
    const fromMenu = category !== 'random' || isMythMenuMessage(msg);

    if (fromMenu) {
      try {
        await ctx.editMessageText(mythText, { parse_mode: 'HTML', reply_markup: mythResultKb() });
      } catch {
        await ctx.reply(mythText, { parse_mode: 'HTML', reply_markup: mythResultKb() });
      }
    } else {
      try {
        await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
      } catch { /* ignore if already edited */ }
      await ctx.reply(mythText, { parse_mode: 'HTML', reply_markup: mythResultKb() });
    }

    await maybeSendMeme(ctx, 'motivation', 0.15);
    await ctx.answerCallbackQuery();
  });
}
