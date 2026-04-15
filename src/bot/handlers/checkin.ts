import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { checkinKb, moodKb, mainMenuKb } from '../keyboards/main.js';
import { getUser, resetQuitDate } from '../../services/user.js';
import { logCheckin, logMood } from '../../services/craving.js';
import { calcProgress } from '../../services/progress.js';
import { checkAndUnlock, formatAchievement } from '../../services/achievements.js';
import { getContentForUser } from '../../services/content.js';

export async function sendDailyCheckin(bot: Bot<BotContext>, telegramId: number) {
  const user = getUser(telegramId);
  if (!user?.onboarding_done) return;

  const p = calcProgress(user);
  const c = getContentForUser(user.id, 'checkin_morning');
  const day = p.smokeFreeDays + 1;

  const text = `🌅 <b>День ${day} твоей свободы!</b>\n\n${c?.text || 'Как здорово проснуться свободным!'}`;

  await bot.api.sendMessage(telegramId, text, { parse_mode: 'HTML', reply_markup: checkinKb() });
}

export async function sendEveningMotivation(bot: Bot<BotContext>, telegramId: number) {
  const user = getUser(telegramId);
  if (!user?.onboarding_done) return;

  const c = getContentForUser(user.id, 'checkin_evening') ?? getContentForUser(user.id, 'motivation');
  await bot.api.sendMessage(
    telegramId,
    `🌙 <b>Вечернее напоминание</b>\n\n${c?.text || 'Спи спокойно, свободный человек. 🔓'}`,
    { parse_mode: 'HTML' }
  );
}

export function checkinHandlers(bot: Bot<BotContext>) {
  bot.callbackQuery('checkin_yes', async (ctx) => {
    const user = getUser(ctx.from!.id);
    if (!user) { await ctx.answerCallbackQuery(); return; }
    logCheckin(user.id, true);

    const reUser = getUser(ctx.from!.id)!;
    const newAch = checkAndUnlock(reUser);

    let text = '🔓 <b>Конечно! Ты свободен!</b>\n\n' +
      'Это не подвиг — это нормальная жизнь без яда.\n\nКак настроение?';
    if (newAch.length) {
      text += '\n\n🌟 <b>Достижение!</b>\n';
      for (const code of newAch) text += `\n${formatAchievement(code)}\n`;
    }

    await ctx.editMessageText(text, { parse_mode: 'HTML' });
    await ctx.reply('Оцени самочувствие:', { reply_markup: moodKb() });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('checkin_no', async (ctx) => {
    const user = getUser(ctx.from!.id);
    if (!user) { await ctx.answerCallbackQuery(); return; }
    logCheckin(user.id, false);
    resetQuitDate(ctx.from!.id);

    await ctx.editMessageText(
      '💭 <b>Давай разберёмся.</b>\n\n' +
      'Сигарета не дала удовольствия — только вину.\n\n' +
      'Нажми 🎭 Мифы — разберём ловушку.\n\n' +
      '🔄 Таймер обновлён. Ты снова свободен! 🔓',
      { parse_mode: 'HTML' }
    );
    await ctx.reply('Добро пожаловать обратно! 🔓', { reply_markup: mainMenuKb() });
    await ctx.answerCallbackQuery();
  });

  for (let i = 1; i <= 5; i++) {
    bot.callbackQuery(`mood_${i}`, async (ctx) => {
      const user = getUser(ctx.from!.id);
      if (!user) { await ctx.answerCallbackQuery(); return; }
      logMood(user.id, i);

      const texts: Record<number, string> = {
        1: 'Тяжеловато? Это выздоровление, не жертва. Станет лучше. 💪',
        2: 'Чудовище корчится от голода. Радуйся — оно умирает! 🙂',
        3: 'Стабильно — уже победа. Свобода становится нормой. 👍',
        4: 'Отлично! Без яда жизнь ярче. Дальше — лучше! 🌟',
        5: 'Прекрасно! Это свобода. Некурящие чувствуют так каждый день. 🎉',
      };

      await ctx.editMessageText(`📝 Настроение: ${'⭐'.repeat(i)}\n\n${texts[i]}`, { parse_mode: 'HTML' });
      await ctx.reply('Отличного дня! 🔓', { reply_markup: mainMenuKb() });
      await ctx.answerCallbackQuery();
    });
  }
}
