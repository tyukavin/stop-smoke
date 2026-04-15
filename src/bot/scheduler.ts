import cron from 'node-cron';
import type { Bot } from 'grammy';
import type { BotContext } from './index.js';
import { getAllActiveUsers } from '../services/user.js';
import { sendDailyCheckin, sendEveningMotivation } from './handlers/checkin.js';

export function setupScheduler(bot: Bot<BotContext>) {
  cron.schedule('0 * * * *', async () => {
    const users = getAllActiveUsers();
    const utcHour = new Date().getUTCHours();

    for (const user of users) {
      const localHour = (utcHour + user.timezone_offset + 24) % 24;

      try {
        if (localHour === 9) {
          await sendDailyCheckin(bot, user.telegram_id);
        } else if (localHour === 20) {
          await sendEveningMotivation(bot, user.telegram_id);
        }
      } catch (e) {
        console.error(`Scheduler error for user ${user.telegram_id}:`, e);
      }
    }
  });

  console.log('Scheduler started');
}
