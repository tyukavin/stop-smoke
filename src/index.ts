import { config } from './config.js';
import { initDb } from './db/index.js';
import { createBot } from './bot/index.js';
import { setupScheduler } from './bot/scheduler.js';
import { createApi } from './api/index.js';
import { seedContent, seedMaterials } from './content/seed.js';

async function main() {
  if (!config.botToken) {
    console.error('BOT_TOKEN is not set');
    process.exit(1);
  }

  initDb();
  console.log('Database initialized');

  seedContent();
  seedMaterials();

  const bot = createBot();
  setupScheduler(bot);

  const api = await createApi();
  await api.listen({ port: config.apiPort, host: '0.0.0.0' });
  console.log(`API listening on port ${config.apiPort}`);

  bot.start({
    onStart: (info) => console.log(`Bot @${info.username} started`),
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
