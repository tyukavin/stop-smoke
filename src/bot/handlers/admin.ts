import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { config } from '../../config.js';
import { getUser } from '../../services/user.js';

function isAdmin(telegramId: number): boolean {
  const user = getUser(telegramId);
  return !!(user?.is_admin) || config.adminIds.includes(telegramId);
}

export function adminHandlers(bot: Bot<BotContext>) {
  bot.command('admin', async (ctx) => {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.reply('Нет доступа.');
      return;
    }

    const port = config.apiPort;
    await ctx.reply(
      '🔐 <b>Админ-панель</b>\n\n' +
      `Веб-интерфейс доступен по адресу:\n` +
      `<code>http://ВАШ_СЕРВЕР:${port}/admin</code>\n\n` +
      `Для входа используй свой Telegram ID: <code>${ctx.from!.id}</code>`,
      { parse_mode: 'HTML' }
    );
  });
}
