from __future__ import annotations

from bot.models.database import get_db
from bot.models.user import UserProfile

ACHIEVEMENTS: dict[str, dict] = {
    "first_hour": {
        "title": "Первый час свободы",
        "description": "1 час без яда! Маленькое Чудовище уже нервничает.",
        "emoji": "⏰",
        "condition_days": 0.0417,
    },
    "half_day": {
        "title": "Полдня на свободе",
        "description": "12 часов! Никотин покидает организм. Чудовище голодает!",
        "emoji": "☀️",
        "condition_days": 0.5,
    },
    "day_1": {
        "title": "Первый день",
        "description": "24 часа! Ты уже чувствуешь себя лучше, чем вчера.",
        "emoji": "🌟",
        "condition_days": 1,
    },
    "day_3": {
        "title": "Чудовище мертво",
        "description": "72 часа — никотин полностью вышел! Маленькое Чудовище сдохло.",
        "emoji": "💀",
        "condition_days": 3,
    },
    "week_1": {
        "title": "Неделя свободы",
        "description": "7 дней! Вкус и запахи стали ярче. Это и есть нормальная жизнь.",
        "emoji": "🏆",
        "condition_days": 7,
    },
    "week_2": {
        "title": "Две недели",
        "description": "Привычные ситуации уже не вызывают мыслей о сигаретах.",
        "emoji": "🔓",
        "condition_days": 14,
    },
    "month_1": {
        "title": "Месяц свободы",
        "description": "Лёгкие восстанавливаются. Ты дышишь полной грудью!",
        "emoji": "🍃",
        "condition_days": 30,
    },
    "month_3": {
        "title": "Три месяца",
        "description": "Ёмкость лёгких выросла на 30%. Ты — свободный человек.",
        "emoji": "🌊",
        "condition_days": 90,
    },
    "month_6": {
        "title": "Полгода свободы",
        "description": "Одышка в прошлом. Энергии больше, чем когда-либо!",
        "emoji": "⚡",
        "condition_days": 180,
    },
    "year_1": {
        "title": "Год свободы!",
        "description": "365 дней! Риск сердечных заболеваний упал вдвое. Ты легенда.",
        "emoji": "🎉",
        "condition_days": 365,
    },
    "cravings_5": {
        "title": "Охотник на Чудовище",
        "description": "5 атак отбито! Чудовище всё слабее.",
        "emoji": "🛡️",
    },
    "cravings_25": {
        "title": "Мастер свободы",
        "description": "25 атак! Ты видишь все уловки Чудовища насквозь.",
        "emoji": "⚔️",
    },
    "cravings_100": {
        "title": "Непобедимый",
        "description": "100 атак отбито! Чудовищу больше нечем тебя удивить.",
        "emoji": "🔥",
    },
    "money_1000": {
        "title": "Первая тысяча",
        "description": "1 000₽ не ушли табачным компаниям!",
        "emoji": "💰",
    },
    "money_5000": {
        "title": "Пять тысяч",
        "description": "5 000₽ остались в твоём кармане. Побалуй себя!",
        "emoji": "💎",
    },
    "money_10000": {
        "title": "Десять тысяч",
        "description": "10 000₽! Табачная индустрия плачет по тебе.",
        "emoji": "🏦",
    },
    "checkin_7": {
        "title": "Неделя осознанности",
        "description": "7 чекинов! Свобода становится привычкой.",
        "emoji": "📝",
    },
    "checkin_30": {
        "title": "Свободный месяц",
        "description": "30 чекинов! Ты — полноценный свободный человек.",
        "emoji": "📅",
    },
}


async def get_user_achievements(user_id: int) -> list[str]:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT code FROM achievements WHERE user_id = ?", (user_id,)
        )
        rows = await cursor.fetchall()
        return [r["code"] for r in rows]
    finally:
        await db.close()


async def unlock_achievement(user_id: int, code: str) -> bool:
    if code not in ACHIEVEMENTS:
        return False
    db = await get_db()
    try:
        await db.execute(
            "INSERT OR IGNORE INTO achievements (user_id, code) VALUES (?, ?)",
            (user_id, code),
        )
        await db.commit()
        return True
    finally:
        await db.close()


async def check_and_unlock(user: UserProfile) -> list[str]:
    """Check all time-based and money-based achievements, return newly unlocked codes."""
    existing = set(await get_user_achievements(user.user_id))
    newly_unlocked: list[str] = []

    for code, info in ACHIEVEMENTS.items():
        if code in existing:
            continue
        if "condition_days" in info:
            if user.smoke_free_days >= info["condition_days"]:
                await unlock_achievement(user.user_id, code)
                newly_unlocked.append(code)
        elif code.startswith("money_"):
            threshold = int(code.split("_")[1])
            if user.money_saved >= threshold:
                await unlock_achievement(user.user_id, code)
                newly_unlocked.append(code)

    return newly_unlocked


async def check_craving_achievements(user_id: int) -> list[str]:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT COUNT(*) as cnt FROM cravings WHERE user_id = ? AND resisted = 1",
            (user_id,),
        )
        row = await cursor.fetchone()
        count = row["cnt"]
    finally:
        await db.close()

    existing = set(await get_user_achievements(user_id))
    newly_unlocked: list[str] = []

    for code, threshold in [("cravings_5", 5), ("cravings_25", 25), ("cravings_100", 100)]:
        if code not in existing and count >= threshold:
            await unlock_achievement(user_id, code)
            newly_unlocked.append(code)

    return newly_unlocked


async def check_checkin_achievements(user_id: int) -> list[str]:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT COUNT(*) as cnt FROM daily_checkins WHERE user_id = ?",
            (user_id,),
        )
        row = await cursor.fetchone()
        count = row["cnt"]
    finally:
        await db.close()

    existing = set(await get_user_achievements(user_id))
    newly_unlocked: list[str] = []

    for code, threshold in [("checkin_7", 7), ("checkin_30", 30)]:
        if code not in existing and count >= threshold:
            await unlock_achievement(user_id, code)
            newly_unlocked.append(code)

    return newly_unlocked


def format_achievement(code: str) -> str:
    info = ACHIEVEMENTS[code]
    return f"{info['emoji']} <b>{info['title']}</b>\n{info['description']}"
