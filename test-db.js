import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Створюємо папку data якщо не існує
const dataDir = join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(join(__dirname, 'data/bookings.db'));

console.log('=== ТЕСТ БАЗИ ДАНИХ ===\n');

// 1. Перевірка майстрів
console.log('1. Майстри:');
const masters = db.prepare('SELECT * FROM masters').all();
console.log(`   Знайдено: ${masters.length}`);
masters.forEach(m => console.log(`   - ${m.name} (ID: ${m.id})`));

// 2. Перевірка послуг
console.log('\n2. Послуги:');
const services = db.prepare('SELECT * FROM services').all();
console.log(`   Знайдено: ${services.length}`);
services.forEach(s => console.log(`   - ${s.name} - ${s.price} грн (ID: ${s.id})`));

// 3. Перевірка записів
console.log('\n3. Записи:');
const bookings = db.prepare('SELECT * FROM bookings').all();
console.log(`   Знайдено: ${bookings.length}`);
if (bookings.length > 0) {
  bookings.forEach(b => {
    console.log(`   - ${b.user_name} | ${b.booking_date} ${b.booking_time} | Статус: ${b.status}`);
  });
} else {
  console.log('   Записів немає');
}

// 4. Перевірка користувачів
console.log('\n4. Користувачі:');
const users = db.prepare('SELECT * FROM users').all();
console.log(`   Знайдено: ${users.length}`);
users.forEach(u => console.log(`   - ${u.first_name} (ID: ${u.user_id}, записів: ${u.total_bookings})`));

// 5. Тестове створення запису
console.log('\n5. Тест створення запису:');
try {
  const testUserId = 123456789;
  const testBooking = db.prepare(`
    INSERT INTO bookings (user_id, user_name, user_phone, master_id, service_id, booking_date, booking_time, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(testUserId, 'Тестовий Користувач', '+380501234567', 1, 1, '2026-05-15', '14:00', 'Тест');

  console.log(`   ✅ Запис створено (ID: ${testBooking.lastInsertRowid})`);

  // Перевірка чи запис з'явився
  const userBookings = db.prepare(`
    SELECT b.*, m.name as master_name, s.name as service_name, s.price
    FROM bookings b
    JOIN masters m ON b.master_id = m.id
    JOIN services s ON b.service_id = s.id
    WHERE b.user_id = ?
  `).all(testUserId);

  console.log(`   Записів користувача ${testUserId}: ${userBookings.length}`);

  // Видаляємо тестовий запис
  db.prepare('DELETE FROM bookings WHERE user_id = ?').run(testUserId);
  console.log('   🗑️ Тестовий запис видалено');
} catch (err) {
  console.log(`   ❌ Помилка: ${err.message}`);
}

console.log('\n=== ТЕСТ ЗАВЕРШЕНО ===');
db.close();
