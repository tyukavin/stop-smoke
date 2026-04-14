"""Health timeline handler — shows body recovery progress."""

from __future__ import annotations

from aiogram import F, Router
from aiogram.types import Message

from bot.keyboards.main_kb import main_menu_kb
from bot.services.health_timeline import build_health_report
from bot.services.user_service import get_user

router = Router()


@router.message(F.text == "\ud83c\udfe5 Здоровье")
async def show_health(message: Message) -> None:
    user = await get_user(message.from_user.id)
    if not user or not user.onboarding_complete:
        await message.answer("Сначала пройдите настройку — /start")
        return

    delta = user.smoke_free_delta
    if delta is None:
        await message.answer("У вас ещё не установлена дата отказа.")
        return

    minutes = delta.total_seconds() / 60
    report = build_health_report(minutes)
    await message.answer(report, reply_markup=main_menu_kb(), parse_mode="HTML")
