"""Daily check-in — Allen Carr style.

Morning messages are affirmations, not questions.
Relapse handling is non-judgmental with myth analysis.
"""

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
    """Called by the scheduler — affirmation, not question."""
    user = await get_user(user_id)
    if not user or not user.onboarding_complete:
        return

    days = user.smoke_free_days + 1

    if days <= 3:
        body = (
            "Маленькое Чудовище ещё дёргается, но с каждым часом оно слабеет. "
            "Ты не «терпишь» — ты просто живёшь без яда."
        )
    elif days <= 7:
        body = (
            "Никотин уже покинул твой организм! "
            "Чудовище мертво. Осталось только избавиться от привычных мыслей — "
            "и это легко, когда ты понимаешь, что ничего не потерял."
        )
    elif days <= 30:
        body = (
            "Ты уже привыкаешь к свободе. Заметь: всё больше ситуаций, "
            "когда ты даже не вспоминаешь о сигаретах. "
            "Так и должно быть — ты возвращаешься к норме."
        )
    else:
        body = (
            "Ты — свободный человек. Сигареты больше не управляют тобой. "
            "Наслаждайся этим днём — он полностью твой."
        )

    text = (
        f"🌅 <b>Доброе утро, свободный человек!</b>\n\n"
        f"День <b>{days}</b> твоей свободы. "
        f"Как здорово проснуться и не нуждаться в яде!\n\n"
        f"{body}"
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
        "🔓 <b>Конечно! Ты свободен!</b>\n\n"
        "Это не подвиг — это нормальная жизнь без яда. "
        "Именно так живут миллионы счастливых некурящих.\n\n"
        "Как настроение сегодня?"
    )

    if new_ach:
        text += "\n\n🌟 <b>Новые достижения!</b>\n"
        for code in new_ach:
            text += f"\n{format_achievement(code)}\n"

    await callback.message.edit_text(text, parse_mode="HTML")
    await callback.message.answer(
        "Оцени своё самочувствие:",
        reply_markup=mood_kb(),
    )
    await callback.answer()


@router.callback_query(F.data == "checkin_no")
async def checkin_no(callback: CallbackQuery) -> None:
    user_id = callback.from_user.id
    await log_checkin(user_id, smoke_free=False)
    await reset_quit_date(user_id)

    text = (
        "💭 <b>Давай поговорим об этом.</b>\n\n"
        "Ты закурил — и что получил? Удовольствие? Нет. "
        "Только чувство вины и разочарования.\n\n"
        "Это <b>доказывает</b>, что сигарета не даёт ничего ценного. "
        "Ты ещё раз убедился в этом на собственном опыте.\n\n"
        "Давай проанализируем, какой миф тебя обманул. "
        "Нажми 🎭 <b>Мифы</b> — и мы разберём эту ловушку.\n\n"
        "🔄 Таймер обновлён. Ты снова в рядах свободных людей — "
        "прямо сейчас! 🔓"
    )
    await callback.message.edit_text(text, parse_mode="HTML")
    await callback.message.answer("Добро пожаловать обратно! 🔓", reply_markup=main_menu_kb())
    await callback.answer()


@router.callback_query(F.data.startswith("mood_"))
async def handle_mood(callback: CallbackQuery) -> None:
    mood = int(callback.data.split("_")[1])
    await log_mood(callback.from_user.id, mood)

    moods_text = {
        1: (
            "Тяжеловато? Это нормально — тело перестраивается. "
            "Помни: это не жертва. Это выздоровление. "
            "Тебе становится лучше, даже если пока не чувствуется. 💪"
        ),
        2: (
            "Небольшой дискомфорт — это Чудовище корчится от голода. "
            "Радуйся! Оно умирает. 🙂"
        ),
        3: (
            "Стабильно — а это уже победа. "
            "Свобода становится нормой. Так и должно быть. 👍"
        ),
        4: (
            "Отлично! Чувствуешь разницу? "
            "Без яда жизнь ярче. И дальше будет только лучше! 🌟"
        ),
        5: (
            "Прекрасно! Это и есть свобода. "
            "Ты чувствуешь то, что некурящие чувствуют каждый день. "
            "Теперь и ты! 🎉"
        ),
    }

    text = f"📝 Настроение: {'⭐' * mood}\n\n{moods_text.get(mood, '')}"
    await callback.message.edit_text(text, parse_mode="HTML")
    await callback.message.answer("Отличного дня! 🔓", reply_markup=main_menu_kb())
    await callback.answer()
