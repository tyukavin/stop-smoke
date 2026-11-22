import { InlineKeyboard, type Bot } from 'grammy';
import { InputFile } from 'grammy';
import type { BotContext } from '../index.js';
import { mainMenuKb } from '../keyboards/main.js';
import { getUser, updateUser } from '../../services/user.js';
import {
  calcProgress,
  calcGoalProgress,
  formatExactDuration,
  formatMinutes,
} from '../../services/progress.js';
import { checkAndUnlock, formatAchievement } from '../../services/achievements.js';
import { generateStatsImage } from '../../services/statsImage.js';
import { botConfigGetRaw } from '../../services/botConfig.js';
import { getNextHealthMilestone, formatRemainingTime } from '../../services/health.js';
import { escapeHtml, progressBar } from '../../utils/html.js';

export async function handleMyFreedom(ctx: BotContext): Promise<void> {
  const user = getUser(ctx.from!.id);
  if (!user?.onboarding_done) {
    await ctx.reply(botConfigGetRaw('txt_need_onboarding'), { parse_mode: 'HTML' });
    return;
  }

  const p = calcProgress(user);
  const newAch = checkAndUnlock(user);

  let text =
    `🔓 <b>Ты наслаждаешься свободой уже ${formatExactDuration(p.smokeFreeMinutes)}!</b>\n\n` +
    `🚫 Не впустил: <b>${p.poisonAvoided} вредных веществ</b> (${p.unitsAvoided} ${p.deviceLabel})\n` +
    `💰 Не отдал: <b>${p.moneySaved.toLocaleString('ru')}₽</b>\n` +
    `❤️ Вернул жизни: <b>${formatMinutes(p.lifeRegainedMinutes)}</b>\n`;

  const nextHealth = getNextHealthMilestone(p.smokeFreeMinutes);
  if (nextHealth) {
    const pct = Math.round(nextHealth.progressFraction * 100);
    text +=
      `\n🏥 До вехи «${nextHealth.milestone.title}»: ${progressBar(nextHealth.progressFraction, 8)} <b>${pct}%</b> ` +
      `(осталось ${formatRemainingTime(nextHealth.remainingMinutes)})\n`;
  }

  const goal = calcGoalProgress(user, p.moneySaved);
  if (goal) {
    const safeTitle = escapeHtml(goal.title);
    if (goal.reached) {
      text += `\n🎯 Цель <b>«${safeTitle}»</b> достигнута! 🎉\n`;
    } else {
      text += `\n🎯 Цель «${safeTitle}»: ${progressBar(goal.fraction, 8)} <b>${goal.percent}%</b>\n`;
    }
  }

  if (user.motivation) text += `\n💭 Твоя причина: <i>«${escapeHtml(user.motivation)}»</i>\n`;
  text += '\nС каждым днём Чудовище слабеет. 💪';

  if (newAch.length) {
    text += '\n\n🌟 <b>Новые достижения!</b>\n';
    for (const code of newAch) text += `\n${formatAchievement(code)}\n`;
  }

  await ctx.reply(text, { parse_mode: 'HTML', reply_markup: mainMenuKb() });
}

export async function handleEconomy(ctx: BotContext): Promise<void> {
  const user = getUser(ctx.from!.id);
  if (!user?.onboarding_done) {
    await ctx.reply(botConfigGetRaw('txt_need_onboarding'), { parse_mode: 'HTML' });
    return;
  }

  const p = calcProgress(user);
  const pricePerUnit = user.units_in_pack > 0 ? user.price_per_pack / user.units_in_pack : 0;
  const daily = pricePerUnit * user.units_per_day;
  const monthly = daily * 30;
  const yearly = daily * 365;

  let text =
    `💰 <b>Деньги, которые забирала никотиновая индустрия</b>\n\n` +
    `  • В день: <b>${Math.round(daily)}₽</b>\n` +
    `  • В месяц: <b>${Math.round(monthly).toLocaleString('ru')}₽</b>\n` +
    `  • В год: <b>${Math.round(yearly).toLocaleString('ru')}₽</b>\n\n` +
    `🔓 <b>Уже оставил себе: ${p.moneySaved.toLocaleString('ru')}₽</b>\n`;

  const goal = calcGoalProgress(user, p.moneySaved);
  if (goal) {
    const safeTitle = escapeHtml(goal.title);
    text += `\n🎯 <b>Твоя копилка: «${safeTitle}»</b>\n`;
    text += `${progressBar(goal.fraction, 12)} <b>${goal.percent}%</b>\n`;
    text += `Накоплено <b>${goal.savedAmount.toLocaleString('ru')}₽</b> из <b>${goal.targetAmount.toLocaleString('ru')}₽</b>\n`;
    if (goal.reached) {
      text += '🎉 <b>Цель достигнута! Пора порадовать себя!</b>\n';
    } else if (goal.daysLeft !== null && goal.targetDateStr) {
      text += `⏳ Осталось <b>${goal.remainingAmount.toLocaleString('ru')}₽</b> (~${goal.daysLeft} дн., примерно к <b>${goal.targetDateStr}</b>)\n`;
    }
  } else {
    const s = p.moneySaved;
    if (s >= 50000) text += '\n  • Отпуск ✈️';
    if (s >= 10000) text += '\n  • Крутые кроссовки 👟';
    if (s >= 5000) text += '\n  • Ресторан 🍽️';
    if (s >= 1000) text += '\n  • Книга или подписка 📚';
    if (s >= 250) text += '\n  • Хороший кофе ☕';
    if (s < 250) text += '\n  • Скоро хватит на кофе! ☕';
  }

  const kb = new InlineKeyboard().text(
    goal ? '✏️ Изменить цель' : '🎯 Задать свою цель',
    'goal_set'
  );
  if (goal) kb.text('🗑️ Убрать цель', 'goal_clear');

  await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
}

