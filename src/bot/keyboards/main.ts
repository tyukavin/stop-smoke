import { InlineKeyboard, Keyboard } from 'grammy';

export function mainMenuKb() {
  return new Keyboard()
    .text('🔓 Моя свобода').text('📸 Моя карточка').row()
    .text('🆘 Чудовище атакует!').text('🏥 Здоровье').row()
    .text('🏆 Достижения').text('🎭 Мифы').row()
    .text('💰 Экономия').text('💡 Мотивация').row()
    .text('📚 Материалы').text('⚙️ Настройки')
    .resized();
}

export function deviceTypeKb() {
  return new InlineKeyboard()
    .text('🚬 Сигареты', 'device_cigarettes').row()
    .text('📱 IQOS / Glo', 'device_iqos').row()
    .text('💨 Вейп', 'device_vape').row()
    .text('🔋 Мини-вейп / Pod', 'device_mini_vape');
}

export function sosActionsKb() {
  return new InlineKeyboard()
    .text('🧠 Рациональный ответ', 'sos_rational').row()
    .text('🔑 Переключение фокуса', 'sos_switching').row()
    .text('🎉 Поздравь меня!', 'sos_celebrating').row()
    .text('🧘 Mindfulness-техника', 'sos_mindfulness').row()
    .text('🧠 CBT-техника', 'sos_cbt').row()
    .text('🎲 Случайная поддержка', 'sos_random').row()
    .text('✅ Чудовище побеждено!', 'sos_resisted')
    .text('😔 Закурил(а)', 'sos_relapsed');
}

export function intensityKb() {
  return new InlineKeyboard()
    .text('1', 'intensity_1').text('2', 'intensity_2').text('3', 'intensity_3').text('4', 'intensity_4').text('5', 'intensity_5').row()
    .text('6', 'intensity_6').text('7', 'intensity_7').text('8', 'intensity_8').text('9', 'intensity_9').text('10', 'intensity_10');
}

export function triggerKb() {
  return new InlineKeyboard()
    .text('😤 Стресс', 'trigger_stress').text('🥱 Скука', 'trigger_boredom').row()
    .text('👥 Компания', 'trigger_social').text('☕ Кофе/еда', 'trigger_coffee').row()
    .text('🍺 Алкоголь', 'trigger_alcohol').text('🌅 Утро', 'trigger_morning').row()
    .text('🚗 Вождение', 'trigger_driving').text('😰 Тревога', 'trigger_anxiety').row()
    .text('❓ Другое', 'trigger_other');
}

export function mythCategoriesKb() {
  return new InlineKeyboard()
    .text('😤 Стресс', 'myth_stress').text('🥱 Скука', 'myth_boredom').row()
    .text('🎯 Концентрация', 'myth_concentration').text('⚖️ Вес', 'myth_weight').row()
    .text('👥 Компания', 'myth_social').text('😌 Удовольствие', 'myth_pleasure').row()
    .text('☝️ Одна сигарета', 'myth_one_cig').text('🔄 Привычка', 'myth_habit').row()
    .text('🧬 Генетика', 'myth_genetics').text('📅 Время', 'myth_timing').row()
    .text('👴 Возраст', 'myth_age').text('🔬 Лёгкие сиг.', 'myth_light').row()
    .text('📱 IQOS', 'myth_iqos_safe').text('💨 Вейп', 'myth_vape_safe').row()
    .text('💪 Сила воли', 'myth_willpower').text('🎲 Случайный', 'myth_random');
}

export function moodKb() {
  return new InlineKeyboard()
    .text('😣 1', 'mood_1').text('😕 2', 'mood_2').text('🙂 3', 'mood_3').text('😄 4', 'mood_4').text('🤩 5', 'mood_5');
}

export function checkinKb() {
  return new InlineKeyboard()
    .text('🔓 Свободен/на!', 'checkin_yes')
    .text('😔 Закурил(а)', 'checkin_no');
}

export function settingsKb() {
  return new InlineKeyboard()
    .text('🚬 Количество/день', 'set_units').row()
    .text('💵 Цена пачки', 'set_price').row()
    .text('🌐 Часовой пояс', 'set_tz').row()
    .text('💭 Моя мотивация', 'set_motivation').row()
    .text('🔄 Начать заново', 'set_reset');
}

export function confirmKb() {
  return new InlineKeyboard()
    .text('🔓 Я свободен! Начинаем!', 'onboard_confirm')
    .text('✏️ Изменить', 'onboard_restart');
}

export function materialCategoriesKb() {
  return new InlineKeyboard()
    .text('📚 Всё', 'mat_all').row()
    .text('📖 Книги', 'mat_book').text('🎬 Видео', 'mat_video').row()
    .text('📰 Статьи', 'mat_article').text('📱 Приложения', 'mat_app').row()
    .text('👥 Сообщества', 'mat_community');
}
