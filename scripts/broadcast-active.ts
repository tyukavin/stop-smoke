/**
 * One-off broadcast to all users who finished onboarding.
 * Usage: BOT_TOKEN=... npx tsx scripts/broadcast-active.ts
 * Optional: BROADCAST_TEXT="..." (HTML)
 */
import 'dotenv/config';
import { Bot } from 'grammy';
import { config } from '../src/config.js';
import { initDb } from '../src/db/index.js';
import { getAllActiveUsers } from '../src/services/user.js';

const DEFAULT_TEXT =
  '✅ <b>Бот снова в сети.</b>\n\n' +
  'Мы перенесли сервис на новый сервер. Если что-то ведёт себя странно — напишите в поддержку. ' +
  'Держитесь! 💪';

async function main() {
  if (!config.botToken) {
    console.error('BOT_TOKEN is not set');
    process.exit(1);
  }

  initDb();
  const users = getAllActiveUsers();
  const text = process.env.BROADCAST_TEXT || DEFAULT_TEXT;

  console.log(`Broadcasting to ${users.length} active user(s)...`);

  const bot = new Bot(config.botToken);
  let ok = 0;
  let fail = 0;

  for (const u of users) {
    try {
      await bot.api.sendMessage(u.telegram_id, text, { parse_mode: 'HTML' });
      ok++;
    } catch (e) {
      fail++;
      console.error(`Failed telegram_id=${u.telegram_id}:`, (e as Error).message);
    }
    await new Promise((r) => setTimeout(r, 50));
  }

  console.log(`Done. Sent: ${ok}, failed: ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
