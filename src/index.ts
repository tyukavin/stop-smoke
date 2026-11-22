import { config } from './config.js';
import { initDb } from './db/index.js';
import { createBot } from './bot/index.js';
import { setupScheduler } from './bot/scheduler.js';
import { createApi } from './api/index.js';
import {
  seedContent,
  seedMaterials,
  seedAdmin,
  seedBotConfig,
  migrateBotConfigCompactMainMenu,
  migrateBotConfigV3,
} from './content/seed.js';

async function main() {
  if (!config.botToken) {
    console.error('BOT_TOKEN is not set');
    process.exit(1);
  }

  initDb();
  console.log('Database initialized');

  seedContent();
  seedMaterials();
  seedAdmin();
  seedBotConfig();
  migrateBotConfigCompactMainMenu();
  migrateBotConfigV3();

  const bot = createBot();
  setupScheduler(bot);

  const api = await createApi();
  await api.listen({ port: config.apiPort, host: '0.0.0.0' });
  console.log(`API listening on port ${config.apiPort}`);

  bot.start({
    onStart: async (info) => {
      console.log(`Bot @${info.username} started`);
      try {
        await bot.api.setMyCommands([
          { command: 'start', description: 'Главное меню / начало' },
          { command: 'freedom', description: '🔓 Моя свобода и прогресс' },
          { command: 'sos', description: '🆘 Помощь при тяге' },
          { command: 'breathe', description: '🌬️ Дыхание 4-7-8 (60 сек)' },
          { command: 'mission', description: '🎯 Миссия дня (14-дневный курс)' },
          { command: 'analytics', description: '📊 Карта триггеров и тяги' },
          { command: 'health', description: '🏥 Шкала восстановления здоровья' },
          { command: 'goal', description: '💰 Экономия и личная цель' },
          { command: 'stats', description: '📸 Моя карточка прогресса' },
          { command: 'settings', description: '⚙️ Настройки профиля' },
        ]);
        if (config.webAppUrl) {
          await bot.api.setChatMenuButton({
            menu_button: {
              type: 'web_app',
              text: 'Приложение',
              web_app: { url: config.webAppUrl },
            },
          });
          console.log(`Telegram Mini App button configured: ${config.webAppUrl}`);
        }
      } catch (e) {
        console.warn('Could not register bot commands:', e);
      }
    },
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
