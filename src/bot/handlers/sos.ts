import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { sosActionsKb, intensityKb, triggerKb, mainMenuKb } from '../keyboards/main.js';
import { getUser, resetQuitDate } from '../../services/user.js';
import { getContentForUser, getRandomContent } from '../../services/content.js';
import { logCraving, getCravingStats } from '../../services/craving.js';
import { checkAndUnlock, formatAchievement } from '../../services/achievements.js';

export function sosHandlers(bot: Bot<BotContext>) {
  bot.hears('🆘 Чудовище атакует!', async (ctx) => {
    const user = getUser(ctx.from!.id);
    if (!user?.onboarding_done) { await ctx.reply('Сначала /start'); return; }
    ctx.session.step = 'sos';
    await ctx.reply(
      '🆘 <b>Маленькое Чудовище атакует!</b>\n\n' +
      'Спокойно. Это никотиновый паразит требует еды. Он умирает.\n' +
      'Это не настоящее желание. Пройдёт через минуты.\n\n' +
      'Выбери помощь:',
      { parse_mode: 'HTML', reply_markup: sosActionsKb() }
    );
  });

  const sosTypes: Record<string, string> = {
    sos_rational: 'sos_rational',
    sos_switching: 'sos_switching',
    sos_celebrating: 'sos_celebrating',
    sos_mindfulness: 'mindfulness',
    sos_cbt: 'cbt_technique',
  };

  for (const [cb, contentType] of Object.entries(sosTypes)) {
    bot.callbackQuery(cb, async (ctx) => {
      const user = getUser(ctx.from!.id);
      if (!user) { await ctx.answerCallbackQuery(); return; }
      const c = getContentForUser(user.id, contentType);
      await ctx.reply(c?.text || 'Ты справишься! 💪', { parse_mode: 'HTML' });
      await ctx.answerCallbackQuery();
    });
  }

  bot.callbackQuery('sos_random', async (ctx) => {
    const user = getUser(ctx.from!.id);
    if (!user) { await ctx.answerCallbackQuery(); return; }
    const types = ['sos_rational', 'sos_switching', 'sos_celebrating', 'mindfulness', 'cbt_technique'];
    const t = types[Math.floor(Math.random() * types.length)];
    const c = getContentForUser(user.id, t);
    await ctx.reply(c?.text || 'Ты свободен! 🔓', { parse_mode: 'HTML' });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('sos_resisted', async (ctx) => {
    ctx.session.cravingResisted = true;
    ctx.session.step = 'sos_intensity';
    await ctx.editMessageText('🔓 <b>Чудовище побеждено!</b>\n\nОцени силу атаки (1-10):', { parse_mode: 'HTML' });
    await ctx.editMessageReplyMarkup({ reply_markup: intensityKb() });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('sos_relapsed', async (ctx) => {
    ctx.session.cravingResisted = false;
    ctx.session.step = 'sos_intensity';
    await ctx.editMessageText('💭 <b>Давай разберёмся.</b>\n\nОцени силу атаки (1-10):', { parse_mode: 'HTML' });
    await ctx.editMessageReplyMarkup({ reply_markup: intensityKb() });
    await ctx.answerCallbackQuery();
  });

  for (let i = 1; i <= 10; i++) {
    bot.callbackQuery(`intensity_${i}`, async (ctx) => {
      if (ctx.session.step !== 'sos_intensity') { await ctx.answerCallbackQuery(); return; }
      ctx.session.cravingIntensity = i;
      ctx.session.step = 'sos_trigger';
      await ctx.editMessageText('🔍 <b>Что спровоцировало?</b>', { parse_mode: 'HTML' });
      await ctx.editMessageReplyMarkup({ reply_markup: triggerKb() });
      await ctx.answerCallbackQuery();
    });
  }

  const triggers = ['stress', 'boredom', 'social', 'coffee', 'alcohol', 'morning', 'driving', 'anxiety', 'other'];
  for (const t of triggers) {
    bot.callbackQuery(`trigger_${t}`, async (ctx) => {
      if (ctx.session.step !== 'sos_trigger') { await ctx.answerCallbackQuery(); return; }
      const user = getUser(ctx.from!.id);
      if (!user) { await ctx.answerCallbackQuery(); return; }

      const resisted = ctx.session.cravingResisted ?? true;
      const intensity = ctx.session.cravingIntensity ?? 5;

      logCraving(user.id, intensity, t, resisted);
      if (!resisted) resetQuitDate(ctx.from!.id);

      const stats = getCravingStats(user.id);
      const tip = getContentForUser(user.id, 'trigger_tip', t) ?? getRandomContent('trigger_tip');

      let response = '';
      if (resisted) {
        response += `🔓 <b>Чудовище повержено!</b>\n\nАтака ${intensity}/10 — победа.\n\n` +
          `📊 Атак: ${stats.total} | Побед: ${stats.resisted} | Ср. сила: ${stats.avgIntensity}\n`;
        const reUser = getUser(ctx.from!.id)!;
        const newAch = checkAndUnlock(reUser);
        if (newAch.length) {
          response += '\n🌟 <b>Достижение!</b>\n';
          for (const code of newAch) response += `\n${formatAchievement(code)}\n`;
        }
      } else {
        response += '💭 <b>Анализ.</b>\n\nЗакурил — и что? Удовольствия нет, только вина.\n\n' +
          'Это доказывает: никотин не давал ничего. Таймер обновлён. 🔄\n';
      }
      if (tip) response += `\n💡 <b>Разбор:</b>\n${tip.text}`;

      ctx.session.step = undefined;
      await ctx.editMessageText(response, { parse_mode: 'HTML' });
      await ctx.reply('Продолжаем! 🔓', { reply_markup: mainMenuKb() });
      await ctx.answerCallbackQuery();
    });
  }
}
