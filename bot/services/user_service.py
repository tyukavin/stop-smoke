from __future__ import annotations

from datetime import datetime, timezone

from bot.models.database import get_db
from bot.models.user import UserProfile


async def get_user(user_id: int) -> UserProfile | None:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
        row = await cursor.fetchone()
        if row is None:
            return None
        return _row_to_profile(row)
    finally:
        await db.close()


async def create_user(user_id: int, username: str | None, first_name: str | None) -> None:
    db = await get_db()
    try:
        await db.execute(
            "INSERT OR IGNORE INTO users (user_id, username, first_name) VALUES (?, ?, ?)",
            (user_id, username, first_name),
        )
        await db.commit()
    finally:
        await db.close()


async def update_field(user_id: int, field: str, value) -> None:
    allowed = {
        "quit_date", "cigarettes_per_day", "price_per_pack",
        "cigarettes_in_pack", "years_smoking", "timezone_offset",
        "motivation", "onboarding_complete",
    }
    if field not in allowed:
        raise ValueError(f"Field {field} is not allowed")
    db = await get_db()
    try:
        await db.execute(f"UPDATE users SET {field} = ? WHERE user_id = ?", (value, user_id))
        await db.commit()
    finally:
        await db.close()


async def reset_quit_date(user_id: int) -> None:
    db = await get_db()
    try:
        now = datetime.now(timezone.utc).replace(tzinfo=None).isoformat()
        await db.execute("UPDATE users SET quit_date = ? WHERE user_id = ?", (now, user_id))
        await db.commit()
    finally:
        await db.close()


def _row_to_profile(row) -> UserProfile:
    quit_date = None
    if row["quit_date"]:
        quit_date = datetime.fromisoformat(row["quit_date"])
    created_at = datetime.fromisoformat(row["created_at"])
    return UserProfile(
        user_id=row["user_id"],
        username=row["username"],
        first_name=row["first_name"],
        quit_date=quit_date,
        cigarettes_per_day=row["cigarettes_per_day"],
        price_per_pack=row["price_per_pack"],
        cigarettes_in_pack=row["cigarettes_in_pack"],
        years_smoking=row["years_smoking"],
        timezone_offset=row["timezone_offset"],
        motivation=row["motivation"],
        created_at=created_at,
        onboarding_complete=bool(row["onboarding_complete"]),
    )
