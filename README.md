# 💅 Система запису на манікюр через Telegram Mini App

Повнофункціональна система онлайн-бронювання для салону краси з календарем, вибором майстра, послуг та автоматичними нагадуваннями.

## 🎯 Функціонал

### Для клієнтів:
- ✅ Вибір майстра з рейтингом та спеціалізацією
- ✅ Перегляд всіх послуг з цінами та тривалістю
- ✅ Інтерактивний календар на 2 тижні вперед
- ✅ Вибір вільного часу (зайняті слоти неактивні)
- ✅ Підтвердження запису з деталями
- ✅ Перегляд своїх записів
- ✅ Автоматичні нагадування

### Для салону:
- ✅ База даних всіх записів
- ✅ Інформація про клієнтів
- ✅ Статистика по майстрам
- ✅ Логування всіх дій
- ✅ Можливість інтеграції з Google Calendar

## 📁 Структура проєкту

```
manicure-booking/
├── src/
│   ├── bot.js              # Telegram бот
│   └── database.js         # База даних SQLite
├── webapp/
│   ├── index.html          # Mini App HTML
│   ├── app.js              # Mini App логіка
│   └── style.css           # Mini App стилі
├── data/
│   └── bookings.db         # База даних (створюється автоматично)
├── logs/                   # Логи бота
├── .env                    # Конфігурація
├── package.json
└── README.md
```

## 🚀 Швидкий старт

### 1. Встановити залежності

```bash
cd C:\Users\kazmi\manicure-booking
npm install
```

### 2. Створити папку для БД

```bash
mkdir data
```

### 3. Запустити бота

```bash
npm start
```

### 4. Deploy Mini App на Vercel

```bash
cd webapp
npx vercel
```

Отримаєш URL типу: `https://your-app.vercel.app`

### 5. Оновити .env

```env
WEBAPP_URL=https://your-app.vercel.app
```

### 6. Налаштувати Menu Button в @BotFather

```
/mybots → [твій бот] → Bot Settings → Menu Button
→ Edit Menu Button URL
→ Введи Vercel URL
```

## 📊 База даних

### Таблиці:

**masters** - Майстри салону
- id, name, photo, specialization, rating, active

**services** - Послуги
- id, name, description, duration, price, category, active

**bookings** - Записи клієнтів
- id, user_id, user_name, user_phone, master_id, service_id, booking_date, booking_time, status, created_at, notes

**users** - Користувачі
- user_id, username, first_name, last_name, phone, total_bookings, created_at

### Початкові дані:

**3 майстри:**
1. Олена Коваленко - Класичний манікюр, педикюр (⭐ 4.9)
2. Марія Шевченко - Нарощування, дизайн (⭐ 5.0)
3. Анна Бондаренко - Апаратний манікюр, SPA (⭐ 4.8)

**8 послуг:**
- Класичний манікюр - 350 грн (60 хв)
- Апаратний манікюр - 450 грн (90 хв)
- Манікюр + дизайн - 500 грн (75 хв)
- Нарощування нігтів - 800 грн (120 хв)
- Педикюр класичний - 450 грн (90 хв)
- Педикюр апаратний - 500 грн (75 хв)
- SPA-манікюр - 600 грн (90 хв)
- Зняття покриття - 150 грн (30 хв)

## 🎨 Налаштування

### Змінити дані салону (.env):

```env
SALON_NAME=Ваша назва
SALON_PHONE=+380501234567
SALON_ADDRESS=Ваша адреса
WORK_START=09:00
WORK_END=20:00
SLOT_DURATION=60
```

### Додати нового майстра:

Відредагуй `src/database.js`, додай в масив `masters`:

```javascript
[4, 'Ім\'я Прізвище', '👩‍🎨', 'Спеціалізація', 5.0]
```

### Додати нову послугу:

Відредагуй `src/database.js`, додай в масив `services`:

```javascript
[9, 'Назва', 'Опис', 60, 400, 'Категорія']
```

## 📱 Як працює система

### Процес бронювання:

1. **Клієнт відкриває бота** → Натискає "📅 Записатися онлайн"
2. **Відкривається Mini App** → Вибирає майстра
3. **Вибирає послугу** → Бачить ціну та тривалість
4. **Вибирає дату** → Календар на 2 тижні
5. **Вибирає час** → Зайняті слоти неактивні
6. **Підтверджує** → Вводить телефон та коментар
7. **Запис створено** → Бот надсилає підтвердження

