from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    ReplyKeyboardMarkup,
    KeyboardButton,
)


def main_menu_kb() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="\ud83d\udcca \u041c\u043e\u0439 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441"), KeyboardButton(text="\ud83c\udfe5 \u0417\u0434\u043e\u0440\u043e\u0432\u044c\u0435")],
            [KeyboardButton(text="\ud83c\udd98 \u0422\u044f\u0433\u0430!"), KeyboardButton(text="\ud83c\udfc6 \u0414\u043e\u0441\u0442\u0438\u0436\u0435\u043d\u0438\u044f")],
            [KeyboardButton(text="\ud83d\udcb0 \u042d\u043a\u043e\u043d\u043e\u043c\u0438\u044f"), KeyboardButton(text="\ud83d\ude4f \u041c\u043e\u0442\u0438\u0432\u0430\u0446\u0438\u044f")],
            [KeyboardButton(text="\u2699\ufe0f \u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438")],
        ],
        resize_keyboard=True,
    )


def sos_actions_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="\ud83c\udf2c\ufe0f \u0414\u044b\u0445\u0430\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u0442\u0435\u0445\u043d\u0438\u043a\u0430", callback_data="sos_breathing")],
            [InlineKeyboardButton(text="\ud83e\uddd8 \u0417\u0430\u0437\u0435\u043c\u043b\u0435\u043d\u0438\u0435 5-4-3-2-1", callback_data="sos_grounding")],
            [InlineKeyboardButton(text="\u23f1 \u041f\u0440\u0430\u0432\u0438\u043b\u043e 10 \u043c\u0438\u043d\u0443\u0442", callback_data="sos_delay")],
            [InlineKeyboardButton(text="\ud83c\udfc3 \u0424\u0438\u0437\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", callback_data="sos_physical")],
            [InlineKeyboardButton(text="\ud83e\uddca \u0425\u043e\u043b\u043e\u0434\u043d\u0430\u044f \u0432\u043e\u0434\u0430", callback_data="sos_water")],
            [InlineKeyboardButton(text="\ud83c\udf05 \u0412\u0438\u0437\u0443\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u044f", callback_data="sos_visualization")],
            [InlineKeyboardButton(text="\ud83c\udf0a \u0421\u0451\u0440\u0444\u0438\u043d\u0433 \u043f\u043e \u0432\u043e\u043b\u043d\u0435", callback_data="sos_surfing")],
            [
                InlineKeyboardButton(text="\u2705 \u0421\u043f\u0440\u0430\u0432\u0438\u043b\u0441\u044f!", callback_data="sos_resisted"),
                InlineKeyboardButton(text="\u274c \u0421\u043e\u0440\u0432\u0430\u043b\u0441\u044f", callback_data="sos_relapsed"),
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
                InlineKeyboardButton(text="\ud83d\ude2e\u200d\ud83d\udca8 \u0421\u0442\u0440\u0435\u0441\u0441", callback_data="trigger_stress"),
                InlineKeyboardButton(text="\ud83e\uddd0 \u0421\u043a\u0443\u043a\u0430", callback_data="trigger_boredom"),
            ],
            [
                InlineKeyboardButton(text="\ud83e\uddd1\u200d\ud83e\udd1d\u200d\ud83e\uddd1 \u041a\u043e\u043c\u043f\u0430\u043d\u0438\u044f", callback_data="trigger_social"),
                InlineKeyboardButton(text="\u2615 \u041a\u043e\u0444\u0435/\u0435\u0434\u0430", callback_data="trigger_coffee"),
            ],
            [
                InlineKeyboardButton(text="\ud83c\udf7a \u0410\u043b\u043a\u043e\u0433\u043e\u043b\u044c", callback_data="trigger_alcohol"),
                InlineKeyboardButton(text="\ud83c\udf05 \u0423\u0442\u0440\u043e", callback_data="trigger_morning"),
            ],
            [InlineKeyboardButton(text="\u2753 \u0414\u0440\u0443\u0433\u043e\u0435", callback_data="trigger_other")],
        ]
    )


def mood_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="\ud83d\ude1e 1", callback_data="mood_1"),
                InlineKeyboardButton(text="\ud83d\ude15 2", callback_data="mood_2"),
                InlineKeyboardButton(text="\ud83d\ude10 3", callback_data="mood_3"),
                InlineKeyboardButton(text="\ud83d\ude42 4", callback_data="mood_4"),
                InlineKeyboardButton(text="\ud83d\ude04 5", callback_data="mood_5"),
            ]
        ]
    )


def settings_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="\ud83d\udeac \u0421\u0438\u0433\u0430\u0440\u0435\u0442/\u0434\u0435\u043d\u044c", callback_data="set_cpd")],
            [InlineKeyboardButton(text="\ud83d\udcb5 \u0426\u0435\u043d\u0430 \u043f\u0430\u0447\u043a\u0438", callback_data="set_price")],
            [InlineKeyboardButton(text="\ud83c\udf10 \u0427\u0430\u0441\u043e\u0432\u043e\u0439 \u043f\u043e\u044f\u0441", callback_data="set_tz")],
            [InlineKeyboardButton(text="\ud83d\udcdd \u041c\u043e\u044f \u043c\u043e\u0442\u0438\u0432\u0430\u0446\u0438\u044f", callback_data="set_motivation")],
            [InlineKeyboardButton(text="\ud83d\udd04 \u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u0434\u0430\u0442\u0443", callback_data="set_reset")],
        ]
    )


def onboarding_confirm_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="\u2705 \u0413\u043e\u0442\u043e\u0432\u043e, \u043d\u0430\u0447\u0438\u043d\u0430\u0435\u043c!", callback_data="onboard_confirm"),
                InlineKeyboardButton(text="\u270f\ufe0f \u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c", callback_data="onboard_restart"),
            ]
        ]
    )


def checkin_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="\u2705 \u0414\u0430, \u043d\u0435 \u043a\u0443\u0440\u0438\u043b(a)!", callback_data="checkin_yes"),
                InlineKeyboardButton(text="\u274c \u0421\u043e\u0440\u0432\u0430\u043b\u0441\u044f/\u0430\u0441\u044c", callback_data="checkin_no"),
            ]
        ]
    )
