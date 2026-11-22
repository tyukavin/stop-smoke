import { InlineKeyboard, type Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { mainMenuKb } from '../keyboards/main.js';
import { getUser, updateUser, resetQuitDate } from '../../services/user.js';
import { botConfigGetRaw } from '../../services/botConfig.js';
import { DEVICE_NAMES, DEVICE_UNIT_LABELS } from '../../types/index.js';
import type { DeviceType } from '../../types/index.js';
import { escapeHtml } from '../../utils/html.js';

function buildSettingsKb(notificationsEnabled: boolean): InlineKeyboard {
  return new InlineKeyboard()
    .text('📦 Устройство', 'set_device')
    .text('🚬 Кол-во/день', 'set_units').row()
    .text('💵 Цена пачки', 'set_price')
    .text('📅 Дата отказа', 'set_quit_date').row()
    .text('🌐 Часовой пояс', 'set_tz')
    .text(notificationsEnabled ? '🔔 Уведомления: Вкл' : '🔕 Уведомления: Выкл', 'set_notifications').row()
    .text('💭 Моя мотивация', 'set_motivation').row()
    .text('🔄 Сбросить таймер', 'set_reset');
}

function formatQuitDate(iso: string | null, tzOffset: number): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const local = new Date(d.getTime() + tzOffset * 3_600_000);
  const dd = String(local.getUTCDate()).padStart(2, '0');
  const mm = String(local.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = local.getUTCFullYear();
  const hh = String(local.getUTCHours()).padStart(2, '0');
  const min = String(local.getUTCMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

/** Parse DD.MM.YYYY or DD.MM.YYYY HH:MM in user's local timezone into ISO UTC string. */
export function parseLocalQuitDate(input: string, tzOffset: number): string | null {
  const m = input.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  const hour = m[4] !== undefined ? parseInt(m[4], 10) : 0;
  const minute = m[5] !== undefined ? parseInt(m[5], 10) : 0;

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || year < 2000 || year > 2100) {
    return null;
  }

  const utcMs = Date.UTC(year, month - 1, day, hour, minute) - tzOffset * 3_600_000;
  const dt = new Date(utcMs);
  if (isNaN(dt.getTime()) || dt.getTime() > Date.now() + 60_000) return null;
  // Validate calendar rollover (e.g., 31.02)
  const checkLocal = new Date(utcMs + tzOffset * 3_600_000);
  if (checkLocal.getUTCDate() !== day || checkLocal.getUTCMonth() !== month - 1) return null;

  return dt.toISOString();
}

export async function handleSettingsEntry(ctx: BotContext): Promise<void> {
  const user = getUser(ctx.from!.id);
  if (!user?.onboarding_done) {
    await ctx.reply(botConfigGetRaw('txt_need_onboarding'), { parse_mode: 'HTML' });
    return;
  }
  const dt = user.device_type as DeviceType;
  const notifOn = (user.notifications_enabled ?? 1) !== 0;

  await ctx.reply(
    `⚙️ <b>Настройки</b>\n\n` +
      `📦 Устройство: <b>${DEVICE_NAMES[dt] ?? dt}</b>\n` +
      `🔢 ${DEVICE_UNIT_LABELS[dt]}: <b>${user.units_per_day}</b>\n` +
      `💵 Цена: <b>${user.price_per_pack}₽</b>\n` +
      `📅 Дата отказа: <b>${formatQuitDate(user.quit_date, user.timezone_offset)}</b>\n` +
      `🌐 UTC: <b>${user.timezone_offset >= 0 ? '+' : ''}${user.timezone_offset}</b>\n` +
      `🔔 Уведомления: <b>${notifOn ? 'включены' : 'выключены'}</b>\n` +
      `💭 Причина: <i>${user.motivation ? escapeHtml(user.motivation) : '—'}</i>`,
    { parse_mode: 'HTML', reply_markup: buildSettingsKb(notifOn) }
  );
}

export function settingsHandlers(bot: Bot<BotContext>) {
  bot.command('settings', handleSettingsEntry);

  const fields: Record<string, { field: string; prompt: string; parse: (t: string, tz: number) => unknown }> = {
    set_units: {
      field: 'units_per_day',
      prompt: '🔢 Введи количество/день:',
      parse: (t) => {
        const n = parseInt(t, 10);
        return n >= 1 && n <= 9999 ? n : null;
      },
    },
    set_price: {
      field: 'price_per_pack',
      prompt: '💵 Введи цену (в рублях):',
      parse: (t) => {
        const n = parseFloat(t.replace(',', '.'));
        return n > 0 && n <= 99999 ? n : null;
      },
    },
    set_tz: {
      field: 'timezone_offset',
      prompt: '🌐 Часовой пояс (-12..+14):\nНапр: 3 = Москва',
      parse: (t) => {
        const n = parseInt(t.replace('+', ''), 10);
        return n >= -12 && n <= 14 ? n : null;
      },
    },
    set_motivation: {
      field: 'motivation',
      prompt: '💭 Напиши причину быть свободным:',
      parse: (t) => t.slice(0, 500) || null,
    },
    set_quit_date: {
      field: 'quit_date',
      prompt:
        '📅 Введи реальную дату отказа в формате <code>ДД.ММ.ГГГГ</code> или <code>ДД.ММ.ГГГГ ЧЧ:ММ</code>\n' +
        'Например: <code>15.11.2026</code> или <code>15.11.2026 22:30</code>',
      parse: (t, tz) => parseLocalQuitDate(t, tz),
    },
  };

  for (const [cb, cfg] of Object.entries(fields)) {
    bot.callbackQuery(cb, async (ctx) => {
      ctx.session.step = 'settings_edit';
      ctx.session.editField = cb;
      await ctx.reply(cfg.prompt, { parse_mode: 'HTML' });
      await ctx.answerCallbackQuery();
    });
  }

  bot.callbackQuery('set_device', async (ctx) => {
    const kb = new InlineKeyboard()
      .text('🚬 Сигареты', 'set_dev_cigarettes').row()
      .text('📱 IQOS / Glo', 'set_dev_iqos').row()
      .text('💨 Вейп', 'set_dev_vape').row()
      .text('🔋 Мини-вейп / Pod', 'set_dev_mini_vape');
    await ctx.reply('📦 Выбери тип устройства:', { reply_markup: kb });
    await ctx.answerCallbackQuery();
  });

  for (const dt of ['cigarettes', 'iqos', 'vape', 'mini_vape'] as DeviceType[]) {
    bot.callbackQuery(`set_dev_${dt}`, async (ctx) => {
      const packDefaults: Record<DeviceType, number> = {
        cigarettes: 20,
        iqos: 20,
        vape: 300,
        mini_vape: 600,
      };
      updateUser(ctx.from!.id, { device_type: dt, units_in_pack: packDefaults[dt] });
      await ctx.editMessageText(`✅ Устройство обновлено: <b>${DEVICE_NAMES[dt]}</b>`, {
        parse_mode: 'HTML',
      });
      await ctx.answerCallbackQuery();
    });
  }

  bot.callbackQuery('set_notifications', async (ctx) => {
    const user = getUser(ctx.from!.id);
    if (!user) {
      await ctx.answerCallbackQuery();
      return;
    }
    const nextVal = (user.notifications_enabled ?? 1) !== 0 ? 0 : 1;
    updateUser(ctx.from!.id, { notifications_enabled: nextVal });
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: buildSettingsKb(nextVal === 1) });
    } catch {
      /* ignore */
    }
    await ctx.answerCallbackQuery(nextVal === 1 ? '🔔 Уведомления включены' : '🔕 Уведомления выключены');
  });

  // Safe two-step reset confirmation (prevents accidental streak wipe!)
  bot.callbackQuery('set_reset', async (ctx) => {
    const kb = new InlineKeyboard()
      .text('⚠️ Да, сбросить таймер', 'set_reset_confirm')
      .text('↩️ Отмена', 'set_reset_cancel');
    await ctx.reply(
      '⚠️ <b>Точно сбросить счётчик свободы?</b>\n\nТекущая серия дней обнулится и начнётся с этого момента.',
      { parse_mode: 'HTML', reply_markup: kb }
    );
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('set_reset_confirm', async (ctx) => {
    resetQuitDate(ctx.from!.id);
    await ctx.editMessageText(botConfigGetRaw('txt_settings_reset_done'), { parse_mode: 'HTML' });
    await ctx.reply('Погнали заново! 🔓', { reply_markup: mainMenuKb() });
    await ctx.answerCallbackQuery('Таймер сброшен');
  });

  bot.callbackQuery('set_reset_cancel', async (ctx) => {
    await ctx.editMessageText('✅ Отменено — твой счётчик свободы в безопасности! 🔓');
    await ctx.answerCallbackQuery();
  });

  bot.on('message:text', async (ctx, next) => {
    if (ctx.session.step !== 'settings_edit' || !ctx.session.editField) return next();
    const text = ctx.message.text.trim();
    if (text.startsWith('/')) {
      ctx.session.step = undefined;
      ctx.session.editField = undefined;
      return next();
    }
    const cfg = fields[ctx.session.editField];
    if (!cfg) {
      ctx.session.step = undefined;
      return next();
    }

    const user = getUser(ctx.from!.id);
    const val = cfg.parse(text, user?.timezone_offset ?? 3);
    if (val === null) {
      await ctx.reply('Неверное значение, попробуй ещё:');
      return;
    }

    updateUser(ctx.from!.id, { [cfg.field]: val });
    ctx.session.step = undefined;
    ctx.session.editField = undefined;
    await ctx.reply('✅ Обновлено!', { reply_markup: mainMenuKb() });
  });
}