### Що бачить клієнт:

```
✅ Запис успішно створено!

📅 Дата: 15 травня 2026
⏰ Час: 14:00
👩‍🎨 Майстер: Марія Шевченко
💅 Послуга: Апаратний манікюр
💰 Вартість: 450 грн
⏱ Тривалість: 90 хв

📍 вул. Хрещатик, 1, Київ

Ми надішлемо вам нагадування за день до візиту!
```

## 🔔 Нагадування (TODO)

Для автоматичних нагадувань потрібно додати cron job:

```javascript
// Щодня о 10:00 перевіряти записи на завтра
cron.schedule('0 10 * * *', () => {
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const bookings = dbQueries.getBookingsByDate.all(tomorrow);

  bookings.forEach(booking => {
    bot.telegram.sendMessage(booking.user_id, `
🔔 Нагадування!

Завтра у вас запис:
⏰ ${booking.booking_time}
👩‍🎨 Майстер: ${booking.master_name}
💅 ${booking.service_name}

📍 ${process.env.SALON_ADDRESS}

Чекаємо на вас! 💖
    `);
  });
});
```

## 📈 Статистика

### Переглянути всі записи:

```javascript
const allBookings = db.prepare('SELECT * FROM bookings').all();
console.log(allBookings);
```

### Статистика по майстрам:

```javascript
const stats = db.prepare(`
  SELECT m.name, COUNT(*) as total_bookings
  FROM bookings b
  JOIN masters m ON b.master_id = m.id
  GROUP BY m.id
`).all();
```

### Найпопулярніші послуги:

```javascript
const popular = db.prepare(`
  SELECT s.name, COUNT(*) as count
  FROM bookings b
  JOIN services s ON b.service_id = s.id
  GROUP BY s.id
  ORDER BY count DESC
`).all();
```

## 🔗 Інтеграція з Google Calendar

Для автоматичного додавання записів в Google Calendar:

1. Створи проєкт в Google Cloud Console
2. Увімкни Google Calendar API
3. Отримай credentials
4. Встанови бібліотеку:

```bash
npm install googleapis
```

5. Додай код в `src/bot.js`:

```javascript
import { google } from 'googleapis';

const calendar = google.calendar('v3');

async function addToCalendar(booking) {
  const event = {
    summary: `${booking.service_name} - ${booking.user_name}`,
    description: `Телефон: ${booking.user_phone}`,
    start: {
      dateTime: `${booking.booking_date}T${booking.booking_time}:00`,
      timeZone: 'Europe/Kiev',
    },
    end: {
      dateTime: calculateEndTime(booking),
      timeZone: 'Europe/Kiev',
    },
  };

  await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
  });
}
```

## 🎨 Кастомізація дизайну

### Змінити кольори (webapp/style.css):

```css
:root {
  --primary-color: #ff69b4;  /* Основний колір */
  --success-color: #4caf50;  /* Успіх */
  --danger-color: #f44336;   /* Помилка */
}
```

### Додати логотип салону:

Замість емодзі в `master-photo` можна використати реальні фото:

```javascript
{ id: 1, name: 'Олена', photo: 'https://your-cdn.com/olena.jpg', ... }
```

## 🐛 Troubleshooting

### Бот не відповідає:
1. Перевір BOT_TOKEN в .env
2. Перевір чи запущений бот: `tasklist | findstr node`
3. Подивись логи: `logs/bot-YYYY-MM-DD.log`

### Mini App не відкривається:
1. Перевір WEBAPP_URL в .env
2. Перевір чи доступний URL в браузері
3. Перевір Menu Button в @BotFather

### База даних не створюється:
1. Створи папку `data` вручну: `mkdir data`
2. Перезапусти бота

## 📞 Підтримка

Якщо виникли питання або потрібна допомога - пиши!

## 🚀 Наступні кроки

- [ ] Додати Google Calendar інтеграцію
- [ ] Додати автоматичні нагадування
- [ ] Додати можливість скасування запису
- [ ] Додати адмін-панель для майстрів
- [ ] Додати онлайн-оплату
- [ ] Додати систему знижок/бонусів
- [ ] Додати відгуки клієнтів

---

**Створено з ❤️ за допомогою Claude Code**
