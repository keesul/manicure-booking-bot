const tg = window.Telegram.WebApp;
tg.expand();

// Дані для бронювання
let selectedMaster = null;
let selectedService = null;
let selectedDate = null;
let selectedTime = null;
let userBookings = []; // Зберігаємо записи користувача

// Дані майстрів (хардкод, бо немає бекенду)
const masters = [
  { id: 1, name: 'Олена Коваленко', photo: '👩‍🎨', specialization: 'Класичний манікюр, педикюр', rating: 4.9 },
  { id: 2, name: 'Марія Шевченко', photo: '💅', specialization: 'Нарощування, дизайн', rating: 5.0 },
  { id: 3, name: 'Анна Бондаренко', photo: '✨', specialization: 'Апаратний манікюр, SPA', rating: 4.8 }
];

// Дані послуг
const services = [
  { id: 1, name: 'Класичний манікюр', description: 'Обробка нігтів, кутикули, покриття', duration: 60, price: 350, category: 'Манікюр' },
  { id: 2, name: 'Апаратний манікюр', description: 'Обробка апаратом, покриття гель-лаком', duration: 90, price: 450, category: 'Манікюр' },
  { id: 3, name: 'Манікюр + дизайн', description: 'Класичний манікюр з дизайном (2 нігті)', duration: 75, price: 500, category: 'Манікюр' },
  { id: 4, name: 'Нарощування нігтів', description: 'Гелеве нарощування будь-якої довжини', duration: 120, price: 800, category: 'Нарощування' },
  { id: 5, name: 'Педикюр класичний', description: 'Обробка стоп, нігтів, покриття', duration: 90, price: 450, category: 'Педикюр' },
  { id: 6, name: 'Педикюр апаратний', description: 'Апаратна обробка + покриття', duration: 75, price: 500, category: 'Педикюр' },
  { id: 7, name: 'SPA-манікюр', description: 'Манікюр + парафінотерапія + масаж', duration: 90, price: 600, category: 'SPA' },
  { id: 8, name: 'Зняття покриття', description: 'Зняття гель-лаку або гелю', duration: 30, price: 150, category: 'Додатково' }
];

// Зайняті слоти (приклад - в реальності має приходити з бекенду)
const bookedSlots = {};

// Навігація головного меню
function showMainMenu() {
  hideAllSteps();
  document.getElementById('mainMenu').classList.add('active');
}

function showBooking() {
  hideAllSteps();
  document.getElementById('step1').classList.add('active');
  renderMasters();
}

function showMyBookings() {
  hideAllSteps();
  document.getElementById('myBookingsPage').classList.add('active');

  // Запит записів з бота через initDataUnsafe
  const userId = tg.initDataUnsafe?.user?.id;

  if (!userId) {
    document.getElementById('bookingsList').innerHTML = '<p class="no-bookings">Помилка: не вдалося отримати дані користувача</p>';
    return;
  }

  // Відправляємо запит на отримання записів
  tg.sendData(JSON.stringify({ action: 'get_bookings', userId: userId }));

  // Поки що показуємо заглушку
  document.getElementById('bookingsList').innerHTML = '<p class="no-bookings">Завантаження...</p>';

  // Симуляція відповіді (в реальності дані прийдуть з бота)
  setTimeout(() => {
    if (userBookings.length === 0) {
      document.getElementById('bookingsList').innerHTML = '<p class="no-bookings">У вас поки немає записів</p>';
    } else {
      renderBookings();
    }
  }, 500);
}

function showAbout() {
  hideAllSteps();
  document.getElementById('aboutPage').classList.add('active');
}

function hideAllSteps() {
  document.querySelectorAll('.step').forEach(step => {
    step.classList.remove('active');
  });
}

function renderBookings() {
  const container = document.getElementById('bookingsList');

  container.innerHTML = userBookings.map(booking => `
    <div class="booking-card">
      <div class="booking-header">
        <span class="booking-date">📅 ${booking.date}</span>
        <span class="booking-time">⏰ ${booking.time}</span>
      </div>
      <div class="booking-details">
        <p><strong>👩‍🎨 Майстер:</strong> ${booking.masterName}</p>
        <p><strong>💅 Послуга:</strong> ${booking.serviceName}</p>
        <p><strong>💰 Вартість:</strong> ${booking.price} грн</p>
      </div>
    </div>
  `).join('');
}

// Ініціалізація
document.addEventListener('DOMContentLoaded', () => {
  renderMasters();
});

// Крок 1: Відображення майстрів
function renderMasters() {
  const container = document.getElementById('mastersList');
  container.innerHTML = masters.map(master => `
    <div class="master-card" onclick="selectMaster(${master.id})">
      <div class="master-photo">${master.photo}</div>
      <div class="master-info">
        <h3>${master.name}</h3>
        <p class="specialization">${master.specialization}</p>
        <div class="rating">⭐ ${master.rating}</div>
      </div>
    </div>
  `).join('');
}

