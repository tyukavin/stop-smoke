import { db } from '../db/index.js';

export interface DailyMission {
  day: number;
  title: string;
  task: string;
  why: string;
  emoji: string;
}

export const DAILY_MISSIONS: DailyMission[] = [
  {
    day: 1,
    emoji: '🧹',
    title: 'Зачистка территории',
    task: 'Убери из зоны видимости всё, что связано с курением: пачки, зажигалки, стики, жижи, пепельницы.',
    why: 'Мозг запускает тягу на визуальный триггер за 0.3 секунды. Убрал с глаз — снял половину атак.',
  },
  {
    day: 2,
    emoji: '💧',
    title: 'Водный щит',
    task: 'Поставь рядом бутылку воды. Каждый раз, когда всплывает мысль о затяжке — делай 3 глотка холодной воды.',
    why: 'Вода ускоряет выведение никотина и занимает рот/руки новым простым действием.',
  },
  {
    day: 3,
    emoji: '🏆',
    title: 'Похороны Маленького Чудовища',
    task: 'Сегодня 72 часа — никотин полностью выходит из тела! Отметь это: купи себе что-то вкусное на сэкономленные деньги.',
    why: 'Позитивное подкрепление переписывает дофаминовую петлю: свобода = награда, а не лишение.',
  },
  {
    day: 4,
    emoji: '☕',
    title: 'План «Б» для главного триггера',
    task: 'Выбери свою самую привычную связку (например, утренний кофе или выход из офиса) и заранее придумай замену на 3 минуты.',
    why: 'CBT-принцип «если X → делаю Y» повышает шанс пройти триггер без тяги в 3 раза.',
  },
  {
    day: 5,
    emoji: '🌬️',
    title: 'Тест дыхания 4-7-8',
    task: 'Сделай один полный цикл дыхания 4-7-8 через кнопку в SOS, даже если сейчас не тянет.',
    why: 'Инструмент, который ты попробовал в спокойном состоянии, срабатывает на автомате в стрессе.',
  },
  {
    day: 6,
    emoji: '🎭',
    title: 'Разоблачи 2 мифа',
    task: 'Зайди в раздел «🎭 Мифы» и прочитай 2 мифа, в которые ты раньше искренне верил(а).',
    why: 'Аллен Карр: когда рушится иллюзия пользы, исчезает само желание — сила воли больше не нужна.',
  },
  {
    day: 7,
    emoji: '📸',
    title: 'Зафиксируй первую неделю',
    task: 'Сгенерируй свою карточку (/stats) и сохрани её или отправь близкому человеку.',
    why: 'Публичная или визуальная фиксация успеха закрепляет новую идентичность: «я некурящий».',
  },
  {
    day: 8,
    emoji: '👃',
    title: 'Охота за запахами и вкусами',
    task: 'Сегодня осознанно понюхай кофе, свежий воздух или любимую еду — заметь, насколько ярче стали ощущения.',
    why: 'Рецепторы активно восстанавливаются. Фокус на реальных плюсах усиливает внутреннюю мотивацию.',
  },
  {
    day: 9,
    emoji: '🎯',
    title: 'Назови свою мечту',
    task: 'Задай личную финансовую цель в разделе «💰 Экономия» (команда /goal) — на что пойдут сэкономленные деньги.',
    why: 'Конкретная цель («AirPods за 18 000₽») мотивирует в разы сильнее абстрактных рублей.',
  },
  {
    day: 10,
    emoji: '🏃',
    title: '10 минут для лёгких',
    task: 'Пройдись быстрым шагом 10–15 минут или сделай лёгкую разминку и обрати внимание на дыхание.',
    why: 'Физическая активность даёт естественный дофамин и серотонин, ускоряя восстановление мозга.',
  },
  {
    day: 11,
    emoji: '🧠',
    title: 'Правило «Одной затяжки»',
    task: 'Мысленно проговори ответ на ловушку «а может одну, проверить?»: «Ноль — легко, одна — это снова тысячи».',
    why: 'На 2-й неделе главный враг не ломка, а иллюзия «я уже вылечился, могу одну».',
  },
  {
    day: 12,
    emoji: '📊',
    title: 'Разбор своей карты триггеров',
    task: 'Открой «📊 Аналитика тяги» (/analytics) и посмотри, в какое время и от чего атаки бывают чаще всего.',
    why: 'Когда знаешь врага в лицо и по расписанию, он перестаёт заставать врасплох.',
  },
  {
    day: 13,
    emoji: '🧼',
    title: 'Свежий апгрейд',
    task: 'Постирай куртку/шарф или проветри машину/комнату, чтобы окончательно убрать старый запах дыма.',
    why: 'Свежий запах окружения даёт мощное телесное подтверждение новой жизни.',
  },
  {
    day: 14,
    emoji: '🗽',
    title: 'Выпускной: 2 недели свободы!',
    task: 'Вспомни себя 14 дней назад и мысленно поблагодари за то решение. Ты прошёл самый сложный отрезок!',
    why: 'К 14-му дню большинство автоматических петель привычки уже перестроены. Дальше — только легче.',
  },
];

export function getMissionForDay(day: number): DailyMission {
  const clamped = Math.max(1, Math.min(DAILY_MISSIONS.length, day));
  return DAILY_MISSIONS[clamped - 1];
}

export function getCompletedMissionDays(userId: number): number[] {
  const rows = db
    .prepare('SELECT day_number FROM user_missions WHERE user_id = ? ORDER BY day_number ASC')
    .all(userId) as { day_number: number }[];
  return rows.map((r) => r.day_number);
}

export function completeMission(userId: number, dayNumber: number): boolean {
  const r = db
    .prepare('INSERT OR IGNORE INTO user_missions (user_id, day_number) VALUES (?, ?)')
    .run(userId, dayNumber);
  return r.changes > 0;
}

export function getCompletedMissionCount(userId: number): number {
  const row = db
    .prepare('SELECT COUNT(*) as cnt FROM user_missions WHERE user_id = ?')
    .get(userId) as { cnt: number };
  return row.cnt;
}

/** Returns the mission for the user's current smoke-free day (1..14), or the first uncompleted mission. */
export function getCurrentMissionForUser(userId: number, smokeFreeDays: number): DailyMission {
  const targetDay = Math.min(DAILY_MISSIONS.length, Math.max(1, smokeFreeDays + 1));
  const completed = new Set(getCompletedMissionDays(userId));
  if (!completed.has(targetDay)) {
    return getMissionForDay(targetDay);
  }
  // If today's mission is done, find first uncompleted up to targetDay
  for (let d = 1; d <= targetDay; d++) {
    if (!completed.has(d)) return getMissionForDay(d);
  }
  return getMissionForDay(targetDay);
}
