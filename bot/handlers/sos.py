"""SOS handler — Allen Carr style craving management.

Three response types:
1. Rational — explain what's happening (Little Monster dying)
2. Switching — reframe the situation (freedom, not sacrifice)
3. Celebrating — positive reinforcement (your body is healing)
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
    TRIGGER_TIPS,
    get_random_sos,
    get_sos_celebrating,
    get_sos_rational,
    get_sos_switching,
)

router = Router()


class SOSStates(StatesGroup):
    picking_technique = State()
    rating_intensity = State()
    picking_trigger = State()


SOS_TEXT = (
    "🆘 <b>Маленькое Чудовище атакует!</b>\n\n"
    "Спокойно. Это просто никотиновый паразит требует еды. "
    "Он умирает — и ему это не нравится.\n\n"
    "Это <b>не настоящее желание</b>. Это крик зависимости. "
    "Он пройдёт через несколько минут.\n\n"
    "Выбери, что тебе сейчас поможет:"
)


@router.message(F.text == "🆘 Чудовище атакует!")
async def sos_button(message: Message, state: FSMContext) -> None:
    user = await get_user(message.from_user.id)
    if not user or not user.onboarding_complete:
        await message.answer("Сначала пройди настройку — /start")
        return
    await state.set_state(SOSStates.picking_technique)
    await message.answer(SOS_TEXT, reply_markup=sos_actions_kb(), parse_mode="HTML")


@router.callback_query(F.data.startswith("sos_"), SOSStates.picking_technique)
async def handle_technique(callback: CallbackQuery, state: FSMContext) -> None:
    key = callback.data

    technique_map = {
        "sos_rational": get_sos_rational,
        "sos_switching": get_sos_switching,
        "sos_celebrating": get_sos_celebrating,
        "sos_random": get_random_sos,
    }

    if key in technique_map:
        text = technique_map[key]()
        await callback.message.answer(text, parse_mode="HTML")
        await callback.answer()
        return

    if key == "sos_resisted":
        await state.update_data(resisted=True)
        await state.set_state(SOSStates.rating_intensity)
        await callback.message.edit_text(
            "🔓 <b>Чудовище побеждено! Ты свободен!</b>\n\n"
            "Оцени силу атаки от 1 (слабая) до 10 (яростная):",
            parse_mode="HTML",
        )
        await callback.message.edit_reply_markup(reply_markup=craving_intensity_kb())
        await callback.answer()
        return

    if key == "sos_relapsed":
        await state.update_data(resisted=False)
        await state.set_state(SOSStates.rating_intensity)
        await callback.message.edit_text(
            "💭 <b>Давай разберёмся, что произошло.</b>\n\n"
            "Ты ещё раз убедился, что сигарета не принесла "
            "никакого удовольствия — только чувство вины.\n\n"
            "Оцени силу атаки от 1 до 10:",
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
        "🔍 <b>Какой миф тебя обманул? Что спровоцировало атаку?</b>",
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
        tip = get_random_sos()

    response = ""

    if resisted:
        response += (
            f"🔓 <b>Чудовище повержено!</b>\n\n"
            f"Атака силой {intensity}/10 — и ты победил. "
            "Каждая такая победа делает Чудовище слабее.\n\n"
            f"📊 Всего атак: {stats['total']} | "
            f"Побеждено: {stats['resisted']} | "
            f"Ср. сила: {stats['avg_intensity']}\n"
        )
        new_ach = await check_craving_achievements(callback.from_user.id)
        if new_ach:
            response += "\n🌟 <b>Новое достижение!</b>\n"
            for code in new_ach:
                response += f"\n{format_achievement(code)}\n"
    else:
        response += (
            "💭 <b>Давай проанализируем.</b>\n\n"
            "Ты закурил — и что? Получил удовольствие? Нет. "
            "Только вернулось чувство вины и разочарования.\n\n"
            "Это доказывает: <b>сигарета не давала тебе ничего</b>. "
            "Давай разберём, какой миф тебя обманул, "
            "и вернёмся в ряды счастливых некурящих.\n\n"
            "🔄 Таймер обновлён. Ты снова свободен — прямо сейчас!\n"
        )

    response += f"\n💡 <b>Разбор триггера:</b>\n{tip}"

    await callback.message.edit_text(response, parse_mode="HTML")
    await callback.message.answer("Продолжаем! 🔓", reply_markup=main_menu_kb())
    await state.clear()
    await callback.answer()
