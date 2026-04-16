import { Bot, session, type Context, type SessionFlavor } from 'grammy';
import { config } from '../config.js';
import { onboardingHandlers } from './handlers/onboarding.js';
import { progressHandlers } from './handlers/progress.js';
import { sosHandlers } from './handlers/sos.js';
import { mythsHandlers } from './handlers/myths.js';
import { achievementsHandlers } from './handlers/achievements.js';
import { motivationHandlers } from './handlers/motivation.js';
import { checkinHandlers } from './handlers/checkin.js';
import { materialsHandlers } from './handlers/materials.js';
import { settingsHandlers } from './handlers/settings.js';
import { adminHandlers } from './handlers/admin.js';
import { healthHandlers } from './handlers/health.js';

export interface SessionData {
  step?: string;
  deviceType?: string;
  unitsPerDay?: number;
  pricePerPack?: number;
  unitsInPack?: number;
  nicotineMg?: number;
  yearsSmoking?: number;
  motivation?: string;
  editField?: string;
  cravingResisted?: boolean;
  cravingIntensity?: number;
  adminAction?: string;
  adminContentType?: string;
  adminContentCategory?: string;
}

export type BotContext = Context & SessionFlavor<SessionData>;

export function createBot(): Bot<BotContext> {
  const bot = new Bot<BotContext>(config.botToken);

  bot.use(session({ initial: (): SessionData => ({}) }));

  onboardingHandlers(bot);
  progressHandlers(bot);
  sosHandlers(bot);
  mythsHandlers(bot);
  healthHandlers(bot);
  achievementsHandlers(bot);
  motivationHandlers(bot);
  checkinHandlers(bot);
  materialsHandlers(bot);
  settingsHandlers(bot);
  adminHandlers(bot);

  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  return bot;
}
