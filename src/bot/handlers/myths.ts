import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { mythCategoriesKb } from '../keyboards/main.js';
import { InlineKeyboard } from 'grammy';
import { getUser } from '../../services/user.js';
import { getContentForUser } from '../../services/content.js';
import { maybeSendMeme } from '../../services/memeHelper.js';

const MYTH_MENU_TEXT = '🎭 <b>Убийца мифов</b>\n\nТабачные компании создали мифы. Давай разрушим их.\nВыбери категорию:';

function backToMythsKb() {
  return new InlineKeyboard().text('🎭 Мифы', 'myths_menu');
}

export function mythsHandlers(bot: Bot<BotContext>) {
  const showMenu = async (ctx: BotContext) => {
    const user = getUser(ctx.from!.id);
    if (!user?.onboarding_done) { await ctx.reply('Сначала /start'); return; }
    await ctx.reply(MYTH_MENU_TEXT, { parse_mode: 'HTML', reply_markup: mythCategoriesKb() });
  };

  bot.hears('🎭 Мифы', showMenu);
  bot.command('myth', showMenu);

  // Back to myths menu — edit current message
  bot.callbackQuery('myths_menu', async (ctx) => {
    await ctx.editMessageText(MYTH_MENU_TEXT, { parse_mode: 'HTML', reply_markup: mythCategoriesKb() });
    await ctx.answerCallbackQuery();
  });

  // Category selected — replace message with myth text + back button
  bot.callbackQuery(/^myth_(.+)$/, async (ctx) => {
    const category = ctx.match![1];
    const user = getUser(ctx.from!.id);
    if (!user) { await ctx.answerCallbackQuery(); return; }

    const c = category === 'random'
      ? getContentForUser(user.id, 'myth')
      : getContentForUser(user.id, 'myth', category);

    const mythText = c?.text || '💪 Все мифы в этой категории уже разрушены! Попробуй другую.';

    await ctx.editMessageText(mythText, { parse_mode: 'HTML', reply_markup: backToMythsKb() });
    await maybeSendMeme(ctx, 'motivation', 0.15);
    await ctx.answerCallbackQuery();
  });
}
