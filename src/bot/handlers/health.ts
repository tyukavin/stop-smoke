import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { mainMenuKb } from '../keyboards/main.js';
import { getUser } from '../../services/user.js';
import { calcProgress } from '../../services/progress.js';

const MILESTONES = [
  { minutes: 20, title: '20 минут', text: 'Пульс и давление нормализуются.', emoji: '❤️' },
  { minutes: 480, title: '8 часов', text: 'Угарный газ в крови ↓ вдвое. Кислород в норме.', emoji: '🩸' },
  { minutes: 720, title: '12 часов', text: 'Угарный газ полностью выведен.', emoji: '💨' },
  { minutes: 1440, title: '24 часа', text: 'Риск сердечного приступа начал снижаться.', emoji: '💓' },
  { minutes: 2880, title: '48 часов', text: 'Вкус и обоняние становятся ярче.', emoji: '👃' },
  { minutes: 4320, title: '72 часа', text: 'Бронхи расслабляются. Никотин вышел полностью!', emoji: '🌿' },
  { minutes: 14400, title: '10 дней', text: 'Кровообращение в дёснах нормализуется.', emoji: '🦷' },
  { minutes: 20160, title: '2 недели', text: 'Кровообращение значительно улучшилось.', emoji: '🚶' },
  { minutes: 43200, title: '1 месяц', text: 'Кашель и одышка уменьшаются.', emoji: '🍃' },
  { minutes: 129600, title: '3 месяца', text: 'Объём лёгких +30%.', emoji: '🏃' },
  { minutes: 259200, title: '6 месяцев', text: 'Хронический кашель прошёл.', emoji: '🌻' },
  { minutes: 525600, title: '1 год', text: 'Риск ишемической болезни ↓ вдвое!', emoji: '🎉' },
  { minutes: 2628000, title: '5 лет', text: 'Риск инсульта как у некурящего.', emoji: '🧠' },
  { minutes: 5256000, title: '10 лет', text: 'Риск рака лёгких ↓ вдвое.', emoji: '🌟' },
  { minutes: 7884000, title: '15 лет', text: 'Сердце как у никогда не курившего!', emoji: '💖' },
];

export function healthHandlers(bot: Bot<BotContext>) {
  bot.hears('🏥 Здоровье', async (ctx) => {
    const user = getUser(ctx.from!.id);
    if (!user?.onboarding_done) { await ctx.reply('Сначала /start'); return; }

    const p = calcProgress(user);
    const freeMinutes = p.smokeFreeMinutes;

    const lines: string[] = ['🏥 <b>Шкала восстановления здоровья</b>\n'];

    for (const m of MILESTONES) {
      if (freeMinutes >= m.minutes) {
        lines.push(`  ✅ ${m.emoji} <b>${m.title}</b> — ${m.text}`);
      } else {
        lines.push(`  ⬜ ${m.emoji} ${m.title} — ${m.text}`);
        const remaining = m.minutes - freeMinutes;
        let timeLeft: string;
        if (remaining < 60) timeLeft = `${Math.ceil(remaining)} мин.`;
        else if (remaining < 1440) timeLeft = `${(remaining / 60).toFixed(1)} ч.`;
        else timeLeft = `${Math.ceil(remaining / 1440)} дн.`;
        lines.push(`\n⏳ До следующего: <b>${timeLeft}</b>`);
        break;
      }
    }

    if (freeMinutes >= MILESTONES[MILESTONES.length - 1].minutes) {
      lines.push('\n🌟 <b>Все этапы восстановления пройдены!</b>');
    }

    await ctx.reply(lines.join('\n'), { parse_mode: 'HTML', reply_markup: mainMenuKb() });
  });
}
