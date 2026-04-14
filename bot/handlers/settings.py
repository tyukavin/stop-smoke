"""Settings handler — lets users adjust their profile."""

from __future__ import annotations

from datetime import datetime

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message

from bot.keyboards.main_kb import main_menu_kb, settings_kb
from bot.services.user_service import get_user, update_field

router = Router()


class SettingsStates(StatesGroup):
    editing_cpd = State()
    editing_price = State()
    editing_tz = State()
    editing_motivation = State()


@router.message(F.text == "\u2699\ufe0f Настройки")
async def show_settings(message: Message) -> None:
    user = await get_user(message.from_user.id)
    if not user or not user.onboarding_complete:
        await message.answer("Сначала пройдите настройку — /start")
        return

    text = (
        "\u2699\ufe0f <b>Настройки</b>\n\n"
        f"\ud83d\udeac Сигарет/день: <b>{user.cigarettes_per_day}</b>\n"
        f"\ud83d\udcb5 Цена пачки: <b>{user.price_per_pack}\u20bd</b>\n"
        f"\ud83c\udf10 Часовой пояс: <b>UTC{user.timezone_offset:+d}</b>\n"
        f"\ud83d\udcdd Мотивация: <i>{user.motivation or '—'}</i>\n"
    )
    await message.answer(text, reply_markup=settings_kb(), parse_mode="HTML")


@router.callback_query(F.data == "set_cpd")
async def start_edit_cpd(callback: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(SettingsStates.editing_cpd)
    await callback.message.answer(
        "\ud83d\udeac Введите новое количество сигарет в день:",
        parse_mode="HTML",
    )
    await callback.answer()


@router.message(SettingsStates.editing_cpd)
async def save_cpd(message: Message, state: FSMContext) -> None:
    try:
        cpd = int(message.text.strip())
        if cpd < 1 or cpd > 200:
            raise ValueError
    except (ValueError, AttributeError):
        await message.answer("\u274c Введите число от 1 до 200:")
        return
    await update_field(message.from_user.id, "cigarettes_per_day", cpd)
    await state.clear()
    await message.answer(
        f"\u2705 Установлено: <b>{cpd}</b> сигарет/день",
        reply_markup=main_menu_kb(),
        parse_mode="HTML",
    )


@router.callback_query(F.data == "set_price")
async def start_edit_price(callback: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(SettingsStates.editing_price)
    await callback.message.answer("\ud83d\udcb5 Введите новую цену пачки (руб.):")
    await callback.answer()


@router.message(SettingsStates.editing_price)
async def save_price(message: Message, state: FSMContext) -> None:
    try:
        price = float(message.text.strip().replace(",", "."))
        if price <= 0 or price > 10000:
            raise ValueError
    except (ValueError, AttributeError):
        await message.answer("\u274c Введите цену от 1 до 10000:")
        return
    await update_field(message.from_user.id, "price_per_pack", price)
    await state.clear()
    await message.answer(
        f"\u2705 Установлено: <b>{price}\u20bd</b> за пачку",
        reply_markup=main_menu_kb(),
        parse_mode="HTML",
    )


@router.callback_query(F.data == "set_tz")
async def start_edit_tz(callback: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(SettingsStates.editing_tz)
    await callback.message.answer(
        "\ud83c\udf10 Введите ваш часовой пояс (число от -12 до +14):\n"
        "Например: <b>3</b> для Москвы, <b>5</b> для Екатеринбурга",
        parse_mode="HTML",
    )
    await callback.answer()


@router.message(SettingsStates.editing_tz)
async def save_tz(message: Message, state: FSMContext) -> None:
    try:
        tz = int(message.text.strip().replace("+", ""))
        if tz < -12 or tz > 14:
            raise ValueError
    except (ValueError, AttributeError):
        await message.answer("\u274c Введите число от -12 до 14:")
        return
    await update_field(message.from_user.id, "timezone_offset", tz)
    await state.clear()
    await message.answer(
        f"\u2705 Часовой пояс: <b>UTC{tz:+d}</b>",
        reply_markup=main_menu_kb(),
        parse_mode="HTML",
    )


@router.callback_query(F.data == "set_motivation")
async def start_edit_motivation(callback: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(SettingsStates.editing_motivation)
    await callback.message.answer("\ud83d\udcdd Напишите вашу новую мотивацию:")
    await callback.answer()


@router.message(SettingsStates.editing_motivation)
async def save_motivation(message: Message, state: FSMContext) -> None:
    text = (message.text or "").strip()[:500]
    if not text:
        await message.answer("\u274c Напишите хотя бы пару слов:")
        return
    await update_field(message.from_user.id, "motivation", text)
    await state.clear()
    await message.answer(
        f"\u2705 Мотивация обновлена: <i>{text}</i>",
        reply_markup=main_menu_kb(),
        parse_mode="HTML",
    )


@router.callback_query(F.data == "set_reset")
async def reset_date(callback: CallbackQuery) -> None:
    from bot.services.user_service import reset_quit_date

    await reset_quit_date(callback.from_user.id)
    await callback.message.answer(
        "\ud83d\udd04 <b>Таймер обнулён.</b>\n\n"
        "Новый отсчёт начался прямо сейчас. Вы справитесь! \ud83d\udcaa",
        reply_markup=main_menu_kb(),
        parse_mode="HTML",
    )
    await callback.answer()
