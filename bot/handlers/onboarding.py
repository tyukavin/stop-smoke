"""Onboarding flow — Allen Carr «Easy Way» style.

The tone is about liberation, not sacrifice. We don't «quit» — we «escape».
"""

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
    "🔓 <b>Добро пожаловать в «Лёгкий способ»!</b>\n\n"
    "Ты здесь не для того, чтобы «бросить» курить. "
    "Ты здесь, чтобы <b>освободиться</b> от ловушки, "
    "в которую попал.\n\n"
    "Хорошая новость: тебе не нужна сила воли. "
    "Нужно только <b>понять</b>, как работает зависимость — "
    "и она рассыпется.\n\n"
    "Я — твой коуч по методике Аллена Карра. "
    "Вот что я умею:\n\n"
    "🔓 <b>Твоя свобода</b> — сколько дней, денег, жизни ты вернул\n"
    "🆘 <b>SOS-помощь</b> — когда Чудовище атакует\n"
    "🎭 <b>Убийца мифов</b> — разрушаем иллюзии о курении\n"
    "🏆 <b>Достижения</b> — празднуем каждый шаг\n"
    "🏥 <b>Здоровье</b> — как тело восстанавливается\n\n"
    "Для начала расскажи немного о себе.\n\n"
    "🚬 <b>Сколько сигарет в день ты куришь (курил)?</b>\n"
    "Напиши число:"
)

RETURNING_TEXT = (
    "🔓 <b>С возвращением, свободный человек!</b>\n\n"
    "Используй меню ниже. Помни: ты не «держишься» — "
    "ты просто живёшь нормальную жизнь."
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
        await message.answer("Введи число от 1 до 200:")
        return

    await update_field(message.from_user.id, "cigarettes_per_day", cpd)
    await state.update_data(cpd=cpd)
    await state.set_state(OnboardingStates.price_per_pack)
    await message.answer(
        "💵 <b>Сколько стоит одна пачка (в рублях)?</b>\n\n"
        "Скоро ты увидишь, сколько денег табачные компании "
        "забирали у тебя каждый день.",
        parse_mode="HTML",
    )


@router.message(OnboardingStates.price_per_pack)
async def process_price(message: Message, state: FSMContext) -> None:
    try:
        price = float(message.text.strip().replace(",", "."))
        if price <= 0 or price > 10000:
            raise ValueError
    except (ValueError, AttributeError):
        await message.answer("Введи цену от 1 до 10000:")
        return

    await update_field(message.from_user.id, "price_per_pack", price)
    await state.update_data(price=price)
    await state.set_state(OnboardingStates.years_smoking)
    await message.answer(
        "📅 <b>Сколько лет ты в ловушке?</b>\n"
        "Напиши число лет курения:",
        parse_mode="HTML",
    )


@router.message(OnboardingStates.years_smoking)
async def process_years(message: Message, state: FSMContext) -> None:
    try:
        years = int(message.text.strip())
        if years < 0 or years > 80:
            raise ValueError
    except (ValueError, AttributeError):
        await message.answer("Введи число от 0 до 80:")
        return

    await update_field(message.from_user.id, "years_smoking", years)
    await state.update_data(years=years)
    await state.set_state(OnboardingStates.motivation)
    await message.answer(
        "💭 <b>Зачем ты хочешь стать свободным?</b>\n\n"
        "Напиши свою главную причину. Она будет твоим якорем.\n\n"
        "<i>Например: «Хочу дышать свободно», «Ради детей», "
        "«Не хочу быть рабом табака»</i>",
        parse_mode="HTML",
    )


@router.message(OnboardingStates.motivation)
async def process_motivation(message: Message, state: FSMContext) -> None:
    motivation = (message.text or "").strip()[:500]
    if not motivation:
        await message.answer("Напиши хотя бы пару слов:")
        return

    await update_field(message.from_user.id, "motivation", motivation)
    data = await state.get_data()
    await state.set_state(OnboardingStates.confirm)

    cpd = data.get("cpd", 20)
    price = data.get("price", 250)
    years = data.get("years", 5)
    total_cigs = cpd * 365 * years
    total_money = (price / 20) * total_cigs

    summary = (
        "📋 <b>Итак, вот картина:</b>\n\n"
        f"🚬 Ты курил: <b>{cpd}</b> сигарет в день\n"
        f"💵 По цене: <b>{price}₽</b> за пачку\n"
        f"📅 В течение: <b>{years} лет</b>\n"
        f"💭 Твоя причина: <i>{motivation}</i>\n\n"
        f"За это время ты отдал табачным компаниям примерно "
        f"<b>{total_money:,.0f}₽</b> и выкурил <b>{total_cigs:,}</b> сигарет.\n\n"
        "Ни одна из этих сигарет не принесла тебе реального удовольствия. "
        "Каждая лишь создавала потребность в следующей.\n\n"
        "<b>Готов стать свободным?</b>"
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
        "🎉 <b>Поздравляю! Ты только что выбрал свободу!</b>\n\n"
        "Ты не «бросаешь» курить — ты <b>освобождаешься</b>. "
        "И ничего не теряешь. Вообще ничего.\n\n"
        "Маленькое Чудовище внутри тебя скоро умрёт от голода. "
        "Всё, что нужно — не кормить его. Это не требует силы воли. "
        "Это требует только понимания.\n\n"
        "Используй меню:\n"
        "• 🔓 <b>Моя свобода</b> — твой прогресс\n"
        "• 🆘 <b>Чудовище атакует!</b> — мгновенная помощь\n"
        "• 🎭 <b>Мифы</b> — разрушаем иллюзии\n"
        "• 🏥 <b>Здоровье</b> — восстановление организма\n\n"
        "🔓 <b>Добро пожаловать в ряды счастливых некурящих!</b>"
    )
    await callback.message.edit_text(text, parse_mode="HTML")
    await callback.message.answer("Выбери действие:", reply_markup=main_menu_kb())
    await callback.answer()


@router.callback_query(F.data == "onboard_restart")
async def restart_onboarding(callback: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(OnboardingStates.cigarettes_per_day)
    await callback.message.edit_text(
        "🚬 <b>Сколько сигарет в день ты куришь?</b>\nНапиши число:",
        parse_mode="HTML",
    )
    await callback.answer()
