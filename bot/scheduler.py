"""APScheduler integration for daily check-ins and evening affirmations."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from bot.handlers.checkin import send_daily_checkin
from bot.models.database import get_db
from bot.utils.coping import get_random_motivation

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def _get_all_active_users() -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT user_id, timezone_offset FROM users WHERE onboarding_complete = 1"
        )
        rows = await cursor.fetchall()
        return [{"user_id": r["user_id"], "tz_offset": r["timezone_offset"]} for r in rows]
    finally:
        await db.close()


async def daily_checkin_job(bot) -> None:
    """Run every hour; send morning affirmation at 9:00 local time."""
    users = await _get_all_active_users()
    utc_now = datetime.now(tz=timezone.utc)

    for u in users:
        user_local = utc_now + timedelta(hours=u["tz_offset"])
        if user_local.hour == 9:
            try:
                await send_daily_checkin(bot, u["user_id"])
            except Exception:
                logger.exception("Failed to send daily checkin to %s", u["user_id"])


async def evening_motivation_job(bot) -> None:
    """Run every hour; send evening motivation at 20:00 local time."""
    users = await _get_all_active_users()
    utc_now = datetime.now(tz=timezone.utc)

    for u in users:
        user_local = utc_now + timedelta(hours=u["tz_offset"])
        if user_local.hour == 20:
            try:
                quote = get_random_motivation()
                await bot.send_message(
                    u["user_id"],
                    f"🌙 <b>Вечернее напоминание</b>\n\n{quote}\n\n"
                    "Ещё один день свободы позади. Спи спокойно — "
                    "ты свободный человек. 🔓",
                    parse_mode="HTML",
                )
            except Exception:
                logger.exception("Failed to send motivation to %s", u["user_id"])


def setup_scheduler(bot) -> None:
    scheduler.add_job(daily_checkin_job, "cron", minute=0, args=[bot], id="daily_checkin")
    scheduler.add_job(evening_motivation_job, "cron", minute=0, args=[bot], id="evening_motivation")
    scheduler.start()
    logger.info("Scheduler started")
