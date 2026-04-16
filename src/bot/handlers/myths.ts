import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { mythCategoriesKb } from '../keyboards/main.js';
import { InlineKeyboard } from 'grammy';
import { getUser } from '../../services/user.js';
import { getContentForUser } from '../../services/content.js';
import { maybeSendMeme } from '../../services/memeHelper.js';

const MYTH_MENU_TEXT = '🎭 <b>Убийца мифов</b>\n\nТабачные компании создали мифы. Давай разрушим их.\nВыбери категорию:';

function mythResultKb() {
  return new InlineKeyboard()
    .text('🎭 Мифы', 'myths_menu')
    .row()
    .text('🔄 Ещё один миф', 'myth_random');
}

export function mythsHandlers(bot: Bot<BotContext>) {
  const showMenu = async (ctx: BotContext) => {
    const user = getUser(ctx.from!.id);
    if (!user?.onboarding_done) { await ctx.reply('Сначала /start'); return; }
    await ctx.reply(MYTH_MENU_TEXT, { parse_mode: 'HTML', reply_markup: mythCategoriesKb() });
  };

  bot.hears('🎭 Мифы', showMenu);
  bot.command('myth', showMenu);

  // Back to myths menu — new message under the myth so the myth text stays in chat
  bot.callbackQuery('myths_menu', async (ctx) => {
    const mid = ctx.callbackQuery?.message?.message_id;
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
    } catch { /* ignore if already edited */ }
    await ctx.reply(MYTH_MENU_TEXT, {
      parse_mode: 'HTML',
      reply_markup: mythCategoriesKb(),
      ...(mid !== undefined ? { reply_to_message_id: mid } : {}),
    });
    await ctx.answerCallbackQuery();
  });

  // Category (or random from menu): replace the menu message with the myth.
  // Random from a myth message: keep the myth, send a new message (only myth_random is on myth kb).
  bot.callbackQuery(/^myth_(.+)$/, async (ctx) => {
    const category = ctx.match![1];
    const user = getUser(ctx.from!.id);
    if (!user) { await ctx.answerCallbackQuery(); return; }

    const c = category === 'random'
      ? getContentForUser(user.id, 'myth')
      : getContentForUser(user.id, 'myth', category);

    const mythText = c?.text || '💪 Все мифы в этой категории уже разрушены! Попробуй другую.';

    const msg = ctx.callbackQuery?.message;
    const isMythMenuMessage =
      msg &&
      'text' in msg &&
      typeof msg.text === 'string' &&
      msg.text.includes('Убийца мифов') &&
      msg.text.includes('Выбери категорию');

    if (category !== 'random' || isMythMenuMessage) {
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
