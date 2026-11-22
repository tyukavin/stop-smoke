import { InlineKeyboard, Keyboard } from 'grammy';
import { db } from '../db/index.js';

/** Значения по умолчанию (если в БД нет ключа — используется это). */
/** Reply-меню: ряды из { action, label } — label виден пользователю, action — внутренний ключ. */
export const BOT_CONFIG_DEFAULTS: Record<string, string> = {
  /** Компактное reply-меню: основное + «Ещё…» с inline-списком */
  kb_main_menu: JSON.stringify([
    [
      { action: 'progress', label: '🔓 Свобода' },
      { action: 'sos', label: '🆘 SOS' },
    ],
    [
      { action: 'myths', label: '🎭 Мифы' },
      { action: 'motivation', label: '💡 Мотивация' },
    ],
    [{ action: 'menu_more', label: '⋮ Ещё…' }],
  ]),
  /** Inline под «Ещё…» (callback_data: menu_*) */
  kb_main_menu_more: JSON.stringify([
    [
      { text: '🎯 Миссия дня', callback_data: 'menu_mission' },
      { text: '📊 Аналитика тяги', callback_data: 'menu_analytics' },
    ],
    [
      { text: '📸 Моя карточка', callback_data: 'menu_stats' },
      { text: '🏥 Здоровье', callback_data: 'menu_health' },
    ],
    [
      { text: '🏆 Достижения', callback_data: 'menu_achievements' },
      { text: '💰 Экономия', callback_data: 'menu_economy' },
    ],
    [
      { text: '📚 Материалы', callback_data: 'menu_materials' },
      { text: '⚙️ Настройки', callback_data: 'menu_settings' },
    ],
  ]),

  // ——— Inline: [[{text, callback_data}], ...] ———
  kb_device_type: JSON.stringify([
    [{ text: '🚬 Сигареты', callback_data: 'device_cigarettes' }],
    [{ text: '📱 IQOS / Glo', callback_data: 'device_iqos' }],
    [{ text: '💨 Вейп', callback_data: 'device_vape' }],
    [{ text: '🔋 Мини-вейп / Pod', callback_data: 'device_mini_vape' }],
  ]),
  kb_sos_actions: JSON.stringify([
    [
      { text: '🌬️ Дыхание 4-7-8 (60с)', callback_data: 'sos_breathe' },
      { text: '⏱️ Волна тяги (3 мин)', callback_data: 'sos_wave' },
    ],
    [{ text: '🧠 Рациональный ответ', callback_data: 'sos_rational' }],
    [{ text: '🔑 Переключение фокуса', callback_data: 'sos_switching' }],
    [{ text: '🎉 Поздравь меня!', callback_data: 'sos_celebrating' }],
    [
      { text: '🧘 Mindfulness', callback_data: 'sos_mindfulness' },
      { text: '🧠 CBT-техника', callback_data: 'sos_cbt' },
    ],
    [{ text: '🎲 Случайная поддержка', callback_data: 'sos_random' }],
    [
      { text: '✅ Чудовище побеждено!', callback_data: 'sos_resisted' },
      { text: '😔 Закурил(а)', callback_data: 'sos_relapsed' },
    ],
  ]),
  kb_intensity: JSON.stringify(
    [
      [1, 2, 3, 4, 5].map((n) => ({ text: String(n), callback_data: `intensity_${n}` })),
      [6, 7, 8, 9, 10].map((n) => ({ text: String(n), callback_data: `intensity_${n}` })),
    ]
  ),
  kb_trigger: JSON.stringify([
    [
      { text: '😤 Стресс', callback_data: 'trigger_stress' },
      { text: '🥱 Скука', callback_data: 'trigger_boredom' },
    ],
    [
      { text: '👥 Компания', callback_data: 'trigger_social' },
      { text: '☕ Кофе/еда', callback_data: 'trigger_coffee' },
    ],
    [
      { text: '🍺 Алкоголь', callback_data: 'trigger_alcohol' },
      { text: '🌅 Утро', callback_data: 'trigger_morning' },
    ],
    [
      { text: '🚗 Вождение', callback_data: 'trigger_driving' },
      { text: '😰 Тревога', callback_data: 'trigger_anxiety' },
    ],
    [{ text: '❓ Другое', callback_data: 'trigger_other' }],
  ]),
  kb_myth_categories: JSON.stringify([
    [
      { text: '😤 Стресс', callback_data: 'myth_stress' },
      { text: '🥱 Скука', callback_data: 'myth_boredom' },
    ],
    [
      { text: '🎯 Концентрация', callback_data: 'myth_concentration' },
      { text: '⚖️ Вес', callback_data: 'myth_weight' },
    ],
    [
      { text: '👥 Компания', callback_data: 'myth_social' },
      { text: '😌 Удовольствие', callback_data: 'myth_pleasure' },
    ],
    [
      { text: '☝️ Одна сигарета', callback_data: 'myth_one_cig' },
      { text: '🔄 Привычка', callback_data: 'myth_habit' },
    ],
    [
      { text: '🧬 Генетика', callback_data: 'myth_genetics' },
      { text: '📅 Время', callback_data: 'myth_timing' },
    ],
    [
      { text: '👴 Возраст', callback_data: 'myth_age' },
      { text: '🔬 Лёгкие сиг.', callback_data: 'myth_light' },
    ],
    [
      { text: '📱 IQOS', callback_data: 'myth_iqos_safe' },
      { text: '💨 Вейп', callback_data: 'myth_vape_safe' },
    ],
    [
      { text: '💪 Сила воли', callback_data: 'myth_willpower' },
      { text: '🎲 Случайный', callback_data: 'myth_random' },
    ],
  ]),
  kb_myth_result: JSON.stringify([
    [{ text: '🎭 Мифы', callback_data: 'myths_menu' }],
    [{ text: '🔄 Ещё один миф', callback_data: 'myth_random' }],
  ]),
  kb_mood: JSON.stringify([
    [
      { text: '😣 1', callback_data: 'mood_1' },
      { text: '😕 2', callback_data: 'mood_2' },
      { text: '🙂 3', callback_data: 'mood_3' },
      { text: '😄 4', callback_data: 'mood_4' },
      { text: '🤩 5', callback_data: 'mood_5' },
    ],
  ]),
  kb_checkin: JSON.stringify([
    [
      { text: '🔓 Свободен/на!', callback_data: 'checkin_yes' },
      { text: '😔 Закурил(а)', callback_data: 'checkin_no' },
    ],
  ]),
  kb_settings: JSON.stringify([
    [{ text: '🚬 Количество/день', callback_data: 'set_units' }],
    [{ text: '💵 Цена пачки', callback_data: 'set_price' }],
    [{ text: '🌐 Часовой пояс', callback_data: 'set_tz' }],
    [{ text: '💭 Моя мотивация', callback_data: 'set_motivation' }],
    [{ text: '🔄 Начать заново', callback_data: 'set_reset' }],
  ]),
  kb_onboard_confirm: JSON.stringify([
    [
      { text: '🔓 Я свободен! Начинаем!', callback_data: 'onboard_confirm' },
      { text: '✏️ Изменить', callback_data: 'onboard_restart' },
    ],
  ]),
  kb_material_cats: JSON.stringify([
    [{ text: '📚 Всё', callback_data: 'mat_all' }],
    [
      { text: '📖 Книги', callback_data: 'mat_book' },
      { text: '🎬 Видео', callback_data: 'mat_video' },
    ],
    [
      { text: '📰 Статьи', callback_data: 'mat_article' },
      { text: '📱 Приложения', callback_data: 'mat_app' },
    ],
    [{ text: '👥 Сообщества', callback_data: 'mat_community' }],
  ]),

  // ——— Тексты (HTML), ключи txt_* ———
  txt_need_onboarding: 'Сначала /start',
  txt_sos_intro:
    '🆘 <b>Чудовище подкрадывается? Ха!</b>\n\n' +
    'Оно голодное и жалкое. Через пару минут сдохнет.\n' +
    'Давай выберем, чем его добить 💀',
  txt_sos_trigger_prompt: '🔍 <b>А что спровоцировало?</b>',
  txt_myth_menu:
    '🎭 <b>Убийца мифов</b>\n\nТабачные компании создали мифы. Давай разрушим их.\nВыбери категорию:',
  txt_stats_generating: '⏳ Генерирую карточку...',
  txt_stats_caption: '🔓 Твоя карточка свободы! Поделись достижениями 💪',
  txt_stats_fail: 'Не удалось сгенерировать картинку, попробуй позже.',

  // ——— Онбординг (опрос при первом /start) ———
  txt_onboarding_return:
    '🔓 <b>С возвращением, свободный человек!</b>\n\nИспользуй меню ниже.',
  txt_onboarding_intro:
    '🔓 <b>Добро пожаловать в «Лёгкий способ»!</b>\n\n' +
    'Ты здесь, чтобы <b>освободиться</b> от никотиновой ловушки.\n\n' +
    'Не нужна сила воли — нужно только <b>понять</b>, как работает зависимость.\n\n' +
    'Я — твой коуч. Вот что я умею:\n' +
    '🔓 Трекинг свободы\n🆘 SOS при атаке Чудовища\n' +
    '🎭 Убийца мифов\n🧠 CBT и mindfulness техники\n' +
    '🏆 Достижения\n📚 Доп. материалы\n\n' +
    '<b>Что ты использовал?</b>',
  txt_onboard_units_cigarettes: '🚬 <b>Сколько сигарет в день ты курил?</b>',
  txt_onboard_units_iqos: '📱 <b>Сколько стиков IQOS в день?</b>',
  txt_onboard_units_vape: '💨 <b>Сколько затяжек вейпа в день?</b> (примерно)',
  txt_onboard_units_mini_vape: '🔋 <b>Сколько затяжек мини-вейпа в день?</b> (примерно)',
  txt_onboard_nicotine: '🧪 <b>Какая крепость жидкости (мг/мл никотина)?</b>\nНапример: 20, 50',
  txt_onboard_price_cigarettes: '💵 <b>Сколько стоит одна пачка сигарет (в рублях)?</b>',
  txt_onboard_price_iqos: '💵 <b>Сколько стоит одна пачка стиков (в рублях)?</b>',
  txt_onboard_price_vape: '💵 <b>Сколько стоит один флакон жидкости (в рублях)?</b>',
  txt_onboard_price_mini_vape: '💵 <b>Сколько стоит одна одноразка / картридж (в рублях)?</b>',
  txt_onboard_years: '📅 <b>Сколько лет ты в никотиновой ловушке?</b>',
  txt_onboard_why:
    '💭 <b>Зачем ты хочешь стать свободным?</b>\n\n' +
    'Напиши главную причину.\n\n' +
    '<i>Например: «Хочу дышать свободно», «Ради детей», «Не хочу быть рабом»</i>',
  txt_onboard_done_edit:
    '🎉 <b>Поздравляю! Ты выбрал свободу!</b>\n\n' +
    'Маленькое Чудовище скоро умрёт от голода. ' +
    'Не кормить его — не требует силы воли. Только понимания.\n\n' +
    '🔓 <b>Добро пожаловать в ряды счастливых некурящих!</b>',
  txt_onboard_choose_action: 'Выбери действие:',
  txt_onboard_what_device: '<b>Что ты использовал?</b>',
  txt_settings_reset_done:
    '🔄 <b>Таймер обновлён.</b>\nТы снова свободен — прямо сейчас! 🔓',
  txt_main_menu_more: '👇 <b>Ещё разделы</b>',
};

