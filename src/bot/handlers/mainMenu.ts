import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { mainMenuActionForText } from '../../services/botConfig.js';
import { handleMyFreedom, handleEconomy, sendStatsImage } from './progress.js';
import { handleSosEntry } from './sos.js';
import { handleMythsMenu } from './myths.js';
import { handleAchievements } from './achievements.js';
import { handleMotivation } from './motivation.js';
import { handleMaterialsEntry } from './materials.js';
import { handleSettingsEntry } from './settings.js';
import { handleHealth } from './health.js';

/**
 * Маршрутизация по подписи кнопки главного меню (редактируется в админке → «Клавиатуры»).
 */
export function mainMenuTextRouter(bot: Bot<BotContext>) {
  bot.on('message:text', async (ctx, next) => {
    if (ctx.session.step) return next();
    const t = ctx.message.text.trim();
    if (t.startsWith('/')) return next();

    const action = mainMenuActionForText(t);
    if (!action) return next();

    switch (action) {
      case 'progress':
        await handleMyFreedom(ctx);
        break;
      case 'stats':
        await sendStatsImage(ctx);
        break;
      case 'sos':
        await handleSosEntry(ctx);
        break;
      case 'health':
        await handleHealth(ctx);
        break;
      case 'achievements':
        await handleAchievements(ctx);
        break;
      case 'myths':
        await handleMythsMenu(ctx);
        break;
      case 'economy':
        await handleEconomy(ctx);
        break;
      case 'motivation':
        await handleMotivation(ctx);
        break;
      case 'materials':
        await handleMaterialsEntry(ctx);
        break;
      case 'settings':
        await handleSettingsEntry(ctx);
        break;
      default:
        return next();
    }
  });
}
