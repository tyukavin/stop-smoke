"""Motivation handler — daily quotes and personal motivation reminder."""

from __future__ import annotations

from aiogram import F, Router
from aiogram.types import Message

from bot.keyboards.main_kb import main_menu_kb
from bot.services.user_service import get_user
from bot.utils.coping import get_random_motivation

router = Router()


@router.message(F.text == "🙏 Мотивация")
async def show_motivation(message: Message) -> None:
    user = await get_user(message.from_user.id)
    if not user or not user.onboarding_complete:
        await message.answer("Сначала пройдите настройку — /start")
        return

    quote = get_random_motivation()

    text = f"🙏 <b>Мотивация дня</b>\n\n{quote}\n"

    if user.motivation:
        text += (
            f"\n💭 <b>Ваша личная причина:</b>\n"
            f"<i>«{user.motivation}»</i>\n"
        )

    text += (
        f"\n📅 Вы не курите уже <b>{user.smoke_free_days}</b> дн.\n"
        f"🚬 Не выкурено: <b>{user.cigarettes_avoided}</b> сигарет\n"
        f"💰 Сэкономлено: <b>{user.money_saved:.0f}₽</b>"
    )

    await message.answer(text, reply_markup=main_menu_kb(), parse_mode="HTML")
