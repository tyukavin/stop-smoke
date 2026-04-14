"""SOS handler — the panic button for craving episodes.

Implements a multi-step craving management flow:
1. User presses SOS -> show techniques
2. User picks a technique -> show it
3. User picks intensity -> log craving
4. User reports trigger -> log and offer tips
5. User reports result (resisted / relapsed)
"""

from __future__ import annotations

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message

from bot.keyboards.main_kb import (
    craving_intensity_kb,
    main_menu_kb,
    sos_actions_kb,
    trigger_kb,
)
from bot.services.achievement_service import (
    check_craving_achievements,
    format_achievement,
)
from bot.services.craving_service import get_craving_stats, log_craving
from bot.services.user_service import get_user, reset_quit_date
from bot.utils.coping import (
    BREATHING_EXERCISE,
    COLD_WATER,
    DELAY_TECHNIQUE,
    GROUNDING_5_4_3_2_1,
    PHYSICAL_ACTIVITY,
    SURFING_THE_URGE,
    TRIGGER_TIPS,
    VISUALIZATION,
    get_random_technique,
)

router = Router()


class SOSStates(StatesGroup):
    picking_technique = State()
    rating_intensity = State()
    picking_trigger = State()


SOS_TEXT = (
    "🆘 <b>Приступ тяги? Не паникуйте!</b>\n\n"
    "Тяга длится всего <b>3-5 минут</b>. Вы сильнее!\n\n"
    "Выберите технику, которая поможет прямо сейчас, "
    "или нажмите случайную:"
)


@router.message(F.text == "🆘 Тяга!")
async def sos_button(message: Message, state: FSMContext) -> None:
    user = await get_user(message.from_user.id)
    if not user or not user.onboarding_complete:
        await message.answer("Сначала пройдите настройку — /start")
        return
    await state.set_state(SOSStates.picking_technique)
    await message.answer(SOS_TEXT, reply_markup=sos_actions_kb(), parse_mode="HTML")


TECHNIQUE_MAP = {
    "sos_breathing": BREATHING_EXERCISE,
    "sos_grounding": GROUNDING_5_4_3_2_1,
    "sos_delay": DELAY_TECHNIQUE,
    "sos_physical": PHYSICAL_ACTIVITY,
    "sos_water": COLD_WATER,
    "sos_visualization": VISUALIZATION,
    "sos_surfing": SURFING_THE_URGE,
}


@router.callback_query(F.data.startswith("sos_"), SOSStates.picking_technique)
async def handle_technique(callback: CallbackQuery, state: FSMContext) -> None:
    key = callback.data
    if key in TECHNIQUE_MAP:
        await callback.message.answer(TECHNIQUE_MAP[key], parse_mode="HTML")
        await callback.answer()
        return

    if key == "sos_resisted":
        await state.update_data(resisted=True)
        await state.set_state(SOSStates.rating_intensity)
        await callback.message.edit_text(
            "💪 <b>Отлично! Вы справились!</b>\n\n"
            "Оцените силу тяги от 1 (слабая) до 10 (невыносимая):",
            parse_mode="HTML",
        )
        await callback.message.edit_reply_markup(reply_markup=craving_intensity_kb())
        await callback.answer()
        return

    if key == "sos_relapsed":
        await state.update_data(resisted=False)
        await state.set_state(SOSStates.rating_intensity)
        await callback.message.edit_text(
            "🤗 <b>Ничего, это не конец!</b>\n\n"
            "Срыв — это часть пути, а не провал. "
            "Большинство людей бросают не с первой попытки.\n\n"
            "Оцените силу тяги от 1 до 10:",
            parse_mode="HTML",
        )
        await callback.message.edit_reply_markup(reply_markup=craving_intensity_kb())
        await callback.answer()
        return

    await callback.answer()


@router.callback_query(F.data.startswith("intensity_"), SOSStates.rating_intensity)
async def handle_intensity(callback: CallbackQuery, state: FSMContext) -> None:
    intensity = int(callback.data.split("_")[1])
    await state.update_data(intensity=intensity)
    await state.set_state(SOSStates.picking_trigger)
    await callback.message.edit_text(
        "🔍 <b>Что вызвало тягу?</b>",
        parse_mode="HTML",
    )
    await callback.message.edit_reply_markup(reply_markup=trigger_kb())
    await callback.answer()


@router.callback_query(F.data.startswith("trigger_"), SOSStates.picking_trigger)
async def handle_trigger(callback: CallbackQuery, state: FSMContext) -> None:
    trigger = callback.data.replace("trigger_", "")
    data = await state.get_data()
    intensity = data.get("intensity", 5)
    resisted = data.get("resisted", True)

    await log_craving(
        user_id=callback.from_user.id,
        intensity=intensity,
        trigger=trigger,
        resisted=resisted,
    )

    if not resisted:
        await reset_quit_date(callback.from_user.id)

    stats = await get_craving_stats(callback.from_user.id)

    if trigger in TRIGGER_TIPS:
        tip = TRIGGER_TIPS[trigger]
    else:
        tip = get_random_technique()

    response = f"📝 <b>Записано!</b>\n\n"

    if resisted:
        response += (
            f"Вы победили тягу силой {intensity}/10. Так держать!\n\n"
            f"📊 Всего приступов: {stats['total']} | "
            f"Побеждено: {stats['resisted']} | "
            f"Средняя сила: {stats['avg_intensity']}\n"
        )
        new_ach = await check_craving_achievements(callback.from_user.id)
        if new_ach:
            response += "\n🌟 <b>Новое достижение!</b>\n"
            for code in new_ach:
                response += f"\n{format_achievement(code)}\n"
    else:
        response += (
            "🤗 Срыв записан. Таймер начнётся заново.\n\n"
            "<b>Помните:</b> средний курильщик бросает 7-10 раз, "
            "прежде чем бросить навсегда. Каждая попытка делает вас сильнее!\n\n"
            "Ваш таймер обновлён. Начинаем заново! 💪\n"
        )

    response += f"\n💡 <b>Совет:</b>\n{tip}"

    await callback.message.edit_text(response, parse_mode="HTML")
    await callback.message.answer("Продолжаем!", reply_markup=main_menu_kb())
    await state.clear()
    await callback.answer()
