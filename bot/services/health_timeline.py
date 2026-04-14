"""Health recovery timeline after quitting smoking.

Based on WHO, ACS, and other medical sources. Each milestone describes what
happens in the body after a certain time without cigarettes.
"""

from __future__ import annotations

HEALTH_MILESTONES: list[dict] = [
    {
        "minutes": 20,
        "title": "20 минут",
        "text": "Пульс и давление начинают приходить в норму.",
        "emoji": "❤️",
    },
    {
        "minutes": 480,
        "title": "8 часов",
        "text": "Уровень угарного газа в крови снижается вдвое. Кислород приходит в норму.",
        "emoji": "🩸",
    },
    {
        "minutes": 720,
        "title": "12 часов",
        "text": "Угарный газ полностью выведен из организма.",
        "emoji": "💨",
    },
    {
        "minutes": 1440,
        "title": "24 часа",
        "text": "Риск сердечного приступа начинает снижаться.",
        "emoji": "💓",
    },
    {
        "minutes": 2880,
        "title": "48 часов",
        "text": "Нервные окончания восстанавливаются. Вкус и запах становятся ярче.",
        "emoji": "👃",
    },
    {
        "minutes": 4320,
        "title": "72 часа",
        "text": "Бронхи расслабляются. Дышать становится легче. Весь никотин вышел!",
        "emoji": "🌿",
    },
    {
        "minutes": 14400,
        "title": "10 дней",
        "text": "Кровообращение в дёснах нормализуется.",
        "emoji": "🦷",
    },
    {
        "minutes": 20160,
        "title": "2 недели",
        "text": "Кровообращение значительно улучшилось. Ходить стало легче.",
        "emoji": "🚶",
    },
    {
        "minutes": 43200,
        "title": "1 месяц",
        "text": "Кашель и одышка уменьшаются. Лёгкие начинают восстанавливаться.",
        "emoji": "🍃",
    },
    {
        "minutes": 129600,
        "title": "3 месяца",
        "text": "Объём лёгких увеличился на 30%. Физическая форма улучшается.",
        "emoji": "🏃",
    },
    {
        "minutes": 259200,
        "title": "6 месяцев",
        "text": "Хронический кашель почти прошёл. Стресс снижается.",
        "emoji": "🌻",
    },
    {
        "minutes": 525600,
        "title": "1 год",
        "text": "Риск ишемической болезни сердца снизился вдвое!",
        "emoji": "🎉",
    },
    {
        "minutes": 2628000,
        "title": "5 лет",
        "text": "Риск инсульта сравнялся с риском некурящего.",
        "emoji": "🧠",
    },
    {
        "minutes": 5256000,
        "title": "10 лет",
        "text": "Риск рака лёгких снизился вдвое. Риск рака гортани и почек тоже падает.",
        "emoji": "🌟",
    },
    {
        "minutes": 7884000,
        "title": "15 лет",
        "text": "Риск сердечных заболеваний как у человека, который никогда не курил!",
        "emoji": "💖",
    },
]


def get_current_milestone(smoke_free_minutes: float) -> dict | None:
    current = None
    for m in HEALTH_MILESTONES:
        if smoke_free_minutes >= m["minutes"]:
            current = m
    return current


def get_next_milestone(smoke_free_minutes: float) -> dict | None:
    for m in HEALTH_MILESTONES:
        if smoke_free_minutes < m["minutes"]:
            return m
    return None


def build_health_report(smoke_free_minutes: float) -> str:
    current = get_current_milestone(smoke_free_minutes)
    nxt = get_next_milestone(smoke_free_minutes)

    lines: list[str] = ["🏥 <b>Шкала восстановления здоровья</b>\n"]

    for m in HEALTH_MILESTONES:
        if smoke_free_minutes >= m["minutes"]:
            lines.append(f"  ✅ {m['emoji']} <b>{m['title']}</b> — {m['text']}")
        else:
            lines.append(f"  ⬜ {m['emoji']} {m['title']} — {m['text']}")
            break  # show only one upcoming milestone

    if nxt:
        remaining = nxt["minutes"] - smoke_free_minutes
        if remaining < 60:
            time_left = f"{int(remaining)} мин."
        elif remaining < 1440:
            time_left = f"{remaining / 60:.1f} ч."
        else:
            time_left = f"{remaining / 1440:.0f} дн."
        lines.append(f"\n⏳ До следующего улучшения: <b>{time_left}</b>")
    else:
        lines.append("\n🌟 <b>Вы прошли все этапы восстановления!</b>")

    return "\n".join(lines)
