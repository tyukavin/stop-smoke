import { InlineKeyboard, type Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { sosActionsKb, intensityKb, triggerKb, mainMenuKb } from '../keyboards/main.js';
import { getUser, resetQuitDate } from '../../services/user.js';
import { getContentForUser, getRandomContent } from '../../services/content.js';
import { logCraving, getCravingStats } from '../../services/craving.js';
import { checkAndUnlock, formatAchievement } from '../../services/achievements.js';
import { maybeSendMeme } from '../../services/memeHelper.js';
import { botConfigGetRaw } from '../../services/botConfig.js';
import { progressBar } from '../../utils/html.js';

/** Active guided exercise cancellation tokens keyed by chatId. */
const activeExercises = new Map<number, { cancelled: boolean }>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stopKb(): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ Тяга прошла!', 'sos_resisted')
    .text('⏹ Остановить', 'sos_stop_exercise');
}

export async function startBreathingExercise(ctx: BotContext): Promise<void> {
  const chatId = ctx.chat!.id;
  const prev = activeExercises.get(chatId);
  if (prev) prev.cancelled = true;
  const token = { cancelled: false };
  activeExercises.set(chatId, token);

  const msg = await ctx.reply(
    '🌬️ <b>Дыхание 4-7-8 — снимаем волну тяги за 60 секунд</b>\n\nПриготовься... 3 цикла по 19 секунд.',
    { parse_mode: 'HTML', reply_markup: stopKb() }
  );

  const phases: { emoji: string; label: string; seconds: number; hint: string }[] = [
    { emoji: '🟦', label: 'ВДОХ через нос', seconds: 4, hint: 'Спокойно наполни лёгкие воздухом' },
    { emoji: '🟨', label: 'ЗАДЕРЖКА', seconds: 7, hint: 'Удерживай дыхание, расслабь плечи' },
    { emoji: '🟩', label: 'МЕДЛЕННЫЙ ВЫДОХ', seconds: 8, hint: 'Выдыхай плавно через рот — вместе с тягой' },
  ];

  const totalCycles = 3;

  // Run asynchronously so grammY middleware doesn't block other updates (like Stop!)
  void (async () => {
    try {
      await sleep(1500);
      for (let cycle = 1; cycle <= totalCycles; cycle++) {
        for (const phase of phases) {
          if (token.cancelled) return;
          const stepBar = progressBar(cycle / totalCycles, 9);
          const text =
            `🌬️ <b>Дыхание 4-7-8</b> — цикл <b>${cycle}/${totalCycles}</b>\n` +
            `${stepBar}\n\n` +
            `${phase.emoji} <b>${phase.label} (${phase.seconds} сек.)</b>\n` +
            `<i>${phase.hint}</i>`;
          try {
            await ctx.api.editMessageText(chatId, msg.message_id, text, {
              parse_mode: 'HTML',
              reply_markup: stopKb(),
            });
          } catch {
            /* ignore */
          }
          await sleep(phase.seconds * 1000);
        }
      }

      if (token.cancelled) return;
      activeExercises.delete(chatId);
      await ctx.api.editMessageText(
        chatId,
        msg.message_id,
        '✨ <b>Отлично! 3 цикла дыхания 4-7-8 завершены.</b>\n\n' +
          'Пульс замедлился, кортизол падает, а Маленькое Чудовище потеряло хватку.\n' +
          'Как ощущения сейчас?',
        {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard()
            .text('✅ Чудовище побеждено!', 'sos_resisted')
            .text('🔄 Ещё раунд', 'sos_breathe').row()
            .text('😔 Закурил(а)', 'sos_relapsed'),
        }
      );
    } catch {
      activeExercises.delete(chatId);
    }
  })();
}

