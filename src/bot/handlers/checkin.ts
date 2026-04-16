import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { checkinKb, moodKb, mainMenuKb } from '../keyboards/main.js';
import { getUser, resetQuitDate } from '../../services/user.js';
import { logCheckin, logMood } from '../../services/craving.js';
import { calcProgress } from '../../services/progress.js';
import { checkAndUnlock, formatAchievement } from '../../services/achievements.js';
import { getContentForUser } from '../../services/content.js';
import { maybeSendMeme } from '../../services/memeHelper.js';

export async function sendDailyCheckin(bot: Bot<BotContext>, telegramId: number) {
  const user = getUser(telegramId);
  if (!user?.onboarding_done) return;

  const p = calcProgress(user);
  const c = getContentForUser(user.id, 'checkin_morning');
  const day = p.smokeFreeDays + 1;

  const text = `🌅 <b>День ${day} на свободе!</b>\n\n${c?.text || 'Как здорово проснуться без нужды в яде!'}`;

  await bot.api.sendMessage(telegramId, text, { parse_mode: 'HTML', reply_markup: checkinKb() });
}

export async function sendEveningMotivation(bot: Bot<BotContext>, telegramId: number) {
  const user = getUser(telegramId);
  if (!user?.onboarding_done) return;

  const c = getContentForUser(user.id, 'checkin_evening') ?? getContentForUser(user.id, 'motivation');
  await bot.api.sendMessage(
    telegramId,
    `🌙 <b>Вечер!</b>\n\n${c?.text || 'Спи спокойно, свободный человек. 🔓'}`,
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

    let text = '🔓 <b>Ну конечно! Ты же свободный человек!</b> 😎\n\n' +
      'Это не подвиг — это норма. Привыкай к кайфу.\n\nКак настрой?';
    if (newAch.length) {
      text += '\n\n🌟 <b>Новая ачивка!</b>\n';
      for (const code of newAch) text += `\n${formatAchievement(code)}\n`;
    }

    await ctx.editMessageText(text, { parse_mode: 'HTML' });
    await maybeSendMeme(ctx, 'checkin', 0.3);
    await ctx.reply('Оцени своё самочувствие:', { reply_markup: moodKb() });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('checkin_no', async (ctx) => {
    const user = getUser(ctx.from!.id);
    if (!user) { await ctx.answerCallbackQuery(); return; }
    logCheckin(user.id, false);
    resetQuitDate(ctx.from!.id);

    await ctx.editMessageText(
      '💭 <b>Ну что, кайфанул? Нет? Ожидаемо.</b>\n\n' +
      'Каждый срыв — это бесплатный урок: сигарета не даёт ничего.\n' +
      'Табачные компании опять тебя наебали, но в последний раз.\n\n' +
      '🔄 Таймер обновлён. Ты снова свободен!\n' +
      'Загляни в 🎭 Мифы — разберём, какая ловушка сработала.',
      { parse_mode: 'HTML' }
    );
    await maybeSendMeme(ctx, 'relapse', 0.4);
    await ctx.reply('Вперёд! 🔓', { reply_markup: mainMenuKb() });
    await ctx.answerCallbackQuery();
  });

  for (let i = 1; i <= 5; i++) {
    bot.callbackQuery(`mood_${i}`, async (ctx) => {
      const user = getUser(ctx.from!.id);
      if (!user) { await ctx.answerCallbackQuery(); return; }
      logMood(user.id, i);

      const texts: Record<number, string> = {
        1: 'Бывает тяжко. Но это не навсегда — тело перестраивается. Ты делаешь правильную штуку 💪',
        2: 'Чудовище дёргается? Это хорошо — значит умирает 😏',
        3: 'Стабильно — уже победа. Скоро будет ещё лучше 👍',
        4: 'Кайф! Чувствуешь разницу? Это вкус свободы 🌟',
        5: 'Огонь! 🔥 Вот оно — то самое ощущение, когда никотин не управляет тобой!',
      };

      await ctx.editMessageText(`📝 Настроение: ${'⭐'.repeat(i)}\n\n${texts[i]}`, { parse_mode: 'HTML' });
      await maybeSendMeme(ctx, i >= 4 ? 'victory' : 'motivation', 0.25);
      await ctx.reply('Отличного дня! 🔓', { reply_markup: mainMenuKb() });
      await ctx.answerCallbackQuery();
    });
  }
}
