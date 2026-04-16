import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { sosActionsKb, intensityKb, triggerKb, mainMenuKb } from '../keyboards/main.js';
import { getUser, resetQuitDate } from '../../services/user.js';
import { getContentForUser, getRandomContent } from '../../services/content.js';
import { logCraving, getCravingStats } from '../../services/craving.js';
import { checkAndUnlock, formatAchievement } from '../../services/achievements.js';
import { maybeSendMeme } from '../../services/memeHelper.js';

export function sosHandlers(bot: Bot<BotContext>) {
  bot.hears('🆘 Чудовище атакует!', async (ctx) => {
    const user = getUser(ctx.from!.id);
    if (!user?.onboarding_done) { await ctx.reply('Сначала /start'); return; }
    ctx.session.step = 'sos';
    await ctx.reply(
      '🆘 <b>Чудовище подкрадывается? Ха!</b>\n\n' +
      'Оно голодное и жалкое. Через пару минут сдохнет.\n' +
      'Давай выберем, чем его добить 💀',
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
      await maybeSendMeme(ctx, 'sos', 0.4);
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
    await maybeSendMeme(ctx, 'sos', 0.5);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('sos_resisted', async (ctx) => {
    ctx.session.cravingResisted = true;
    ctx.session.step = 'sos_intensity';
    await ctx.editMessageText(
      '🔓 <b>Чудовище повержено! Красава!</b> 🏆\n\nНасколько жёстко оно атаковало? (1-10):',
      { parse_mode: 'HTML' }
    );
    await ctx.editMessageReplyMarkup({ reply_markup: intensityKb() });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('sos_relapsed', async (ctx) => {
    ctx.session.cravingResisted = false;
    ctx.session.step = 'sos_intensity';
    await ctx.editMessageText(
      '💭 <b>Ладно, давай разберёмся без паники.</b>\n\nНасколько жёстко было? (1-10):',
      { parse_mode: 'HTML' }
    );
    await ctx.editMessageReplyMarkup({ reply_markup: intensityKb() });
    await ctx.answerCallbackQuery();
  });

  for (let i = 1; i <= 10; i++) {
    bot.callbackQuery(`intensity_${i}`, async (ctx) => {
      if (ctx.session.step !== 'sos_intensity') { await ctx.answerCallbackQuery(); return; }
      ctx.session.cravingIntensity = i;
      ctx.session.step = 'sos_trigger';
      await ctx.editMessageText('🔍 <b>А что спровоцировало?</b>', { parse_mode: 'HTML' });
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
        const winRate = stats.total > 0 ? Math.round((stats.resisted / stats.total) * 100) : 100;
        response += `🔓 <b>GG! Чудовище в нокауте!</b> 🥊\n\n` +
          `Атака ${intensity}/10 — и ты его размазал.\n\n` +
          `📊 Счёт: ${stats.resisted}/${stats.total} (${winRate}% побед)\n`;
        const reUser = getUser(ctx.from!.id)!;
        const newAch = checkAndUnlock(reUser);
        if (newAch.length) {
          response += '\n🌟 <b>Новая ачивка!</b>\n';
          for (const code of newAch) response += `\n${formatAchievement(code)}\n`;
        }
      } else {
        response += '💭 <b>Окей, без драмы.</b>\n\n' +
          'Ну что, получил удовольствие? Нет? Вот и Аллен Карр об этом.\n\n' +
          'Сигарета опять обманула — не дала ничего, кроме вины.\n' +
          '🔄 Таймер перезапущен. Погнали заново! 💪\n';
      }
      if (tip) response += `\n💡 <b>Разбор:</b>\n${tip.text}`;

      ctx.session.step = undefined;
      await ctx.editMessageText(response, { parse_mode: 'HTML' });

      if (resisted) {
        await maybeSendMeme(ctx, 'victory', 0.5);
      } else {
        await maybeSendMeme(ctx, 'relapse', 0.4);
      }

      await ctx.reply('Погнали дальше! 🔓', { reply_markup: mainMenuKb() });
      await ctx.answerCallbackQuery();
    });
  }
}
