import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { materialCategoriesKb, mainMenuKb } from '../keyboards/main.js';
import { getUser } from '../../services/user.js';
import { botConfigGetRaw } from '../../services/botConfig.js';
import { getMaterials, MATERIAL_CATEGORIES } from '../../services/materials.js';

export async function handleMaterialsEntry(ctx: BotContext): Promise<void> {
  const user = getUser(ctx.from!.id);
  if (!user?.onboarding_done) {
    await ctx.reply(botConfigGetRaw('txt_need_onboarding'), { parse_mode: 'HTML' });
    return;
  }
  await ctx.reply(
    '📚 <b>Дополнительные материалы</b>\n\nВыбери категорию:',
    { parse_mode: 'HTML', reply_markup: materialCategoriesKb() }
  );
}

export function materialsHandlers(bot: Bot<BotContext>) {
  bot.callbackQuery(/^mat_(.+)$/, async (ctx) => {
    const cat = ctx.match![1];
    const mats = cat === 'all' ? getMaterials() : getMaterials(cat);

    if (!mats.length) {
      await ctx.reply('Пока нет материалов в этой категории.');
      await ctx.answerCallbackQuery();
      return;
    }

    const catLabel = MATERIAL_CATEGORIES.find(c => c.key === cat)?.label || '📚';
    let text = `${cat === 'all' ? '📚' : catLabel} <b>Материалы</b>\n\n`;
    for (const m of mats) {
      text += `• <a href="${m.url}">${m.title}</a>`;
      if (m.description) text += ` — ${m.description}`;
      text += '\n';
    }

    await ctx.reply(text, { parse_mode: 'HTML', link_preview_options: { is_disabled: true }, reply_markup: mainMenuKb() });
    await ctx.answerCallbackQuery();
  });
}
