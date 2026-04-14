"""Myth-busting handler — the core of Allen Carr's method.

/myth command and inline keyboard to select myth categories.
"""

from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.types import CallbackQuery, Message

from bot.keyboards.main_kb import main_menu_kb, myth_kb
from bot.services.user_service import get_user
from bot.utils.coping import MYTHS, get_myth_text, get_random_myth

router = Router()

MYTHS_INTRO = (
    "🎭 <b>Убийца мифов</b>\n\n"
    "Курение окружено ложью. Табачные компании потратили "
    "миллиарды, чтобы ты верил в эти мифы.\n\n"
    "Давай разрушим их один за другим. "
    "Выбери категорию:"
)


@router.message(F.text == "🎭 Мифы")
async def myths_menu(message: Message) -> None:
    user = await get_user(message.from_user.id)
    if not user or not user.onboarding_complete:
        await message.answer("Сначала пройди настройку — /start")
        return
    await message.answer(MYTHS_INTRO, reply_markup=myth_kb(), parse_mode="HTML")


@router.message(Command("myth"))
async def myths_command(message: Message) -> None:
    user = await get_user(message.from_user.id)
    if not user or not user.onboarding_complete:
        await message.answer("Сначала пройди настройку — /start")
        return
    await message.answer(MYTHS_INTRO, reply_markup=myth_kb(), parse_mode="HTML")


@router.callback_query(F.data.startswith("myth_"))
async def handle_myth(callback: CallbackQuery) -> None:
    category = callback.data.replace("myth_", "")

    if category == "random":
        text = get_random_myth()
    else:
        text = get_myth_text(category)

    await callback.message.answer(text, parse_mode="HTML")
    await callback.message.answer(
        "Хочешь развеять ещё один миф?",
        reply_markup=myth_kb(),
        parse_mode="HTML",
    )
    await callback.answer()