const cache = new Map<string, string>();

export function botConfigGetRaw(key: string): string {
  if (cache.has(key)) return cache.get(key)!;
  const row = db.prepare('SELECT value FROM bot_config WHERE key = ?').get(key) as { value: string } | undefined;
  const v = row?.value ?? BOT_CONFIG_DEFAULTS[key] ?? '';
  cache.set(key, v);
  return v;
}

export function botConfigSet(key: string, value: string): void {
  db.prepare(
    'INSERT INTO bot_config (key, value, updated_at) VALUES (?, ?, datetime(\'now\')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime(\'now\')'
  ).run(key, value);
  cache.set(key, value);
}

export function botConfigList(): { key: string; value: string }[] {
  const rows = db.prepare('SELECT key, value FROM bot_config').all() as { key: string; value: string }[];
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return Object.keys(BOT_CONFIG_DEFAULTS).map((key) => ({
    key,
    value: map.get(key) ?? BOT_CONFIG_DEFAULTS[key] ?? '',
  }));
}

/** Сброс кэша (после массового импорта). */
export function botConfigInvalidateCache(): void {
  cache.clear();
}

type InlineBtn = { text: string; callback_data: string };

/** Корректная сборка inline-клавиатуры из JSON (по рядам). */
export function inlineKeyboardFromConfig(key: string, fallback: InlineKeyboard): InlineKeyboard {
  const raw = botConfigGetRaw(key);
  try {
    const rows = JSON.parse(raw) as InlineBtn[][];
    if (!Array.isArray(rows) || !rows.length) return fallback;
    const kb = new InlineKeyboard();
    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri];
      if (!Array.isArray(row) || !row.length) continue;
      for (const b of row) {
        if (!b?.text || !b?.callback_data) continue;
        kb.text(b.text, b.callback_data);
      }
      if (ri < rows.length - 1) kb.row();
    }
    return kb;
  } catch {
    return fallback;
  }
}

