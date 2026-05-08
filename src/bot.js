import { Telegraf, Markup } from 'telegraf';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { dbQueries } from './database.js';
import { format, addDays, parse, isAfter, isBefore } from 'date-fns';
import { uk } from 'date-fns/locale';

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Logging setup
const logsDir = './logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const logFile = path.join(logsDir, `bot-${format(new Date(), 'yyyy-MM-dd')}.log`);

function log(message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message} ${JSON.stringify(data)}\n`;
  fs.appendFileSync(logFile, logEntry);
  console.log(logEntry.trim());
}

log('🤖 Бот запускається...');

// Middleware для логування
bot.use((ctx, next) => {
  const user = ctx.from;
  log('📨 Нове повідомлення', {
    userId: user.id,
    username: user.username,
    firstName: user.first_name
  });
  return next();
});

// Start command
bot.start((ctx) => {
  const user = ctx.from;

  log('▶️ Команда /start', { userId: user.id, username: user.username });

  // Зберігаємо користувача в БД
  dbQueries.upsertUser.run(
    user.id,
    user.username || null,
    user.first_name || null,
    user.last_name || null,
    null
  );

  const welcomeMessage = `
Здарова чіпуха😎

Пора на нігтики💅

🎨 Наші послуги:
• Класичний та апаратний манікюр
• Нарощування нігтів
• Педикюр
• SPA-процедури
• Дизайн нігтів

👩‍🎨 3 професійних майстри
⏰ Працюємо з ${process.env.WORK_START} до ${process.env.WORK_END}
📍 ${process.env.SALON_ADDRESS}

Натисніть кнопку нижче, щоб записатися!
  `;

  ctx.reply(welcomeMessage, Markup.inlineKeyboard([
    [Markup.button.webApp('📅 Записатися онлайн', process.env.WEBAPP_URL)],
    [Markup.button.callback('📋 Мої записи', 'my_bookings')],
    [Markup.button.callback('ℹ️ Про салон', 'about')],
  ]));
});

// Мої записи
bot.action('my_bookings', async (ctx) => {
  ctx.answerCbQuery();

  const userId = ctx.from.id;
  const bookings = dbQueries.getUserBookings.all(userId);

  if (bookings.length === 0) {
    ctx.reply('У вас поки немає записів.\n\nНатисніть "📅 Записатися онлайн" щоб створити запис!');
    return;
  }

  let message = '📋 Ваші записи:\n\n';

  bookings.forEach((booking, index) => {
    const date = format(parse(booking.booking_date, 'yyyy-MM-dd', new Date()), 'd MMMM yyyy', { locale: uk });
    const status = booking.status === 'confirmed' ? '✅' : '⏳';

    message += `${status} ${index + 1}. ${date} о ${booking.booking_time}\n`;
    message += `   Майстер: ${booking.master_name}\n`;
    message += `   Послуга: ${booking.service_name}\n`;
    message += `   Вартість: ${booking.price} грн\n\n`;
  });

  ctx.reply(message, Markup.inlineKeyboard([
    [Markup.button.webApp('📅 Новий запис', process.env.WEBAPP_URL)],
    [Markup.button.callback('🔙 Назад', 'back_to_menu')]
  ]));
});

// Про салон
bot.action('about', (ctx) => {
  ctx.answerCbQuery();

  ctx.reply(`
ℹ️ Про ${process.env.SALON_NAME}

Ми - професійний салон краси з досвідом роботи понад 5 років.

👩‍🎨 Наші майстри:
• Олена Коваленко - класичний манікюр, педикюр
• Марія Шевченко - нарощування, дизайн
• Анна Бондаренко - апаратний манікюр, SPA

⏰ Графік роботи:
Пн-Нд: ${process.env.WORK_START} - ${process.env.WORK_END}

📍 Адреса: ${process.env.SALON_ADDRESS}
📞 Телефон: ${process.env.SALON_PHONE}