function selectMaster(masterId) {
  selectedMaster = masters.find(m => m.id === masterId);
  renderServices();
  goToStep(2);
}

// Крок 2: Відображення послуг
function renderServices() {
  const container = document.getElementById('servicesList');
  container.innerHTML = services.map(service => `
    <div class="service-card" onclick="selectService(${service.id})">
      <div class="service-header">
        <h3>${service.name}</h3>
        <span class="price">${service.price} грн</span>
      </div>
      <p class="description">${service.description}</p>
      <div class="service-footer">
        <span class="duration">⏱ ${service.duration} хв</span>
        <span class="category">${service.category}</span>
      </div>
    </div>
  `).join('');
}

function selectService(serviceId) {
  selectedService = services.find(s => s.id === serviceId);
  renderCalendar();
  goToStep(3);
}

// Крок 3: Календар
function renderCalendar() {
  const container = document.getElementById('calendar');
  const today = new Date();
  const days = [];

  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push(date);
  }

  container.innerHTML = days.map((date, index) => {
    const dateStr = formatDate(date);
    const dayName = getDayName(date);
    const isToday = index === 0;

    return `
      <div class="calendar-day ${isToday ? 'today' : ''}" onclick="selectDate('${dateStr}')">
        <div class="day-name">${dayName}</div>
        <div class="day-number">${date.getDate()}</div>
        <div class="month-name">${getMonthName(date)}</div>
      </div>
    `;
  }).join('');
}

function selectDate(dateStr) {
  selectedDate = dateStr;
  document.getElementById('selectedDateText').textContent = formatDateReadable(dateStr);
  renderTimeSlots();
  goToStep(4);
}

// Крок 4: Часові слоти
function renderTimeSlots() {
  const container = document.getElementById('timeSlots');
  const slots = generateTimeSlots();

  container.innerHTML = slots.map(slot => {
    const isBooked = isSlotBooked(selectedDate, slot);
    const isPast = isSlotInPast(selectedDate, slot);
    const disabled = isBooked || isPast;

    return `
      <button
        class="time-slot ${disabled ? 'disabled' : ''}"
        onclick="selectTime('${slot}')"
        ${disabled ? 'disabled' : ''}
      >
        ${slot}
      </button>
    `;
  }).join('');
}

function generateTimeSlots() {
  const slots = [];
  const start = 9; // 09:00
  const end = 20; // 20:00

  for (let hour = start; hour < end; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    slots.push(`${hour.toString().padStart(2, '0')}:30`);
  }

  return slots;
}

function isSlotBooked(date, time) {
  const key = `${date}_${time}_${selectedMaster.id}`;
  return bookedSlots[key] === true;
}

function isSlotInPast(date, time) {
  const now = new Date();
  const slotDate = new Date(date + 'T' + time);
  return slotDate < now;
}

function selectTime(time) {
  selectedTime = time;
  showSummary();
  goToStep(5);
}

// Крок 5: Підсумок
function showSummary() {
  document.getElementById('summaryMaster').textContent = selectedMaster.name;
  document.getElementById('summaryService').textContent = selectedService.name;
  document.getElementById('summaryDate').textContent = formatDateReadable(selectedDate);
  document.getElementById('summaryTime').textContent = selectedTime;
  document.getElementById('summaryDuration').textContent = `${selectedService.duration} хв`;
  document.getElementById('summaryPrice').textContent = `${selectedService.price} грн`;
}

function confirmBooking() {
  const phone = document.getElementById('phone').value;
  const notes = document.getElementById('notes').value;

  if (!phone) {
    alert('Будь ласка, введіть номер телефону');
    return;
  }

  const bookingData = {
    action: 'create_booking',
    masterId: selectedMaster.id,
    serviceId: selectedService.id,
    date: selectedDate,
    time: selectedTime,
    phone: phone,
    notes: notes
  };

  tg.sendData(JSON.stringify(bookingData));
  tg.close();
}

// Навігація між кроками
function goToStep(stepNumber) {
  document.querySelectorAll('.step').forEach(step => {
    step.classList.remove('active');
  });
  document.getElementById(`step${stepNumber}`).classList.add('active');
}

// Допоміжні функції
function formatDate(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateReadable(dateStr) {
  const [year, month, day] = dateStr.split('-');
  const monthNames = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
                      'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
  return `${parseInt(day)} ${monthNames[parseInt(month) - 1]} ${year}`;
}

function getDayName(date) {
  const days = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return days[date.getDay()];
}

function getMonthName(date) {
  const months = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру'];
  return months[date.getMonth()];
}
