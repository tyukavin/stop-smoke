import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { settingsKb, mainMenuKb } from '../keyboards/main.js';
import { getUser, updateUser, resetQuitDate } from '../../services/user.js';
import { DEVICE_UNIT_LABELS } from '../../types/index.js';
import type { DeviceType } from '../../types/index.js';

export function settingsHandlers(bot: Bot<BotContext>) {
  bot.hears('⚙️ Настройки', async (ctx) => {
    const user = getUser(ctx.from!.id);
    if (!user?.onboarding_done) { await ctx.reply('Сначала /start'); return; }
    const dt = user.device_type as DeviceType;
    await ctx.reply(
      `⚙️ <b>Настройки</b>\n\n` +
      `📦 Устройство: <b>${dt}</b>\n` +
      `🔢 ${DEVICE_UNIT_LABELS[dt]}: <b>${user.units_per_day}</b>\n` +
      `💵 Цена: <b>${user.price_per_pack}₽</b>\n` +
      `🌐 UTC: <b>${user.timezone_offset >= 0 ? '+' : ''}${user.timezone_offset}</b>\n` +
      `💭 Причина: <i>${user.motivation || '—'}</i>`,
      { parse_mode: 'HTML', reply_markup: settingsKb() }
    );
  });

  const fields: Record<string, { field: string; prompt: string; parse: (t: string) => unknown }> = {
    set_units: { field: 'units_per_day', prompt: '🔢 Введи количество/день:', parse: (t) => { const n = parseInt(t); return (n >= 1 && n <= 9999) ? n : null; } },
    set_price: { field: 'price_per_pack', prompt: '💵 Введи цену:', parse: (t) => { const n = parseFloat(t.replace(',', '.')); return (n > 0 && n <= 99999) ? n : null; } },
    set_tz: { field: 'timezone_offset', prompt: '🌐 Часовой пояс (-12..+14):\nНапр: 3 = Москва', parse: (t) => { const n = parseInt(t.replace('+', '')); return (n >= -12 && n <= 14) ? n : null; } },
    set_motivation: { field: 'motivation', prompt: '💭 Напиши причину быть свободным:', parse: (t) => t.slice(0, 500) || null },
  };

  for (const [cb, cfg] of Object.entries(fields)) {
    bot.callbackQuery(cb, async (ctx) => {
      ctx.session.step = 'settings_edit';
      ctx.session.editField = cb;
      await ctx.reply(cfg.prompt);
      await ctx.answerCallbackQuery();
    });
  }

  bot.callbackQuery('set_reset', async (ctx) => {
    resetQuitDate(ctx.from!.id);
    await ctx.reply(
      '🔄 <b>Таймер обновлён.</b>\nТы снова свободен — прямо сейчас! 🔓',
      { parse_mode: 'HTML', reply_markup: mainMenuKb() }
    );
    await ctx.answerCallbackQuery();
  });

  bot.on('message:text', async (ctx, next) => {
    if (ctx.session.step !== 'settings_edit' || !ctx.session.editField) return next();
    const cfg = fields[ctx.session.editField];
    if (!cfg) { ctx.session.step = undefined; return next(); }

    const val = cfg.parse(ctx.message.text.trim());
    if (val === null) { await ctx.reply('Неверное значение, попробуй ещё:'); return; }

    updateUser(ctx.from!.id, { [cfg.field]: val });
    ctx.session.step = undefined;
    ctx.session.editField = undefined;
    await ctx.reply(`✅ Обновлено!`, { reply_markup: mainMenuKb() });
  });
}
