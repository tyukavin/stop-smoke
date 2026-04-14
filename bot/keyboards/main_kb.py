from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    ReplyKeyboardMarkup,
    KeyboardButton,
)


def main_menu_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🔓 Моя свобода"), KeyboardButton(text="🏥 Здоровье")],
            [KeyboardButton(text="🆘 Чудовище атакует!"), KeyboardButton(text="🏆 Достижения")],
            [KeyboardButton(text="💰 Экономия"), KeyboardButton(text="🎭 Мифы")],
            [KeyboardButton(text="💡 Мотивация"), KeyboardButton(text="⚙️ Настройки")],
        ],
        resize_keyboard=True,
    )


def sos_actions_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🧠 Рациональный ответ", callback_data="sos_rational")],
            [InlineKeyboardButton(text="🔑 Переключение фокуса", callback_data="sos_switching")],
            [InlineKeyboardButton(text="🎉 Поздравь меня!", callback_data="sos_celebrating")],
            [InlineKeyboardButton(text="🎲 Случайная поддержка", callback_data="sos_random")],
            [
                InlineKeyboardButton(text="✅ Чудовище побеждено!", callback_data="sos_resisted"),
                InlineKeyboardButton(text="😔 Закурил(а)", callback_data="sos_relapsed"),
            ],
        ]
    )


def craving_intensity_kb() -> InlineKeyboardMarkup:
    buttons = []
    row = []
    for i in range(1, 11):
        row.append(InlineKeyboardButton(text=str(i), callback_data=f"intensity_{i}"))
        if i % 5 == 0:
            buttons.append(row)
            row = []
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def trigger_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="😤 Стресс", callback_data="trigger_stress"),
                InlineKeyboardButton(text="🥱 Скука", callback_data="trigger_boredom"),
            ],
            [
                InlineKeyboardButton(text="👥 Компания", callback_data="trigger_social"),
                InlineKeyboardButton(text="☕ Кофе/еда", callback_data="trigger_coffee"),
            ],
            [
                InlineKeyboardButton(text="🍺 Алкоголь", callback_data="trigger_alcohol"),
                InlineKeyboardButton(text="🌅 Утро", callback_data="trigger_morning"),
            ],
            [InlineKeyboardButton(text="❓ Другое", callback_data="trigger_other")],
        ]
    )


def myth_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="😤 Стресс", callback_data="myth_stress"),
                InlineKeyboardButton(text="🥱 Скука", callback_data="myth_boredom"),
            ],
            [
                InlineKeyboardButton(text="🎯 Концентрация", callback_data="myth_concentration"),
                InlineKeyboardButton(text="⚖️ Вес", callback_data="myth_weight"),
            ],
            [
                InlineKeyboardButton(text="👥 Компания", callback_data="myth_social"),
                InlineKeyboardButton(text="😌 Удовольствие", callback_data="myth_pleasure"),
            ],
            [
                InlineKeyboardButton(text="☝️ Одна сигарета", callback_data="myth_one_cig"),
                InlineKeyboardButton(text="🔄 Привычка", callback_data="myth_habit"),
            ],
            [InlineKeyboardButton(text="🎲 Случайный миф", callback_data="myth_random")],
        ]
    )


def mood_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="😣 1", callback_data="mood_1"),
                InlineKeyboardButton(text="😕 2", callback_data="mood_2"),
                InlineKeyboardButton(text="🙂 3", callback_data="mood_3"),
                InlineKeyboardButton(text="😄 4", callback_data="mood_4"),
                InlineKeyboardButton(text="🤩 5", callback_data="mood_5"),
            ]
        ]
    )


def settings_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🚬 Сигарет/день", callback_data="set_cpd")],
            [InlineKeyboardButton(text="💵 Цена пачки", callback_data="set_price")],
            [InlineKeyboardButton(text="🌐 Часовой пояс", callback_data="set_tz")],
            [InlineKeyboardButton(text="📝 Моя мотивация", callback_data="set_motivation")],
            [InlineKeyboardButton(text="🔄 Начать заново", callback_data="set_reset")],
        ]
    )


def onboarding_confirm_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🔓 Я свободен! Начинаем!", callback_data="onboard_confirm"),
                InlineKeyboardButton(text="✏️ Изменить", callback_data="onboard_restart"),
            ]
        ]
    )


def checkin_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🔓 Свободен/на!", callback_data="checkin_yes"),
                InlineKeyboardButton(text="😔 Закурил(а)", callback_data="checkin_no"),
            ]
        ]
    )
