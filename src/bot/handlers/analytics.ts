import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { mainMenuKb } from '../keyboards/main.js';
import { getUser } from '../../services/user.js';
import { getCravingAnalytics } from '../../services/analytics.js';
import { getContentForUser } from '../../services/content.js';
import { botConfigGetRaw } from '../../services/botConfig.js';
import { progressBar } from '../../utils/html.js';

export async function handleAnalytics(ctx: BotContext): Promise<void> {
  const user = getUser(ctx.from!.id);
  if (!user?.onboarding_done) {
    await ctx.reply(botConfigGetRaw('txt_need_onboarding'), { parse_mode: 'HTML' });
    return;
  }

  const a = getCravingAnalytics(user.id, user.timezone_offset);
  const lines: string[] = ['📊 <b>Карта триггеров и аналитика тяги</b>\n'];

  if (a.total === 0) {
    lines.push(
      'Пока нет зафиксированных атак Чудовища — это отличный знак! 🔓\n\n' +
        'Когда почувствуешь тягу, нажми <b>🆘 SOS</b> и отметь исход — я построю твою личную карту триггеров, опасного времени суток и динамику ослабления тяги.'
    );
  } else {
    lines.push(
      `🥊 Отбито атак: <b>${a.resisted} из ${a.total}</b> (<b>${a.winRate}%</b> побед)\n` +
        `🔥 Средняя сила тяги: <b>${a.avgIntensity}/10</b>`
    );

    if (a.recent7dAvgIntensity !== null && a.prev7dAvgIntensity !== null) {
      const diff = Math.round((a.recent7dAvgIntensity - a.prev7dAvgIntensity) * 10) / 10;
      if (diff < 0) {
        lines.push(`📉 Динамика за 7 дней: тяга ослабла на <b>${Math.abs(diff)}</b> балла — Чудовище сдаётся!`);
      } else if (diff > 0) {
        lines.push(`📈 Динамика за 7 дней: +${diff} к силе — проверь главный триггер ниже.`);
      } else {
        lines.push(`➡️ Динамика за 7 дней: стабильно (${a.recent7dAvgIntensity}/10).`);
      }
    }

    if (a.topTriggers.length > 0) {
      lines.push('\n🎯 <b>Твои главные триггеры:</b>');
      for (const t of a.topTriggers) {
        const bar = progressBar(t.percent / 100, 8);
        lines.push(`  ${t.label}: ${bar} <b>${t.percent}%</b> (${t.count})`);
      }
    }

    if (a.peakTimeBucket) {
      lines.push(
        `\n⏰ <b>Опасное время суток:</b> ${a.peakTimeBucket.label} (${a.peakTimeBucket.count} атак)`
      );
    }

    const topTrig = a.topTriggers[0]?.trigger;
    if (topTrig) {
      const tip = getContentForUser(user.id, 'trigger_tip', topTrig);
      if (tip) {
        lines.push(`\n💡 <b>Персональный совет по главному триггеру:</b>\n${tip.text}`);
      }
    }
  }

  if (a.moodAvg7d !== null) {
    const stars = '⭐'.repeat(Math.round(a.moodAvg7d));
    lines.push(
      `\n😊 <b>Настроение за 7 дней:</b> ${a.moodAvg7d}/5 ${stars} (${a.moodCount7d} оценок)`
    );
  }

  await ctx.reply(lines.join('\n'), { parse_mode: 'HTML', reply_markup: mainMenuKb() });
}

export function analyticsHandlers(bot: Bot<BotContext>) {
  bot.command('analytics', handleAnalytics);
}
