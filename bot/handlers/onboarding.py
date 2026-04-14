"""Onboarding flow: collects user profile data step by step using FSM."""

from __future__ import annotations

from datetime import datetime, timezone

from aiogram import F, Router
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message

from bot.keyboards.main_kb import main_menu_kb, onboarding_confirm_kb
from bot.services.user_service import create_user, get_user, update_field

router = Router()


class OnboardingStates(StatesGroup):
    cigarettes_per_day = State()
    price_per_pack = State()
    years_smoking = State()
    motivation = State()
    confirm = State()


WELCOME_TEXT = (
    "\ud83d\ude4c <b>Добро пожаловать в QuitSmoke Bot!</b>\n\n"
    "Я помогу вам бросить курить, используя проверенные методики:\n\n"
    "\ud83d\udcca <b>Трекинг прогресса</b> — дни, деньги, здоровье\n"
    "\ud83c\udd98 <b>SOS-кнопка</b> — мгновенная помощь при тяге\n"
    "\ud83c\udfc6 <b>Достижения</b> — геймификация пути\n"
    "\ud83c\udfe5 <b>Шкала здоровья</b> — как тело восстанавливается\n"
    "\ud83d\ude4f <b>Мотивация</b> — ежедневная поддержка\n\n"
    "Давайте настроим ваш профиль!\n\n"
    "\ud83d\udeac <b>Сколько сигарет в день вы курите (курили)?</b>\n"
    "Напишите число:"
)

RETURNING_TEXT = (
    "\ud83d\udc4b <b>С возвращением!</b>\n\n"
    "Рад снова вас видеть. Используйте меню ниже."
)


@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext) -> None:
    user = await get_user(message.from_user.id)

    if user and user.onboarding_complete:
        await message.answer(RETURNING_TEXT, reply_markup=main_menu_kb(), parse_mode="HTML")
        return

    await create_user(message.from_user.id, message.from_user.username, message.from_user.first_name)
    await state.set_state(OnboardingStates.cigarettes_per_day)
    await message.answer(WELCOME_TEXT, parse_mode="HTML")


@router.message(OnboardingStates.cigarettes_per_day)
async def process_cpd(message: Message, state: FSMContext) -> None:
    try:
        cpd = int(message.text.strip())
        if cpd < 1 or cpd > 200:
            raise ValueError
    except (ValueError, AttributeError):
        await message.answer("\u274c Введите число от 1 до 200:")
        return

    await update_field(message.from_user.id, "cigarettes_per_day", cpd)
    await state.update_data(cpd=cpd)
    await state.set_state(OnboardingStates.price_per_pack)
    await message.answer(
        "\ud83d\udcb5 <b>Сколько стоит одна пачка сигарет (в рублях)?</b>\n"
        "Напишите число:",
        parse_mode="HTML",
    )


@router.message(OnboardingStates.price_per_pack)
async def process_price(message: Message, state: FSMContext) -> None:
    try:
        price = float(message.text.strip().replace(",", "."))
        if price <= 0 or price > 10000:
            raise ValueError
    except (ValueError, AttributeError):
        await message.answer("\u274c Введите цену от 1 до 10000:")
        return

    await update_field(message.from_user.id, "price_per_pack", price)
    await state.update_data(price=price)
    await state.set_state(OnboardingStates.years_smoking)
    await message.answer(
        "\ud83d\udcc5 <b>Сколько лет вы курите?</b>\nНапишите число:",
        parse_mode="HTML",
    )


@router.message(OnboardingStates.years_smoking)
async def process_years(message: Message, state: FSMContext) -> None:
    try:
        years = int(message.text.strip())
        if years < 0 or years > 80:
            raise ValueError
    except (ValueError, AttributeError):
        await message.answer("\u274c Введите число от 0 до 80:")
        return

    await update_field(message.from_user.id, "years_smoking", years)
    await state.update_data(years=years)
    await state.set_state(OnboardingStates.motivation)
    await message.answer(
        "\ud83d\udcad <b>Почему вы хотите бросить курить?</b>\n\n"
        "Напишите свою главную причину. Мы будем напоминать вам о ней "
        "в трудные моменты.\n\n"
        "<i>Например: «Ради здоровья детей», «Хочу пробежать марафон», "
        "«Устал от зависимости»</i>",
        parse_mode="HTML",
    )


@router.message(OnboardingStates.motivation)
async def process_motivation(message: Message, state: FSMContext) -> None:
    motivation = (message.text or "").strip()[:500]
    if not motivation:
        await message.answer("\u274c Пожалуйста, напишите хотя бы пару слов:")
        return

    await update_field(message.from_user.id, "motivation", motivation)
    data = await state.get_data()
    await state.set_state(OnboardingStates.confirm)

    summary = (
        "\ud83d\udccb <b>Ваш профиль:</b>\n\n"
        f"\ud83d\udeac Сигарет в день: <b>{data.get('cpd', '?')}</b>\n"
        f"\ud83d\udcb5 Цена пачки: <b>{data.get('price', '?')}\u20bd</b>\n"
        f"\ud83d\udcc5 Стаж курения: <b>{data.get('years', '?')} лет</b>\n"
        f"\ud83d\udcad Мотивация: <i>{motivation}</i>\n\n"
        "Всё верно?"
    )
    await message.answer(summary, reply_markup=onboarding_confirm_kb(), parse_mode="HTML")


@router.callback_query(F.data == "onboard_confirm")
async def confirm_onboarding(callback: CallbackQuery, state: FSMContext) -> None:
    user_id = callback.from_user.id
    now = datetime.now(timezone.utc).replace(tzinfo=None).isoformat()
    await update_field(user_id, "quit_date", now)
    await update_field(user_id, "onboarding_complete", 1)
    await state.clear()

    text = (
        "\ud83c\udf89 <b>Поздравляем! Ваш путь к свободе начинается ПРЯМО СЕЙЧАС!</b>\n\n"
        "\u23f0 Отсчёт пошёл. Каждая секунда без сигареты — ваша победа.\n\n"
        "Используйте кнопки меню:\n"
        "\u2022 \ud83d\udcca <b>Мой прогресс</b> — дни, деньги, сигареты\n"
        "\u2022 \ud83c\udd98 <b>Тяга!</b> — мгновенная помощь при приступе\n"
        "\u2022 \ud83c\udfe5 <b>Здоровье</b> — шкала восстановления\n"
        "\u2022 \ud83c\udfc6 <b>Достижения</b> — ваши награды\n\n"
        "\ud83d\udcaa Вы справитесь!"
    )
    await callback.message.edit_text(text, parse_mode="HTML")
    await callback.message.answer("Выберите действие:", reply_markup=main_menu_kb())
    await callback.answer()


@router.callback_query(F.data == "onboard_restart")
async def restart_onboarding(callback: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(OnboardingStates.cigarettes_per_day)
    await callback.message.edit_text(
        "\ud83d\udeac <b>Сколько сигарет в день вы курите?</b>\nНапишите число:",
        parse_mode="HTML",
    )
    await callback.answer()