export type MainMenuCell = { action: string; label: string };

/** Reply-клавиатура из JSON: [[{action,label},...],...] или legacy [[строка,...],...] */
export function replyKeyboardFromConfig(key: string, fallback: Keyboard): Keyboard {
  const raw = botConfigGetRaw(key);
  try {
    const rows = JSON.parse(raw) as (string | MainMenuCell)[][];
    if (!Array.isArray(rows) || !rows.length) return fallback;
    const kb = new Keyboard();
    for (const row of rows) {
      if (!Array.isArray(row)) continue;
      for (const cell of row) {
        const label = typeof cell === 'string' ? cell : cell?.label;
        if (label) kb.text(label);
      }
      kb.row();
    }
    return kb.resized();
  } catch {
    return fallback;
  }
}

/** Старый формат меню — только подписи; маппинг на действия. */
const LEGACY_MAIN_MENU_LABEL_TO_ACTION: Record<string, string> = {
  '🔓 Моя свобода': 'progress',
  '🔓 Свобода': 'progress',
  '📸 Моя карточка': 'stats',
  '🆘 Чудовище атакует!': 'sos',
  '🆘 SOS': 'sos',
  '🏥 Здоровье': 'health',
  '🏆 Достижения': 'achievements',
  '🏆 Ачивки': 'achievements',
  '🎭 Мифы': 'myths',
  '💰 Экономия': 'economy',
  '💡 Мотивация': 'motivation',
  '📚 Материалы': 'materials',
  '⚙️ Настройки': 'settings',
  '🎯 Миссия дня': 'mission',
  '📊 Аналитика тяги': 'analytics',
  '⋮ Ещё…': 'menu_more',
};

/** Найти action по тексту кнопки главного меню (после trim). */
export function mainMenuActionForText(text: string): string | undefined {
  const t = text.trim();
  const raw = botConfigGetRaw('kb_main_menu');
  try {
    const rows = JSON.parse(raw) as (string | MainMenuCell)[][];
    for (const row of rows) {
      if (!Array.isArray(row)) continue;
      for (const cell of row) {
        if (typeof cell === 'string') {
          if (cell === t) return LEGACY_MAIN_MENU_LABEL_TO_ACTION[t];
        } else if (cell?.label === t) return cell.action;
      }
    }
  } catch {
    /* ignore */
  }
  return LEGACY_MAIN_MENU_LABEL_TO_ACTION[t];
}
