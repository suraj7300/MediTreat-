// ============================================================
//  MEDITREAT — scripts/setup-db.js
//  Run ONCE to create all database tables
//  Usage: node scripts/setup-db.js
// ============================================================

const { Pool } = require('pg');
require('dotenv').config();

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(200),
  clinic_name VARCHAR(100),
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'doctor',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  age INTEGER,
  gender VARCHAR(10),
  phone VARCHAR(20),
  allergies TEXT,
  blood_group VARCHAR(5),
  total_visits INTEGER DEFAULT 0,
  last_visit DATE,
  whatsapp_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS queue (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  token_number INTEGER NOT NULL,
  complaint TEXT,
  triage VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(20) DEFAULT 'waiting',
  payment_status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT FALSE,
  date DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  time_slot TIME NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'confirmed',
  payment_status VARCHAR(20) DEFAULT 'pending',
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  amount INTEGER,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visits (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id INTEGER REFERENCES users(id),
  visit_date DATE DEFAULT CURRENT_DATE,
  complaint TEXT,
  diagnosis TEXT,
  prescription TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clinic_settings (
  doctor_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  clinic_name VARCHAR(100),
  address TEXT,
  open_time TIME DEFAULT '09:00',
  close_time TIME DEFAULT '20:00',
  slot_duration INTEGER DEFAULT 10,
  max_patients_day INTEGER DEFAULT 40,
  advance_booking_days INTEGER DEFAULT 7,
  consultation_fee INTEGER DEFAULT 300,
  advance_fee INTEGER DEFAULT 100,
  upi_id VARCHAR(100),
  phone VARCHAR(20),
  bot_greeting TEXT DEFAULT 'Namaste! Welcome. How can I help?',
  bot_active BOOLEAN DEFAULT TRUE,
  ai_triage BOOLEAN DEFAULT TRUE,
  followup_enabled BOOLEAN DEFAULT FALSE,
  reminder_enabled BOOLEAN DEFAULT TRUE,
  upi_enabled BOOLEAN DEFAULT TRUE,
  receipt_on_whatsapp BOOLEAN DEFAULT TRUE,
  urgent_sms BOOLEAN DEFAULT TRUE,
  languages TEXT[] DEFAULT ARRAY['en','hi']
);

CREATE TABLE IF NOT EXISTS subscriptions (
  doctor_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(20) DEFAULT 'free',
  status VARCHAR(20) DEFAULT 'active',
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queue_date     ON queue(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_bookings_date  ON bookings(doctor_id, booking_date);
`;

db.query(schema)
  .then(() => {
    console.log('');
    console.log('✅  MediTreat database setup complete!');
    console.log('    Tables created: users, patients, queue, bookings,');
    console.log('                    payments, visits, clinic_settings, subscriptions');
    console.log('');
    process.exit(0);
  })
  .catch(e => {
    console.error('❌  Setup failed:', e.message);
    process.exit(1);
  });
