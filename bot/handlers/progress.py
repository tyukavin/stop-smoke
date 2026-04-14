"""Progress tracking — «enjoying freedom» framing instead of «holding on»."""

from __future__ import annotations

from aiogram import F, Router
from aiogram.types import Message

from bot.keyboards.main_kb import main_menu_kb
from bot.services.achievement_service import check_and_unlock, format_achievement
from bot.services.user_service import get_user

router = Router()


def _format_duration(days: int) -> str:
    if days == 0:
        return "меньше дня"
    years, days_left = divmod(days, 365)
    months, d = divmod(days_left, 30)
    parts: list[str] = []
    if years:
        parts.append(f"{years} г.")
    if months:
        parts.append(f"{months} мес.")
    if d or not parts:
        parts.append(f"{d} дн.")
    return " ".join(parts)


def _format_minutes(minutes: int) -> str:
    if minutes < 60:
        return f"{minutes} мин."
    hours, m = divmod(minutes, 60)
    if hours < 24:
        return f"{hours} ч. {m} мин."
    days, h = divmod(hours, 24)
    return f"{days} дн. {h} ч."


def _poison_grams(cigarettes: int) -> str:
    """~12 mg tar per cigarette = 0.012g; rough estimate for display."""
    grams = cigarettes * 0.012
    if grams >= 1000:
        return f"{grams / 1000:.1f} кг"
    return f"{grams:.0f} г"


@router.message(F.text == "🔓 Моя свобода")
async def show_progress(message: Message) -> None:
    user = await get_user(message.from_user.id)
    if not user or not user.onboarding_complete:
        await message.answer("Сначала пройди настройку — /start")
        return

    new_achievements = await check_and_unlock(user)

    text = (
        f"🔓 <b>Ты наслаждаешься свободой уже {_format_duration(user.smoke_free_days)}!</b>\n\n"
        f"🚫 Не впустил в себя: <b>{_poison_grams(user.cigarettes_avoided)} смолы</b> "
        f"({user.cigarettes_avoided} сигарет)\n"
        f"💰 Не отдал табачным компаниям: <b>{user.money_saved:.0f}₽</b>\n"
        f"❤️ Вернул себе жизни: <b>{_format_minutes(user.life_regained_minutes)}</b>\n"
    )

    if user.motivation:
        text += f"\n💭 Твоя причина: <i>«{user.motivation}»</i>\n"

    text += (
        "\nПомни: ты ничего не потерял. Ты только приобрёл. "
        "С каждым днём Маленькое Чудовище слабеет. 💪"
    )

    if new_achievements:
        text += "\n\n🌟 <b>Новые достижения!</b>\n"
        for code in new_achievements:
            text += f"\n{format_achievement(code)}\n"

    await message.answer(text, reply_markup=main_menu_kb(), parse_mode="HTML")


@router.message(F.text == "💰 Экономия")
async def show_economy(message: Message) -> None:
    user = await get_user(message.from_user.id)
    if not user or not user.onboarding_complete:
        await message.answer("Сначала пройди настройку — /start")
        return

    price_per_cig = user.price_per_pack / user.cigarettes_in_pack
    daily_cost = price_per_cig * user.cigarettes_per_day
    monthly_cost = daily_cost * 30
    yearly_cost = daily_cost * 365

    text = (
        f"💰 <b>Деньги, которые забирали табачные компании</b>\n\n"
        f"Ты отдавал им:\n"
        f"  • В день: <b>{daily_cost:.0f}₽</b>\n"
        f"  • В месяц: <b>{monthly_cost:.0f}₽</b>\n"
        f"  • В год: <b>{yearly_cost:.0f}₽</b>\n\n"
        f"🔓 <b>Ты уже оставил себе: {user.money_saved:.0f}₽</b>\n\n"
        f"💡 Деньги, которые теперь <b>твои</b>:\n"
    )

    saved = user.money_saved
    if saved >= 50000:
        text += "  • Отпуск, который ты заслужил ✈️\n"
    if saved >= 10000:
        text += "  • Крутые кроссовки для здоровых лёгких 👟\n"
    if saved >= 5000:
        text += "  • Отличный ресторан 🍽️\n"
    if saved >= 1000:
        text += "  • Хорошая книга или подписка 📚\n"
    if saved >= 250:
        text += "  • Настоящий вкусный кофе ☕\n"
    if saved < 250:
        text += "  • Скоро хватит на хороший кофе! ☕\n"

    text += (
        "\nТабачные компании больше на тебе не зарабатывают. "
        "Приятное чувство, правда? 😏"
    )

    await message.answer(text, reply_markup=main_menu_kb(), parse_mode="HTML")