export async function startWaveTimer(ctx: BotContext): Promise<void> {
  const chatId = ctx.chat!.id;
  const prev = activeExercises.get(chatId);
  if (prev) prev.cancelled = true;
  const token = { cancelled: false };
  activeExercises.set(chatId, token);

  const steps = [
    { sec: 180, pct: 0.0, text: '🌊 <b>Волна тяги — 3:00</b>\n\nПик тяги длится всего 3 минуты. Просто наблюдай за ней, не действуй. Сделай пару глотков воды.' },
    { sec: 150, pct: 0.17, text: '🌊 <b>Осталось 2:30</b>\n\nЭто не «ты хочешь курить» — это никотиновые рецепторы просят дозу. Они уже теряют силу.' },
    { sec: 120, pct: 0.33, text: '🌊 <b>Осталось 2:00</b>\n\nПройдена треть! Отвлеки руки: потянись, пройдись по комнате или умойся прохладной водой.' },
    { sec: 90, pct: 0.5, text: '🌊 <b>Осталось 1:30 — экватор!</b>\n\nВолна уже прошла пик и начинает спадать. Ты держишься как профи 💪' },
    { sec: 60, pct: 0.67, text: '🌊 <b>Осталась 1:00</b>\n\nВсего минута! Чудовище выдыхается. Почувствуй, как мысли становятся спокойнее.' },
    { sec: 30, pct: 0.83, text: '🌊 <b>Осталось 0:30</b>\n\nФинишная прямая! Каждая такая пережданная волна делает следующую слабее.' },
  ];

  const msg = await ctx.reply(
    `${steps[0].text}\n\n${progressBar(0, 12)} 0%`,
    { parse_mode: 'HTML', reply_markup: stopKb() }
  );

  void (async () => {
    try {
      for (let i = 1; i < steps.length; i++) {
        await sleep(30_000);
        if (token.cancelled) return;
        const s = steps[i];
        const pct = Math.round(s.pct * 100);
        try {
          await ctx.api.editMessageText(
            chatId,
            msg.message_id,
            `${s.text}\n\n${progressBar(s.pct, 12)} ${pct}%`,
            { parse_mode: 'HTML', reply_markup: stopKb() }
          );
        } catch {
          /* ignore */
        }
      }
      await sleep(30_000);
      if (token.cancelled) return;
      activeExercises.delete(chatId);
      await ctx.api.editMessageText(
        chatId,
        msg.message_id,
        `🏆 <b>3 минуты позади! Волна прошла!</b>\n\n${progressBar(1, 12)} 100%\n\n` +
          'Ты пережил(а) атаку без единой затяжки. Зафиксируем победу?',
        {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard()
            .text('✅ Чудовище побеждено!', 'sos_resisted')
            .text('🌬️ Дыхание 4-7-8', 'sos_breathe'),
        }
      );
    } catch {
      activeExercises.delete(chatId);
    }
  })();
}

export async function handleSosEntry(ctx: BotContext): Promise<void> {
  const user = getUser(ctx.from!.id);
  if (!user?.onboarding_done) {
    await ctx.reply(botConfigGetRaw('txt_need_onboarding'), { parse_mode: 'HTML' });
    return;
  }
  ctx.session.step = 'sos';
  await ctx.reply(botConfigGetRaw('txt_sos_intro'), { parse_mode: 'HTML', reply_markup: sosActionsKb() });
}

export function sosHandlers(bot: Bot<BotContext>) {
  bot.command('sos', handleSosEntry);
  bot.command('breathe', async (ctx) => {
    const user = getUser(ctx.from!.id);
    if (!user?.onboarding_done) {
      await ctx.reply(botConfigGetRaw('txt_need_onboarding'), { parse_mode: 'HTML' });
      return;
    }
    await startBreathingExercise(ctx);
  });

  bot.callbackQuery('sos_breathe', async (ctx) => {
    await ctx.answerCallbackQuery();
    await startBreathingExercise(ctx);
  });

  bot.callbackQuery('sos_wave', async (ctx) => {
    await ctx.answerCallbackQuery();
    await startWaveTimer(ctx);
  });

  bot.callbackQuery('sos_stop_exercise', async (ctx) => {
    const chatId = ctx.chat!.id;
    const prev = activeExercises.get(chatId);
    if (prev) prev.cancelled = true;
    activeExercises.delete(chatId);
    try {
      await ctx.editMessageText('⏹ Упражнение остановлено. Если тяга ещё осталась — выбери поддержку в 🆘 SOS.', {
        parse_mode: 'HTML',
      });
    } catch {
      /* ignore */
    }
    await ctx.answerCallbackQuery('Остановлено');
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
    const prev = activeExercises.get(ctx.chat!.id);
    if (prev) prev.cancelled = true;
    activeExercises.delete(ctx.chat!.id);
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
    const prev = activeExercises.get(ctx.chat!.id);
    if (prev) prev.cancelled = true;
    activeExercises.delete(ctx.chat!.id);
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
      await ctx.editMessageText(botConfigGetRaw('txt_sos_trigger_prompt'), { parse_mode: 'HTML' });
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
