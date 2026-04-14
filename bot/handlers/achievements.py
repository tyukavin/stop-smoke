"""Achievements handler — gamification system."""

from __future__ import annotations

from aiogram import F, Router
from aiogram.types import Message

from bot.keyboards.main_kb import main_menu_kb
from bot.services.achievement_service import (
    ACHIEVEMENTS,
    check_and_unlock,
    get_user_achievements,
)
from bot.services.user_service import get_user

router = Router()


@router.message(F.text == "🏆 Достижения")
async def show_achievements(message: Message) -> None:
    user = await get_user(message.from_user.id)
    if not user or not user.onboarding_complete:
        await message.answer("Сначала пройдите настройку — /start")
        return

    await check_and_unlock(user)
    unlocked = set(await get_user_achievements(user.user_id))

    text = "🏆 <b>Ваши достижения</b>\n\n"
    unlocked_count = 0
    total_count = len(ACHIEVEMENTS)

    for code, info in ACHIEVEMENTS.items():
        if code in unlocked:
            text += f"✅ {info['emoji']} <b>{info['title']}</b> — {info['description']}\n"
            unlocked_count += 1
        else:
            text += f"🔒 {info['emoji']} {info['title']} — ???\n"

    text += f"\n📊 Открыто: <b>{unlocked_count}/{total_count}</b>"

    await message.answer(text, reply_markup=main_menu_kb(), parse_mode="HTML")
