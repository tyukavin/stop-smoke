import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { InlineKeyboard } from 'grammy';
import { config } from '../../config.js';
import { getUser } from '../../services/user.js';
import { addContent, getAllContent, deleteContent, getContentCount, updateContent } from '../../services/content.js';
import { addMaterial, getAllMaterials, deleteMaterial } from '../../services/materials.js';
import { getActiveUserCount, getUserCount } from '../../services/user.js';

function isAdmin(telegramId: number): boolean {
  const user = getUser(telegramId);
  return !!(user?.is_admin) || config.adminIds.includes(telegramId);
}

const CONTENT_TYPES = [
  'motivation', 'myth', 'sos_rational', 'sos_switching', 'sos_celebrating',
  'trigger_tip', 'health_fact', 'cbt_technique', 'mindfulness',
  'checkin_morning', 'checkin_evening',
];

function adminMenuKb() {
  return new InlineKeyboard()
    .text('📊 Статистика', 'adm_stats').row()
    .text('➕ Добавить контент', 'adm_add_content').row()
    .text('📝 Список контента', 'adm_list_content').row()
    .text('➕ Добавить материал', 'adm_add_material').row()
    .text('📚 Список материалов', 'adm_list_materials');
}

function contentTypeKb() {
  const kb = new InlineKeyboard();
  for (let i = 0; i < CONTENT_TYPES.length; i++) {
    kb.text(CONTENT_TYPES[i], `adm_ct_${CONTENT_TYPES[i]}`);
    if (i % 2 === 1 || i === CONTENT_TYPES.length - 1) kb.row();
  }
  return kb;
}

export function adminHandlers(bot: Bot<BotContext>) {
  bot.command('admin', async (ctx) => {
    if (!isAdmin(ctx.from!.id)) { await ctx.reply('Нет доступа.'); return; }
    await ctx.reply('🔐 <b>Админ-панель</b>', { parse_mode: 'HTML', reply_markup: adminMenuKb() });
  });

  bot.callbackQuery('adm_stats', async (ctx) => {
    if (!isAdmin(ctx.from!.id)) { await ctx.answerCallbackQuery('Нет доступа'); return; }
    const total = getUserCount();
    const active = getActiveUserCount();
    const content = getContentCount();

    const typeCounts = CONTENT_TYPES.map(t => `  ${t}: ${getContentCount(t)}`).join('\n');

    await ctx.reply(
      `📊 <b>Статистика</b>\n\n` +
      `👥 Всего: <b>${total}</b> | Активных: <b>${active}</b>\n` +
      `📝 Контента: <b>${content}</b>\n\n${typeCounts}`,
      { parse_mode: 'HTML' }
    );
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('adm_add_content', async (ctx) => {
    if (!isAdmin(ctx.from!.id)) { await ctx.answerCallbackQuery('Нет доступа'); return; }
    ctx.session.step = 'admin_pick_type';
    await ctx.reply('Выбери тип контента:', { reply_markup: contentTypeKb() });
    await ctx.answerCallbackQuery();
  });

  for (const t of CONTENT_TYPES) {
    bot.callbackQuery(`adm_ct_${t}`, async (ctx) => {
      if (!isAdmin(ctx.from!.id)) { await ctx.answerCallbackQuery('Нет доступа'); return; }
      ctx.session.step = 'admin_content_text';
      ctx.session.adminContentType = t;
      const needsCat = ['myth', 'trigger_tip'].includes(t);
      if (needsCat) {
        ctx.session.step = 'admin_content_category';
        await ctx.reply(`Введи категорию для ${t} (например: stress, boredom, weight):`);
      } else {
        await ctx.reply(`Введи текст для <b>${t}</b>:\n(поддерживается HTML)`, { parse_mode: 'HTML' });
      }
      await ctx.answerCallbackQuery();
    });
  }

  bot.callbackQuery('adm_list_content', async (ctx) => {
    if (!isAdmin(ctx.from!.id)) { await ctx.answerCallbackQuery('Нет доступа'); return; }
    const all = getAllContent();
    const last20 = all.slice(0, 20);
    let text = '📝 <b>Последние 20 записей</b>\n\n';
    for (const c of last20) {
      const preview = c.text.replace(/<[^>]+>/g, '').slice(0, 60);
      text += `[${c.id}] <b>${c.type}</b>${c.category ? ` (${c.category})` : ''}: ${preview}…\n`;
    }
    text += `\nУдалить: /del_content ID`;
    await ctx.reply(text, { parse_mode: 'HTML' });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('adm_add_material', async (ctx) => {
    if (!isAdmin(ctx.from!.id)) { await ctx.answerCallbackQuery('Нет доступа'); return; }
    ctx.session.step = 'admin_material';
    await ctx.reply(
      'Введи материал в формате:\n<code>Название | URL | Описание | Категория</code>\n\n' +
      'Категории: general, video, article, book, app, community',
      { parse_mode: 'HTML' }
    );
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('adm_list_materials', async (ctx) => {
    if (!isAdmin(ctx.from!.id)) { await ctx.answerCallbackQuery('Нет доступа'); return; }
    const all = getAllMaterials();
    let text = '📚 <b>Материалы</b>\n\n';
    for (const m of all) {
      text += `[${m.id}] ${m.active ? '✅' : '❌'} <b>${m.title}</b> (${m.category})\n`;
    }
    text += '\nУдалить: /del_material ID';
    await ctx.reply(text, { parse_mode: 'HTML' });
    await ctx.answerCallbackQuery();
  });

  bot.hears(/^\/del_content\s+(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx.from!.id)) return;
    const id = parseInt(ctx.match![1]);
    deleteContent(id);
    await ctx.reply(`✅ Контент #${id} удалён.`);
  });

  bot.hears(/^\/del_material\s+(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx.from!.id)) return;
    const id = parseInt(ctx.match![1]);
    deleteMaterial(id);
    await ctx.reply(`✅ Материал #${id} удалён.`);
  });

  bot.on('message:text', async (ctx, next) => {
    if (!ctx.session.step?.startsWith('admin_')) return next();
    if (!isAdmin(ctx.from!.id)) { ctx.session.step = undefined; return next(); }
    const text = ctx.message.text.trim();

    if (ctx.session.step === 'admin_content_category') {
      ctx.session.adminContentCategory = text;
      ctx.session.step = 'admin_content_text';
      await ctx.reply(`Категория: <b>${text}</b>\nТеперь введи текст:`, { parse_mode: 'HTML' });
      return;
    }

    if (ctx.session.step === 'admin_content_text') {
      const type = ctx.session.adminContentType || 'motivation';
      const category = ctx.session.adminContentCategory || '';
      const id = addContent(type, text, category);
      ctx.session.step = undefined;
      ctx.session.adminContentType = undefined;
      ctx.session.adminContentCategory = undefined;
      await ctx.reply(`✅ Контент #${id} добавлен (${type}${category ? '/' + category : ''}).`, { reply_markup: adminMenuKb() });
      return;
    }

    if (ctx.session.step === 'admin_material') {
      const parts = text.split('|').map(s => s.trim());
      if (parts.length < 2) {
        await ctx.reply('Нужно минимум: Название | URL');
        return;
      }
      const id = addMaterial(parts[0], parts[1], parts[2] || '', parts[3] || 'general');
      ctx.session.step = undefined;
      await ctx.reply(`✅ Материал #${id} добавлен.`, { reply_markup: adminMenuKb() });
      return;
    }

    return next();
  });
}
