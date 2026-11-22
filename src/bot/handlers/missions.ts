import { InlineKeyboard, type Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { getUser } from '../../services/user.js';
import { calcProgress } from '../../services/progress.js';
import {
  DAILY_MISSIONS,
  completeMission,
  getCompletedMissionDays,
  getCurrentMissionForUser,
  getMissionForDay,
} from '../../services/missions.js';
import { checkAndUnlock, formatAchievement } from '../../services/achievements.js';
import { maybeSendMeme } from '../../services/memeHelper.js';
import { botConfigGetRaw } from '../../services/botConfig.js';
import { progressBar } from '../../utils/html.js';

function buildMissionMessage(userId: number, dayNumber: number): { text: string; kb: InlineKeyboard } {
  const mission = getMissionForDay(dayNumber);
  const completed = new Set(getCompletedMissionDays(userId));
  const isDone = completed.has(mission.day);
  const doneCount = completed.size;
  const total = DAILY_MISSIONS.length;
  const bar = progressBar(doneCount / total, 10);

  const statusLine = isDone ? '✅ <b>Выполнено!</b>' : '⬜ <i>Ещё не выполнено</i>';
  const text =
    `🎯 <b>Программа «14 дней свободы» — День ${mission.day}/${total}</b>\n` +
    `${bar} <b>${doneCount}/${total}</b>\n\n` +
    `${mission.emoji} <b>${mission.title}</b>  (${statusLine})\n\n` +
    `📋 <b>Задание:</b>\n${mission.task}\n\n` +
    `🧠 <b>Зачем это работает:</b>\n<i>${mission.why}</i>`;

  const kb = new InlineKeyboard();
  if (!isDone) {
    kb.text('✅ Миссия выполнена!', `mission_done_${mission.day}`).row();
  }
  if (mission.day > 1) kb.text('⬅️ Пред.', `mission_view_${mission.day - 1}`);
  if (mission.day < total) kb.text('След. ➡️', `mission_view_${mission.day + 1}`);

  return { text, kb };
}

export async function handleMissionEntry(ctx: BotContext): Promise<void> {
  const user = getUser(ctx.from!.id);
  if (!user?.onboarding_done) {
    await ctx.reply(botConfigGetRaw('txt_need_onboarding'), { parse_mode: 'HTML' });
    return;
  }

  const p = calcProgress(user);
  const mission = getCurrentMissionForUser(user.id, p.smokeFreeDays);
  const { text, kb } = buildMissionMessage(user.id, mission.day);

  await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
}

export function missionHandlers(bot: Bot<BotContext>) {
  bot.command('mission', handleMissionEntry);

  bot.callbackQuery(/^mission_view_(\d+)$/, async (ctx) => {
    const user = getUser(ctx.from!.id);
    if (!user) {
      await ctx.answerCallbackQuery();
      return;
    }
    const day = parseInt(ctx.match[1], 10);
    const { text, kb } = buildMissionMessage(user.id, day);
    try {
      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
    } catch {
      /* ignore identical message */
    }
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^mission_done_(\d+)$/, async (ctx) => {
    const user = getUser(ctx.from!.id);
    if (!user) {
      await ctx.answerCallbackQuery();
      return;
    }
    const day = parseInt(ctx.match[1], 10);
    const newlyDone = completeMission(user.id, day);
    const { text, kb } = buildMissionMessage(user.id, day);

    let extra = '';
    if (newlyDone) {
      const newAch = checkAndUnlock(user);
      if (newAch.length) {
        extra += '\n\n🌟 <b>Новая ачивка!</b>\n';
        for (const code of newAch) extra += `\n${formatAchievement(code)}\n`;
      }
    }

    try {
      await ctx.editMessageText(text + extra, { parse_mode: 'HTML', reply_markup: kb });
    } catch {
      /* ignore */
    }
    if (newlyDone) {
      await maybeSendMeme(ctx, 'victory', 0.35);
    }
    await ctx.answerCallbackQuery(newlyDone ? '🎯 Отлично! Миссия засчитана!' : 'Уже выполнено');
  });
}
