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

  // Back to myths menu — replace current message with category list
  bot.callbackQuery('myths_menu', async (ctx) => {
    await ctx.editMessageText(MYTH_MENU_TEXT, { parse_mode: 'HTML', reply_markup: mythCategoriesKb() });
    await ctx.answerCallbackQuery();
  });

  // Category selected — strip buttons from current message, send new message with myth
  bot.callbackQuery(/^myth_(.+)$/, async (ctx) => {
    const category = ctx.match![1];
    const user = getUser(ctx.from!.id);
    if (!user) { await ctx.answerCallbackQuery(); return; }

    const c = category === 'random'
      ? getContentForUser(user.id, 'myth')
      : getContentForUser(user.id, 'myth', category);

    const mythText = c?.text || '💪 Все мифы в этой категории уже разрушены! Попробуй другую.';

    // Remove buttons from the old message, keep text in history
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
    } catch { /* ignore if already edited */ }

    // Send myth as a new message with action buttons
    await ctx.reply(mythText, { parse_mode: 'HTML', reply_markup: mythResultKb() });
    await maybeSendMeme(ctx, 'motivation', 0.15);
    await ctx.answerCallbackQuery();
  });
}