💳 Оплата: готівка, картка, безготівковий розрахунок
  `, Markup.inlineKeyboard([
    [Markup.button.callback('🔙 Назад', 'back_to_menu')]
  ]));
});

// Назад до меню
bot.action('back_to_menu', (ctx) => {
  ctx.answerCbQuery();
  ctx.deleteMessage();

  ctx.reply('Головне меню:', Markup.inlineKeyboard([
    [Markup.button.webApp('📅 Записатися онлайн', process.env.WEBAPP_URL)],
    [Markup.button.callback('📋 Мої записи', 'my_bookings')],
    [Markup.button.callback('ℹ️ Про салон', 'about')],
  ]));
});

// Обробка даних з Mini App
bot.on('web_app_data', async (ctx) => {
  try {
    const data = JSON.parse(ctx.webAppData.data);

    log('📱 Дані з Mini App', { userId: ctx.from.id, data });

    if (data.action === 'create_booking') {
      const { masterId, serviceId, date, time, phone, notes } = data;

      // Створюємо бронювання
      const result = dbQueries.createBooking.run(
        ctx.from.id,
        ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''),
        phone,
        masterId,
        serviceId,
        date,
        time,
        notes || null
      );

      // Оновлюємо лічильник записів користувача
      dbQueries.incrementUserBookings.run(ctx.from.id);

      // Отримуємо деталі запису
      const master = dbQueries.getMasterById.get(masterId);
      const service = dbQueries.getServiceById.get(serviceId);

      const formattedDate = format(parse(date, 'yyyy-MM-dd', new Date()), 'd MMMM yyyy', { locale: uk });

      ctx.reply(`
✅ Запис успішно створено!

📅 Дата: ${formattedDate}
⏰ Час: ${time}
👩‍🎨 Майстер: ${master.name}
💅 Послуга: ${service.name}
💰 Вартість: ${service.price} грн
⏱ Тривалість: ${service.duration} хв

📍 ${process.env.SALON_ADDRESS}

Ми надішлемо вам нагадування за день до візиту!

Дякуємо, що обрали ${process.env.SALON_NAME}! 💖
      `, Markup.inlineKeyboard([
        [Markup.button.callback('📋 Мої записи', 'my_bookings')],
        [Markup.button.webApp('📅 Новий запис', process.env.WEBAPP_URL)]
      ]));

      log('✅ Створено бронювання', { bookingId: result.lastInsertRowid, userId: ctx.from.id });
    }
  } catch (err) {
    log('❌ Помилка обробки даних Mini App', { error: err.message });
    ctx.reply('Виникла помилка при створенні запису. Спробуйте ще раз.');
  }
});

// Help command
bot.help((ctx) => {
  ctx.reply(`
📖 Допомога:

/start - Головне меню
/help - Ця довідка
/mybookings - Мої записи
/cancel - Скасувати запис

💡 Як записатися:
1. Натисніть "📅 Записатися онлайн"
2. Виберіть майстра
3. Виберіть послугу
4. Оберіть дату та час
5. Підтвердіть запис

📞 Зв'язок: ${process.env.SALON_PHONE}
  `);
});

// Мої записи (команда)
bot.command('mybookings', async (ctx) => {
  const userId = ctx.from.id;
  const bookings = dbQueries.getUserBookings.all(userId);

  if (bookings.length === 0) {
    ctx.reply('У вас поки немає записів.');
    return;
  }

  let message = '📋 Ваші записи:\n\n';
  bookings.forEach((booking, index) => {
    const date = format(parse(booking.booking_date, 'yyyy-MM-dd', new Date()), 'd MMMM yyyy', { locale: uk });
    message += `${index + 1}. ${date} о ${booking.booking_time}\n`;
    message += `   ${booking.master_name} - ${booking.service_name}\n\n`;
  });

  ctx.reply(message);
});

// Error handler
bot.catch((err, ctx) => {
  log('❌ Помилка бота', { error: err.message, userId: ctx?.from?.id });
  console.error('Bot error:', err);
});

// Launch bot
bot.launch().then(() => {
  log('✅ Бот успішно запущено!');
  console.log('✅ Бот запущено!');
  console.log(`📁 Логи: ${logFile}`);
}).catch((err) => {
  log('❌ Помилка запуску', { error: err.message });
  console.error('❌ Помилка запуску:', err);
});

// Graceful shutdown
process.once('SIGINT', () => {
  log('🛑 Бот зупиняється (SIGINT)');
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  log('🛑 Бот зупиняється (SIGTERM)');
  bot.stop('SIGTERM');
});
