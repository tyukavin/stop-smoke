import 'dotenv/config';

export const config = {
  botToken: process.env.BOT_TOKEN || '',
  dbPath: process.env.DB_PATH || 'data/quitbot.db',
  apiPort: parseInt(process.env.API_PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  adminIds: (process.env.ADMIN_IDS || '').split(',').filter(Boolean).map(Number),
};
