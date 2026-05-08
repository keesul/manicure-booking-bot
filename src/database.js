import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Створюємо папку data якщо не існує
const dataDir = join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(process.env.DATABASE_PATH || join(__dirname, '../data/bookings.db'));

// Створення таблиць
db.exec(`
  CREATE TABLE IF NOT EXISTS masters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    photo TEXT,
    specialization TEXT,
    rating REAL DEFAULT 5.0,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL,
    price INTEGER NOT NULL,
    category TEXT,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    user_phone TEXT,
    master_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    booking_date TEXT NOT NULL,
    booking_time TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (master_id) REFERENCES masters(id),
    FOREIGN KEY (service_id) REFERENCES services(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    total_bookings INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date, booking_time);
  CREATE INDEX IF NOT EXISTS idx_bookings_master ON bookings(master_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
`);

// Додаємо початкові дані - майстри
const insertMaster = db.prepare(`
  INSERT OR IGNORE INTO masters (id, name, photo, specialization, rating)
  VALUES (?, ?, ?, ?, ?)
`);

const masters = [
  [1, 'Олена Коваленко', '👩‍🎨', 'Класичний манікюр, педикюр', 4.9],
  [2, 'Марія Шевченко', '💅', 'Нарощування, дизайн', 5.0],
  [3, 'Анна Бондаренко', '✨', 'Апаратний манікюр, SPA', 4.8]
];

masters.forEach(master => insertMaster.run(...master));

// Додаємо послуги
const insertService = db.prepare(`
  INSERT OR IGNORE INTO services (id, name, description, duration, price, category)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const services = [
  [1, 'Класичний манікюр', 'Обробка нігтів, кутикули, покриття', 60, 350, 'Манікюр'],
  [2, 'Апаратний манікюр', 'Обробка апаратом, покриття гель-лаком', 90, 450, 'Манікюр'],
  [3, 'Манікюр + дизайн', 'Класичний манікюр з дизайном (2 нігті)', 75, 500, 'Манікюр'],
  [4, 'Нарощування нігтів', 'Гелеве нарощування будь-якої довжини', 120, 800, 'Нарощування'],
  [5, 'Педикюр класичний', 'Обробка стоп, нігтів, покриття', 90, 450, 'Педикюр'],
  [6, 'Педикюр апаратний', 'Апаратна обробка + покриття', 75, 500, 'Педикюр'],
  [7, 'SPA-манікюр', 'Манікюр + парафінотерапія + масаж', 90, 600, 'SPA'],
  [8, 'Зняття покриття', 'Зняття гель-лаку або гелю', 30, 150, 'Додатково']
];

services.forEach(service => insertService.run(...service));

console.log('✅ База даних ініціалізована');

// Функції для роботи з БД
export const dbQueries = {
  // Майстри
  getAllMasters: db.prepare('SELECT * FROM masters WHERE active = 1'),
  getMasterById: db.prepare('SELECT * FROM masters WHERE id = ?'),

  // Послуги
  getAllServices: db.prepare('SELECT * FROM services WHERE active = 1 ORDER BY category, price'),
  getServiceById: db.prepare('SELECT * FROM services WHERE id = ?'),
  getServicesByCategory: db.prepare('SELECT * FROM services WHERE category = ? AND active = 1'),

  // Бронювання
  createBooking: db.prepare(`
    INSERT INTO bookings (user_id, user_name, user_phone, master_id, service_id, booking_date, booking_time, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getBookingsByDate: db.prepare(`
    SELECT b.*, m.name as master_name, s.name as service_name, s.duration
    FROM bookings b
    JOIN masters m ON b.master_id = m.id
    JOIN services s ON b.service_id = s.id
    WHERE b.booking_date = ? AND b.status != 'cancelled'
    ORDER BY b.booking_time
  `),

  getBookingsByMasterAndDate: db.prepare(`
    SELECT * FROM bookings
    WHERE master_id = ? AND booking_date = ? AND status != 'cancelled'
    ORDER BY booking_time
  `),

  getUserBookings: db.prepare(`
    SELECT b.*, m.name as master_name, s.name as service_name, s.price
    FROM bookings b
    JOIN masters m ON b.master_id = m.id
    JOIN services s ON b.service_id = s.id
    WHERE b.user_id = ? AND b.status != 'cancelled'
    ORDER BY b.booking_date DESC, b.booking_time DESC
    LIMIT 10
  `),

  getUpcomingBookings: db.prepare(`
    SELECT b.*, m.name as master_name, s.name as service_name, s.price
    FROM bookings b
    JOIN masters m ON b.master_id = m.id
    JOIN services s ON b.service_id = s.id
    WHERE b.booking_date >= date('now') AND b.status = 'pending'
    ORDER BY b.booking_date, b.booking_time
  `),

  cancelBooking: db.prepare(`
    UPDATE bookings SET status = 'cancelled' WHERE id = ?
  `),

  confirmBooking: db.prepare(`
    UPDATE bookings SET status = 'confirmed' WHERE id = ?
  `),

  // Користувачі
  upsertUser: db.prepare(`
    INSERT INTO users (user_id, username, first_name, last_name, phone)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      username = excluded.username,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      phone = COALESCE(excluded.phone, phone)
  `),

  incrementUserBookings: db.prepare(`
    UPDATE users SET total_bookings = total_bookings + 1 WHERE user_id = ?
  `),

  getUser: db.prepare('SELECT * FROM users WHERE user_id = ?')
};

export default db;