export async function sendStatsImage(ctx: BotContext): Promise<void> {
  const user = getUser(ctx.from!.id);
  if (!user?.onboarding_done) {
    await ctx.reply(botConfigGetRaw('txt_need_onboarding'), { parse_mode: 'HTML' });
    return;
  }

  await ctx.reply(botConfigGetRaw('txt_stats_generating'));
  try {
    const buf = generateStatsImage(user);
    await ctx.replyWithPhoto(new InputFile(buf, 'stats.png'), {
      caption: botConfigGetRaw('txt_stats_caption'),
      reply_markup: mainMenuKb(),
    });
  } catch (e) {
    console.error('Stats image error:', e);
    await ctx.reply(botConfigGetRaw('txt_stats_fail'));
  }
}

export function progressHandlers(bot: Bot<BotContext>) {
  bot.command('stats', sendStatsImage);
  bot.command('freedom', handleMyFreedom);
  bot.command('goal', handleEconomy);

  bot.callbackQuery('goal_set', async (ctx) => {
    ctx.session.step = 'goal_title';
    await ctx.reply(
      '🎯 <b>На что копим сэкономленные деньги?</b>\n\nНапиши название цели (например: <i>AirPods</i>, <i>Отпуск в горах</i>, <i>Новый телефон</i>):',
      { parse_mode: 'HTML' }
    );
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('goal_clear', async (ctx) => {
    updateUser(ctx.from!.id, { goal_title: '', goal_amount: 0 });
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard().text('🎯 Задать свою цель', 'goal_set') });
    await ctx.answerCallbackQuery('Цель удалена');
  });

  bot.on('message:text', async (ctx, next) => {
    if (ctx.session.step === 'goal_title') {
      const title = ctx.message.text.trim().slice(0, 80);
      if (!title || title.startsWith('/')) {
        ctx.session.step = undefined;
        return next();
      }
      ctx.session.goalTitle = title;
      ctx.session.step = 'goal_amount';
      await ctx.reply(
        `💵 Сколько стоит <b>«${escapeHtml(title)}»</b> (в рублях)?\nНапример: <code>15000</code>`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    if (ctx.session.step === 'goal_amount') {
      const text = ctx.message.text.trim();
      if (text.startsWith('/')) {
        ctx.session.step = undefined;
        return next();
      }
      const amount = parseFloat(text.replace(/\s+/g, '').replace(',', '.'));
      if (isNaN(amount) || amount < 100 || amount > 100_000_000) {
        await ctx.reply('Введи сумму от 100 до 100 000 000₽:');
        return;
      }
      const title = ctx.session.goalTitle || 'Моя цель';
      updateUser(ctx.from!.id, { goal_title: title, goal_amount: Math.round(amount) });
      ctx.session.step = undefined;
      ctx.session.goalTitle = undefined;
      await ctx.reply(`✅ Цель <b>«${escapeHtml(title)}»</b> на ${Math.round(amount).toLocaleString('ru')}₽ сохранена!`, {
        parse_mode: 'HTML',
        reply_markup: mainMenuKb(),
      });
      await handleEconomy(ctx);
      return;
    }

    return next();
  });
}
