import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { mythCategoriesKb } from '../keyboards/main.js';
import { getUser } from '../../services/user.js';
import { getContentForUser, getRandomContent } from '../../services/content.js';

export function mythsHandlers(bot: Bot<BotContext>) {
  const showMenu = async (ctx: BotContext) => {
    const user = getUser(ctx.from!.id);
    if (!user?.onboarding_done) { await ctx.reply('Сначала /start'); return; }
    await ctx.reply(
      '🎭 <b>Убийца мифов</b>\n\n' +
      'Табачные компании создали мифы. Давай разрушим их.\n' +
      'Выбери категорию:',
      { parse_mode: 'HTML', reply_markup: mythCategoriesKb() }
    );
  };

  bot.hears('🎭 Мифы', showMenu);
  bot.command('myth', showMenu);

  bot.callbackQuery(/^myth_(.+)$/, async (ctx) => {
    const category = ctx.match![1];
    const user = getUser(ctx.from!.id);
    if (!user) { await ctx.answerCallbackQuery(); return; }

    let c;
    if (category === 'random') {
      c = getContentForUser(user.id, 'myth');
    } else {
      c = getContentForUser(user.id, 'myth', category);
    }

    await ctx.reply(c?.text || 'Все мифы уже разрушены! 💪', { parse_mode: 'HTML' });
    await ctx.reply('Ещё один миф?', { reply_markup: mythCategoriesKb() });
    await ctx.answerCallbackQuery();
  });
}
