"""Progress tracking handler — shows days, money, cigarettes avoided, life regained."""

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


@router.message(F.text == "📊 Мой прогресс")
async def show_progress(message: Message) -> None:
    user = await get_user(message.from_user.id)
    if not user or not user.onboarding_complete:
        await message.answer("Сначала пройдите настройку — /start")
        return

    new_achievements = await check_and_unlock(user)

    text = (
        f"📊 <b>Ваш прогресс</b>\n\n"
        f"📅 Без сигарет: <b>{_format_duration(user.smoke_free_days)}</b>\n"
        f"🚬 Не выкурено: <b>{user.cigarettes_avoided} сигарет</b>\n"
        f"💰 Сэкономлено: <b>{user.money_saved:.0f}₽</b>\n"
        f"❤️ Возвращено жизни: <b>{_format_minutes(user.life_regained_minutes)}</b>\n"
    )

    if user.motivation:
        text += f"\n💭 Ваша причина: <i>{user.motivation}</i>\n"

    if new_achievements:
        text += "\n🌟 <b>Новые достижения!</b>\n"
        for code in new_achievements:
            text += f"\n{format_achievement(code)}\n"

    await message.answer(text, reply_markup=main_menu_kb(), parse_mode="HTML")


@router.message(F.text == "💰 Экономия")
async def show_economy(message: Message) -> None:
    user = await get_user(message.from_user.id)
    if not user or not user.onboarding_complete:
        await message.answer("Сначала пройдите настройку — /start")
        return

    price_per_cig = user.price_per_pack / user.cigarettes_in_pack
    daily_cost = price_per_cig * user.cigarettes_per_day
    monthly_cost = daily_cost * 30
    yearly_cost = daily_cost * 365

    text = (
        f"💰 <b>Финансовая свобода</b>\n\n"
        f"Вы тратили на сигареты:\n"
        f"  • В день: <b>{daily_cost:.0f}₽</b>\n"
        f"  • В месяц: <b>{monthly_cost:.0f}₽</b>\n"
        f"  • В год: <b>{yearly_cost:.0f}₽</b>\n\n"
        f"✅ <b>Уже сэкономлено: {user.money_saved:.0f}₽</b>\n\n"
        f"💡 На эти деньги можно:\n"
    )

    saved = user.money_saved
    if saved >= 50000:
        text += "  • Слетать в отпуск! ✈️\n"
    if saved >= 10000:
        text += "  • Купить крутые кроссовки 👟\n"
    if saved >= 5000:
        text += "  • Сходить в хороший ресторан 🍽️\n"
    if saved >= 1000:
        text += "  • Купить книгу или подписку 📚\n"
    if saved >= 250:
        text += "  • Выпить отличный кофе ☕\n"
    if saved < 250:
        text += "  • Совсем скоро хватит на хороший кофе! ☕\n"

    await message.answer(text, reply_markup=main_menu_kb(), parse_mode="HTML")
