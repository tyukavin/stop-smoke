import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { config } from '../../config.js';
import { getUser } from '../../services/user.js';
import { addSticker } from '../../services/stickers.js';

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
    await ctx.reply(
      '🔐 <b>Админ-панель</b>\n\n' +
      `Веб-админка: <code>/admin</code> на порту API (<code>${config.apiPort}</code>)\n\n` +
      '<b>Команды:</b>\n' +
      '/addsticker — ответь на стикер, чтобы добавить мем\n' +
      '/stickerid — ответь на стикер, чтобы узнать file_id\n' +
      `/myid — твой Telegram ID: <code>${ctx.from!.id}</code>`,
      { parse_mode: 'HTML' }
    );
  });

  bot.command('stickerid', async (ctx) => {
    const reply = ctx.message?.reply_to_message;
    if (reply && 'sticker' in reply && reply.sticker) {
      await ctx.reply(`Sticker file_id:\n<code>${reply.sticker.file_id}</code>`, { parse_mode: 'HTML' });
    } else {
      await ctx.reply('Ответь на стикер этой командой.');
    }
  });

  bot.command('addsticker', async (ctx) => {
    if (!isAdmin(ctx.from!.id)) { await ctx.reply('Нет доступа.'); return; }

    const reply = ctx.message?.reply_to_message;
    if (!reply || !('sticker' in reply) || !reply.sticker) {
      await ctx.reply('Ответь на стикер этой командой. Формат:\n/addsticker контекст\n\nКонтексты: any, sos, victory, motivation, checkin, relapse, funny');
      return;
    }

    const parts = (ctx.message?.text || '').split(' ');
    const stickerContext = parts[1] || 'any';
    const fileId = reply.sticker.file_id;

    const id = addSticker(fileId, stickerContext);
    await ctx.reply(`✅ Стикер #${id} добавлен (контекст: ${stickerContext})`, { parse_mode: 'HTML' });
  });

  // Catch any sticker from admin — offer to add it
  bot.on(':sticker', async (ctx, next) => {
    if (!isAdmin(ctx.from!.id)) return next();

    const fileId = ctx.message?.sticker?.file_id;
    if (!fileId) return next();

    await ctx.reply(
      `🎭 Стикер получен!\n\n` +
      `<code>${fileId}</code>\n\n` +
      `Чтобы добавить: ответь на стикер командой\n/addsticker контекст\n\n` +
      `Контексты: any, sos, victory, motivation, checkin, relapse, funny`,
      { parse_mode: 'HTML' }
    );
  });
}
