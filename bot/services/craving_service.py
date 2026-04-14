from __future__ import annotations

from bot.models.database import get_db


async def log_craving(
    user_id: int,
    intensity: int = 5,
    trigger: str = "",
    coping_used: str = "",
    resisted: bool = True,
) -> int:
    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO cravings (user_id, intensity, trigger, coping_used, resisted)
               VALUES (?, ?, ?, ?, ?)""",
            (user_id, intensity, trigger, coping_used, int(resisted)),
        )
        await db.commit()
        return cursor.lastrowid  # type: ignore[return-value]
    finally:
        await db.close()


async def get_craving_stats(user_id: int) -> dict:
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT
                 COUNT(*) as total,
                 SUM(resisted) as resisted,
                 AVG(intensity) as avg_intensity
               FROM cravings WHERE user_id = ?""",
            (user_id,),
        )
        row = await cursor.fetchone()
        return {
            "total": row["total"] or 0,
            "resisted": row["resisted"] or 0,
            "avg_intensity": round(row["avg_intensity"] or 0, 1),
        }
    finally:
        await db.close()


async def log_checkin(user_id: int, smoke_free: bool = True) -> None:
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO daily_checkins (user_id, smoke_free) VALUES (?, ?)",
            (user_id, int(smoke_free)),
        )
        await db.commit()
    finally:
        await db.close()


async def log_mood(user_id: int, mood: int, note: str = "") -> None:
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO mood_log (user_id, mood, note) VALUES (?, ?, ?)",
            (user_id, mood, note),
        )
        await db.commit()
    finally:
        await db.close()
