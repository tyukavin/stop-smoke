import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { mainMenuKb, deviceTypeKb, confirmKb } from '../keyboards/main.js';
import { createUser, getUser, updateUser, getActiveUserCount } from '../../services/user.js';
import { config } from '../../config.js';
import type { DeviceType } from '../../types/index.js';
import { DEVICE_UNIT_LABELS } from '../../types/index.js';
import { botConfigGetRaw } from '../../services/botConfig.js';
import { escapeHtml } from '../../utils/html.js';

export function onboardingHandlers(bot: Bot<BotContext>) {
  bot.command('myid', async (ctx) => {
    await ctx.reply(`Твой Telegram ID: <code>${ctx.from!.id}</code>`, { parse_mode: 'HTML' });
  });

  const handleStart = async (ctx: BotContext) => {
    // Сброс шага онбординга при повторном старте
    ctx.session.step = undefined;
    ctx.session.deviceType = undefined;
    ctx.session.unitsPerDay = undefined;
    ctx.session.pricePerPack = undefined;
    ctx.session.unitsInPack = undefined;
    ctx.session.nicotineMg = undefined;
    ctx.session.yearsSmoking = undefined;
    ctx.session.motivation = undefined;

    const tgUser = ctx.from!;
    const user = getUser(tgUser.id);

    if (user?.onboarding_done) {
      await ctx.reply(botConfigGetRaw('txt_onboarding_return'), { parse_mode: 'HTML', reply_markup: mainMenuKb() });
      return;
    }

    createUser(tgUser.id, tgUser.username, tgUser.first_name);
    // Auto-promote to admin if ADMIN_IDS includes this user, or if this is the very first user
    if (config.adminIds.includes(tgUser.id) || getActiveUserCount() === 0) {
      updateUser(tgUser.id, { is_admin: 1 });
    }

    await ctx.reply(botConfigGetRaw('txt_onboarding_intro'), { parse_mode: 'HTML', reply_markup: deviceTypeKb() });
  };

  bot.command('start', handleStart);
  // Только /start — команда; «старт»/«start» текстом тоже запускают онбординг
  bot.hears(/^(старт|start)$/iu, handleStart);

  for (const dt of ['cigarettes', 'iqos', 'vape', 'mini_vape'] as DeviceType[]) {
    bot.callbackQuery(`device_${dt}`, async (ctx) => {
      ctx.session.step = 'units_per_day';
      ctx.session.deviceType = dt;
      updateUser(ctx.from!.id, { device_type: dt });

      const labels: Record<DeviceType, string> = {
        cigarettes: botConfigGetRaw('txt_onboard_units_cigarettes'),
        iqos: botConfigGetRaw('txt_onboard_units_iqos'),
        vape: botConfigGetRaw('txt_onboard_units_vape'),
        mini_vape: botConfigGetRaw('txt_onboard_units_mini_vape'),
      };

      await ctx.editMessageText(labels[dt], { parse_mode: 'HTML' });
      await ctx.answerCallbackQuery();
    });
  }

  bot.on('message:text', async (ctx, next) => {
    const step = ctx.session.step;
    if (!step) return next();
    const text = ctx.message.text.trim();
    const dt = (ctx.session.deviceType || 'cigarettes') as DeviceType;

    if (step === 'units_per_day') {
      const n = parseInt(text);
      if (isNaN(n) || n < 1 || n > 9999) {
        await ctx.reply('Введи число от 1 до 9999:');
        return;
      }
      ctx.session.unitsPerDay = n;
      updateUser(ctx.from!.id, { units_per_day: n });

      if (dt === 'vape' || dt === 'mini_vape') {
        ctx.session.step = 'nicotine_mg';
        await ctx.reply(botConfigGetRaw('txt_onboard_nicotine'), { parse_mode: 'HTML' });
      } else {
        ctx.session.step = 'price_per_pack';
        const priceKey =
          dt === 'iqos' ? 'txt_onboard_price_iqos' : 'txt_onboard_price_cigarettes';
        await ctx.reply(botConfigGetRaw(priceKey), { parse_mode: 'HTML' });
      }
      return;
    }

    if (step === 'nicotine_mg') {
      const n = parseFloat(text.replace(',', '.'));
      if (isNaN(n) || n < 0 || n > 100) {
        await ctx.reply('Введи число от 0 до 100:');
        return;
      }
      ctx.session.nicotineMg = n;
      updateUser(ctx.from!.id, { nicotine_mg: n });
      ctx.session.step = 'price_per_pack';
      const priceKey = dt === 'vape' ? 'txt_onboard_price_vape' : 'txt_onboard_price_mini_vape';
      await ctx.reply(botConfigGetRaw(priceKey), { parse_mode: 'HTML' });
      return;
    }

    if (step === 'price_per_pack') {
      const n = parseFloat(text.replace(',', '.'));
      if (isNaN(n) || n <= 0 || n > 99999) {
        await ctx.reply('Введи цену от 1 до 99999:');
        return;
      }
      ctx.session.pricePerPack = n;
      updateUser(ctx.from!.id, { price_per_pack: n });

      const packDefaults: Record<DeviceType, number> = {
        cigarettes: 20, iqos: 20, vape: 300, mini_vape: 600,
      };
      const pack = packDefaults[dt];
      ctx.session.unitsInPack = pack;
      updateUser(ctx.from!.id, { units_in_pack: pack });

      ctx.session.step = 'years_smoking';
      await ctx.reply(botConfigGetRaw('txt_onboard_years'), { parse_mode: 'HTML' });
      return;
    }

    if (step === 'years_smoking') {
      const n = parseInt(text);
      if (isNaN(n) || n < 0 || n > 80) {
        await ctx.reply('Введи число от 0 до 80:');
        return;
      }
      ctx.session.yearsSmoking = n;
      updateUser(ctx.from!.id, { years_smoking: n });
      ctx.session.step = 'motivation';
      await ctx.reply(botConfigGetRaw('txt_onboard_why'), { parse_mode: 'HTML' });
      return;
    }

    if (step === 'motivation') {
      const motivation = text.slice(0, 500);
      if (!motivation) { await ctx.reply('Напиши хотя бы пару слов:'); return; }
      ctx.session.motivation = motivation;
      updateUser(ctx.from!.id, { motivation });

      const units = ctx.session.unitsPerDay || 20;
      const price = ctx.session.pricePerPack || 250;
      const years = ctx.session.yearsSmoking || 5;
      const pack = ctx.session.unitsInPack || 20;
      const totalUnits = units * 365 * years;
      const totalMoney = (price / pack) * totalUnits;
      const unitLabel = DEVICE_UNIT_LABELS[dt];

      ctx.session.step = 'confirm';
      await ctx.reply(
        `📋 <b>Вот картина:</b>\n\n` +
        `📦 Устройство: <b>${dt === 'cigarettes' ? 'Сигареты' : dt === 'iqos' ? 'IQOS' : dt === 'vape' ? 'Вейп' : 'Мини-вейп'}</b>\n` +
        `🔢 ${unitLabel}: <b>${units}</b>\n` +
        `💵 Цена: <b>${price}₽</b>\n` +
        `📅 Стаж: <b>${years} лет</b>\n` +
        `💭 Причина: <i>${escapeHtml(motivation)}</i>\n\n` +
        `За это время отдано ~<b>${totalMoney.toLocaleString('ru')}₽</b>.\n\n` +
        `<b>Готов стать свободным?</b>`,
        { parse_mode: 'HTML', reply_markup: confirmKb() }
      );
      return;
    }

    return next();
  });

  bot.callbackQuery('onboard_confirm', async (ctx) => {
    const tgId = ctx.from!.id;
    updateUser(tgId, { quit_date: new Date().toISOString(), onboarding_done: 1 });
    ctx.session.step = undefined;

    await ctx.editMessageText(botConfigGetRaw('txt_onboard_done_edit'), { parse_mode: 'HTML' });
    await ctx.reply(botConfigGetRaw('txt_onboard_choose_action'), { reply_markup: mainMenuKb() });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('onboard_restart', async (ctx) => {
    ctx.session.step = undefined;
    await ctx.editMessageText(botConfigGetRaw('txt_onboard_what_device'), { parse_mode: 'HTML', reply_markup: deviceTypeKb() });
    await ctx.answerCallbackQuery();
  });
}
