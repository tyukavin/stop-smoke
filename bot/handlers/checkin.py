"""Daily check-in handler and scheduler integration."""

from __future__ import annotations

from aiogram import F, Router
from aiogram.types import CallbackQuery, Message

from bot.keyboards.main_kb import checkin_kb, main_menu_kb, mood_kb
from bot.services.achievement_service import (
    check_and_unlock,
    check_checkin_achievements,
    format_achievement,
)
from bot.services.craving_service import log_checkin, log_mood
from bot.services.user_service import get_user, reset_quit_date

router = Router()


async def send_daily_checkin(bot, user_id: int) -> None:
    """Called by the scheduler to send a daily check-in message."""
    user = await get_user(user_id)
    if not user or not user.onboarding_complete:
        return

    text = (
        f"\ud83c\udf1e <b>Доброе утро!</b>\n\n"
        f"\ud83d\udcc5 День <b>{user.smoke_free_days + 1}</b> без сигарет.\n\n"
        f"Вы не курили вчера?"
    )
    await bot.send_message(user_id, text, reply_markup=checkin_kb(), parse_mode="HTML")


@router.callback_query(F.data == "checkin_yes")
async def checkin_yes(callback: CallbackQuery) -> None:
    user_id = callback.from_user.id
    await log_checkin(user_id, smoke_free=True)

    user = await get_user(user_id)
    new_ach = []
    if user:
        new_ach += await check_and_unlock(user)
    new_ach += await check_checkin_achievements(user_id)

    text = (
        "\u2705 <b>Отлично! Ещё один день победы!</b>\n\n"
        "Как ваше настроение сегодня?"
    )

    if new_ach:
        text += "\n\n\ud83c\udf1f <b>Новые достижения!</b>\n"
        for code in new_ach:
            text += f"\n{format_achievement(code)}\n"

    await callback.message.edit_text(text, parse_mode="HTML")
    await callback.message.answer(
        "Оцените настроение от 1 \ud83d\ude1e до 5 \ud83d\ude04:",
        reply_markup=mood_kb(),
    )
    await callback.answer()


@router.callback_query(F.data == "checkin_no")
async def checkin_no(callback: CallbackQuery) -> None:
    user_id = callback.from_user.id
    await log_checkin(user_id, smoke_free=False)
    await reset_quit_date(user_id)

    text = (
        "\ud83e\udd17 <b>Ничего страшного!</b>\n\n"
        "Срыв — это не провал, а часть пути. "
        "Средний курильщик делает <b>7-10 попыток</b> прежде чем бросить навсегда.\n\n"
        "Ваш таймер начинается заново. Каждая попытка — это опыт и сила! \ud83d\udcaa"
    )
    await callback.message.edit_text(text, parse_mode="HTML")
    await callback.message.answer("Продолжаем!", reply_markup=main_menu_kb())
    await callback.answer()


@router.callback_query(F.data.startswith("mood_"))
async def handle_mood(callback: CallbackQuery) -> None:
    mood = int(callback.data.split("_")[1])
    await log_mood(callback.from_user.id, mood)

    moods_text = {
        1: "Тяжело бывает. Помните — это временно! \ud83d\udcaa",
        2: "День получше — уже прогресс! \ud83d\ude42",
        3: "Стабильность — тоже победа! \ud83d\udc4d",
        4: "Хорошее настроение — заслуженная награда! \ud83c\udf1f",
        5: "Замечательно! Вы на верном пути! \ud83c\udf89",
    }

    text = f"\ud83d\udcdd Настроение записано: {'⭐' * mood}\n\n{moods_text.get(mood, '')}"
    await callback.message.edit_text(text, parse_mode="HTML")
    await callback.message.answer("Отличного дня! \u2764\ufe0f", reply_markup=main_menu_kb())
    await callback.answer()
