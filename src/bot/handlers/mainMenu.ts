import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { botConfigGetRaw, inlineKeyboardFromConfig, mainMenuActionForText } from '../../services/botConfig.js';
import { handleMyFreedom, handleEconomy, sendStatsImage } from './progress.js';
import { handleSosEntry } from './sos.js';
import { handleMythsMenu } from './myths.js';
import { handleAchievements } from './achievements.js';
import { handleMotivation } from './motivation.js';
import { handleMaterialsEntry } from './materials.js';
import { handleSettingsEntry } from './settings.js';
import { handleHealth } from './health.js';
import { InlineKeyboard } from 'grammy';

function moreKbFallback() {
  return new InlineKeyboard()
    .text('📸 Моя карточка', 'menu_stats').row()
    .text('🏥 Здоровье', 'menu_health').row()
    .text('🏆 Достижения', 'menu_achievements').row()
    .text('💰 Экономия', 'menu_economy').row()
    .text('📚 Материалы', 'menu_materials').row()
    .text('⚙️ Настройки', 'menu_settings');
}

async function dispatchAction(ctx: BotContext, action: string): Promise<void> {
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
      break;
  }
}

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

    if (action === 'menu_more') {
      await ctx.reply(botConfigGetRaw('txt_main_menu_more'), {
        parse_mode: 'HTML',
        reply_markup: inlineKeyboardFromConfig('kb_main_menu_more', moreKbFallback()),
      });
      return;
    }

    await dispatchAction(ctx, action);
  });

  const menuCb = async (ctx: BotContext, action: string) => {
    await dispatchAction(ctx, action);
    await ctx.answerCallbackQuery();
  };

  bot.callbackQuery('menu_stats', (ctx) => menuCb(ctx, 'stats'));
  bot.callbackQuery('menu_health', (ctx) => menuCb(ctx, 'health'));
  bot.callbackQuery('menu_achievements', (ctx) => menuCb(ctx, 'achievements'));
  bot.callbackQuery('menu_economy', (ctx) => menuCb(ctx, 'economy'));
  bot.callbackQuery('menu_materials', (ctx) => menuCb(ctx, 'materials'));
  bot.callbackQuery('menu_settings', (ctx) => menuCb(ctx, 'settings'));
}
