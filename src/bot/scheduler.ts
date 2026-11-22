import cron from 'node-cron';
import type { Bot } from 'grammy';
import type { BotContext } from './index.js';
import { getAllActiveUsers } from '../services/user.js';
import { calcProgress } from '../services/progress.js';
import { popLatestNewlyReachedMilestone } from '../services/health.js';
import { sendDailyCheckin, sendEveningMotivation } from './handlers/checkin.js';

export function setupScheduler(bot: Bot<BotContext>) {
  cron.schedule('0 * * * *', async () => {
    const users = getAllActiveUsers();
    const utcHour = new Date().getUTCHours();

    for (const user of users) {
      if ((user.notifications_enabled ?? 1) === 0) continue;
      const localHour = (utcHour + user.timezone_offset + 24) % 24;

      try {
        if (localHour === 9) {
          await sendDailyCheckin(bot, user.telegram_id);
        } else if (localHour === 20) {
          await sendEveningMotivation(bot, user.telegram_id);
        }

        // Proactive health milestone celebration during daytime hours (8..22 local)
        if (localHour >= 8 && localHour <= 22) {
          const p = calcProgress(user);
          const milestone = popLatestNewlyReachedMilestone(user.id, p.smokeFreeMinutes);
          if (milestone) {
            await bot.api.sendMessage(
              user.telegram_id,
              `🎉 <b>Новая веха здоровья: ${milestone.emoji} ${milestone.title}!</b>\n\n` +
                `${milestone.text}\n\n` +
                `Твоё тело прямо сейчас восстанавливается. Загляни в /health, чтобы увидеть всю шкалу! 💪`,
              { parse_mode: 'HTML' }
            );
          }
        }
      } catch (e) {
        console.error(`Scheduler error for user ${user.telegram_id}:`, e);
      }
    }
  });

  console.log('Scheduler started');
}
