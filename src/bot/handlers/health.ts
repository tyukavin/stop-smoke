import { InlineKeyboard, type Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { mainMenuKb } from '../keyboards/main.js';
import { getUser } from '../../services/user.js';
import { calcProgress } from '../../services/progress.js';
import { botConfigGetRaw } from '../../services/botConfig.js';
import {
  HEALTH_MILESTONES,
  getNextHealthMilestone,
  formatRemainingTime,
} from '../../services/health.js';
import { progressBar } from '../../utils/html.js';

function formatHealthText(freeMinutes: number, showAll: boolean): string {
  const lines: string[] = ['🏥 <b>Шкала восстановления здоровья (ВОЗ / ACS)</b>\n'];
  const nextInfo = getNextHealthMilestone(freeMinutes);

  let reachedCount = 0;
  for (const m of HEALTH_MILESTONES) {
    if (freeMinutes >= m.minutes) {
      reachedCount++;
      lines.push(`  ✅ ${m.emoji} <b>${m.title}</b> — ${m.text}`);
    } else if (showAll) {
      lines.push(`  ⬜ ${m.emoji} ${m.title} — ${m.text}`);
    } else {
      const pct = nextInfo ? Math.round(nextInfo.progressFraction * 100) : 0;
      const bar = nextInfo ? progressBar(nextInfo.progressFraction, 10) : progressBar(0, 10);
      lines.push(`\n  🎯 ${m.emoji} <b>Следующий этап: ${m.title}</b>`);
      lines.push(`  ${m.text}`);
      lines.push(`  ${bar} <b>${pct}%</b> (осталось <b>${formatRemainingTime(m.minutes - freeMinutes)}</b>)`);
      break;
    }
  }

  lines.push(`\n📊 Пройдено этапов: <b>${reachedCount} / ${HEALTH_MILESTONES.length}</b>`);

  if (!nextInfo) {
    lines.push('🌟 <b>Все этапы восстановления пройдены!</b>');
  }
  return lines.join('\n');
}

export async function handleHealth(ctx: BotContext): Promise<void> {
  const user = getUser(ctx.from!.id);
  if (!user?.onboarding_done) {
    await ctx.reply(botConfigGetRaw('txt_need_onboarding'), { parse_mode: 'HTML' });
    return;
  }

  const p = calcProgress(user);
  const text = formatHealthText(p.smokeFreeMinutes, false);
  const kb = new InlineKeyboard().text('📋 Показать все 16 этапов', 'health_show_all');

  await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
}

export function healthHandlers(bot: Bot<BotContext>) {
  bot.command('health', handleHealth);

  bot.callbackQuery('health_show_all', async (ctx) => {
    const user = getUser(ctx.from!.id);
    if (!user) {
      await ctx.answerCallbackQuery();
      return;
    }
    const p = calcProgress(user);
    const text = formatHealthText(p.smokeFreeMinutes, true);
    const kb = new InlineKeyboard().text('🔼 Свернуть до ближайшего', 'health_show_short');
    try {
      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
    } catch {
      /* ignore */
    }
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('health_show_short', async (ctx) => {
    const user = getUser(ctx.from!.id);
    if (!user) {
      await ctx.answerCallbackQuery();
      return;
    }
    const p = calcProgress(user);
    const text = formatHealthText(p.smokeFreeMinutes, false);
    const kb = new InlineKeyboard().text('📋 Показать все 16 этапов', 'health_show_all');
    try {
      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
    } catch {
      /* ignore */
    }
    await ctx.answerCallbackQuery();
  });

  // Ensure mainMenuKb import is used if needed
  void mainMenuKb;
}
