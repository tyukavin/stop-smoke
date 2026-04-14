"""QuitSmoke Bot — Telegram bot to help quit smoking.

Entry point: initializes the bot, database, scheduler, and starts polling.
"""

import asyncio
import logging
import sys

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage

from bot.config import settings
from bot.handlers import achievements, checkin, health, motivation, onboarding, progress, settings as settings_handler, sos
from bot.models.database import init_db
from bot.scheduler import setup_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


async def main() -> None:
    if not settings.bot_token:
        logger.error("QUIT_BOT_BOT_TOKEN is not set. Please set it in .env or environment.")
        sys.exit(1)

    await init_db()
    logger.info("Database initialized")

    bot = Bot(
        token=settings.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher(storage=MemoryStorage())

    dp.include_router(onboarding.router)
    dp.include_router(progress.router)
    dp.include_router(sos.router)
    dp.include_router(health.router)
    dp.include_router(achievements.router)
    dp.include_router(motivation.router)
    dp.include_router(checkin.router)
    dp.include_router(settings_handler.router)

    setup_scheduler(bot)

    logger.info("Bot starting...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
