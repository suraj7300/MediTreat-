// ============================================================
//  MEDITREAT BACKEND API  —  server.js
//  Stack: Node.js + Express + PostgreSQL + JWT Auth
//  Run:   node server.js   (after npm install)
// ============================================================

const express      = require('express');
const cors         = require('cors');
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const { Pool }     = require('pg');
const Razorpay     = require('razorpay');
const crypto       = require('crypto');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ── DB CONNECTION ────────────────────────────────────────────
const db = new Pool({
  connectionString: process.env.DATABASE_URL,  // e.g. postgresql://user:pass@host:5432/meditreat
  ssl: { rejectUnauthorized: false }
});

// ── RAZORPAY ─────────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ── JWT MIDDLEWARE ───────────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

// ── ROLE GUARD ───────────────────────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ error: 'Access denied' });
  next();
};

// ════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ════════════════════════════════════════════════════════════

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, clinic_name, phone, role = 'doctor' } = req.body;
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, clinic_name, phone, role)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, role`,
      [name, email, hash, clinic_name, phone, role]
    );
    res.json({ user: result.rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, clinic_id: user.clinic_id },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, clinic_name: user.clinic_name } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════
//  PATIENT ROUTES
// ════════════════════════════════════════════════════════════

// GET /api/patients — all patients for this clinic
app.get('/api/patients', authMiddleware, async (req, res) => {
  const { search } = req.query;
  let query = `SELECT id, name, age, gender, phone, allergies, last_visit, total_visits, created_at
               FROM patients WHERE doctor_id=$1`;
  const params = [req.user.id];
  if (search) { query += ` AND (name ILIKE $2 OR phone ILIKE $2)`; params.push(`%${search}%`); }
  query += ' ORDER BY last_visit DESC';
  const result = await db.query(query, params);
  res.json(result.rows);
});

// GET /api/patients/:id — single patient + visit history
app.get('/api/patients/:id', authMiddleware, async (req, res) => {
  const patient = await db.query('SELECT * FROM patients WHERE id=$1 AND doctor_id=$2', [req.params.id, req.user.id]);
  const visits  = await db.query('SELECT * FROM visits WHERE patient_id=$1 ORDER BY visit_date DESC LIMIT 10', [req.params.id]);
  if (!patient.rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json({ ...patient.rows[0], visits: visits.rows });
});

// POST /api/patients — create patient
app.post('/api/patients', authMiddleware, async (req, res) => {
  const { name, age, gender, phone, allergies, blood_group } = req.body;
  const result = await db.query(
    `INSERT INTO patients (doctor_id, name, age, gender, phone, allergies, blood_group, total_visits)
     VALUES ($1,$2,$3,$4,$5,$6,$7,0) RETURNING *`,
    [req.user.id, name, age, gender, phone, allergies, blood_group]
  );
  res.json(result.rows[0]);
});

// PUT /api/patients/:id — update patient
app.put('/api/patients/:id', authMiddleware, async (req, res) => {
  const { name, age, gender, phone, allergies, blood_group } = req.body;
  const result = await db.query(
    `UPDATE patients SET name=$1,age=$2,gender=$3,phone=$4,allergies=$5,blood_group=$6
     WHERE id=$7 AND doctor_id=$8 RETURNING *`,
    [name, age, gender, phone, allergies, blood_group, req.params.id, req.user.id]
  );
  res.json(result.rows[0]);
});

// ════════════════════════════════════════════════════════════
//  QUEUE ROUTES
// ════════════════════════════════════════════════════════════

// GET /api/queue/today — today's live queue
app.get('/api/queue/today', authMiddleware, async (req, res) => {
  const result = await db.query(
    `SELECT q.*, p.name, p.age, p.gender, p.phone, p.allergies
     FROM queue q JOIN patients p ON q.patient_id=p.id
     WHERE q.doctor_id=$1 AND q.date=CURRENT_DATE
     ORDER BY q.token_number`,
    [req.user.id]
  );
  res.json(result.rows);
});

// POST /api/queue — add patient to queue
app.post('/api/queue', authMiddleware, async (req, res) => {
  const { patient_id, complaint, triage = 'normal', payment_status = 'pending' } = req.body;
  // auto-assign next token number
  const tokenRes = await db.query(
    `SELECT COALESCE(MAX(token_number),0)+1 AS next FROM queue WHERE doctor_id=$1 AND date=CURRENT_DATE`,
    [req.user.id]
  );
  const token = tokenRes.rows[0].next;
  const result = await db.query(
    `INSERT INTO queue (doctor_id, patient_id, token_number, complaint, triage, status, payment_status, date)
     VALUES ($1,$2,$3,$4,$5,'waiting',$6,CURRENT_DATE) RETURNING *`,
    [req.user.id, patient_id, token, complaint, triage, payment_status]
  );
  res.json({ ...result.rows[0], token_number: token });
});

// PUT /api/queue/:id/status — update status (waiting/active/done)
app.put('/api/queue/:id/status', authMiddleware, async (req, res) => {
  const { status, notes } = req.body;
  await db.query(
    `UPDATE queue SET status=$1, notes=$2, updated_at=NOW() WHERE id=$3 AND doctor_id=$4`,
    [status, notes, req.params.id, req.user.id]
  );
  if (status === 'done') {
    // increment visit count + update last_visit
    const q = await db.query('SELECT patient_id FROM queue WHERE id=$1', [req.params.id]);
    if (q.rows[0]) {
      await db.query(
        `UPDATE patients SET total_visits=total_visits+1, last_visit=CURRENT_DATE WHERE id=$1`,
        [q.rows[0].patient_id]
      );
    }
  }
  res.json({ success: true });
});

// ════════════════════════════════════════════════════════════
//  BOOKINGS ROUTES
// ════════════════════════════════════════════════════════════

// GET /api/bookings — all bookings
app.get('/api/bookings', authMiddleware, async (req, res) => {
  const { date } = req.query;
  let q = `SELECT b.*, p.name, p.phone FROM bookings b JOIN patients p ON b.patient_id=p.id
           WHERE b.doctor_id=$1`;
  const params = [req.user.id];
  if (date) { q += ` AND b.booking_date=$2`; params.push(date); }
  q += ' ORDER BY b.booking_date, b.time_slot';
  const result = await db.query(q, params);
  res.json(result.rows);
});

// POST /api/bookings — create booking
app.post('/api/bookings', authMiddleware, async (req, res) => {
  const { patient_id, booking_date, time_slot, reason } = req.body;
  // check slot not already taken
  const clash = await db.query(
    `SELECT id FROM bookings WHERE doctor_id=$1 AND booking_date=$2 AND time_slot=$3 AND status!='cancelled'`,
    [req.user.id, booking_date, time_slot]
  );
  if (clash.rows.length) return res.status(400).json({ error: 'Slot already booked' });
  const result = await db.query(
    `INSERT INTO bookings (doctor_id, patient_id, booking_date, time_slot, reason, status, payment_status)
     VALUES ($1,$2,$3,$4,$5,'confirmed','pending') RETURNING *`,
    [req.user.id, patient_id, booking_date, time_slot, reason]
  );
  res.json(result.rows[0]);
});

// PUT /api/bookings/:id/cancel
app.put('/api/bookings/:id/cancel', authMiddleware, async (req, res) => {
  await db.query(`UPDATE bookings SET status='cancelled' WHERE id=$1 AND doctor_id=$2`, [req.params.id, req.user.id]);
  res.json({ success: true });
});

// ════════════════════════════════════════════════════════════
//  PAYMENTS (RAZORPAY)
// ════════════════════════════════════════════════════════════

// POST /api/payments/create-order
app.post('/api/payments/create-order', authMiddleware, async (req, res) => {
  const { amount, booking_id } = req.body;  // amount in paise
  try {
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: 'INR',
      receipt: `booking_${booking_id}`,
      notes: { booking_id }
    });
    // store order in DB
    await db.query(
      `INSERT INTO payments (booking_id, razorpay_order_id, amount, status) VALUES ($1,$2,$3,'pending')`,
      [booking_id, order.id, amount]
    );
    res.json({ order_id: order.id, amount, key: process.env.RAZORPAY_KEY_ID });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/payments/verify
app.post('/api/payments/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id } = req.body;
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
  if (expected !== razorpay_signature) return res.status(400).json({ error: 'Invalid signature' });
  await db.query(
    `UPDATE payments SET status='paid', razorpay_payment_id=$1 WHERE razorpay_order_id=$2`,
    [razorpay_payment_id, razorpay_order_id]
  );
  await db.query(`UPDATE bookings SET payment_status='paid' WHERE id=$1`, [booking_id]);
  res.json({ success: true });
});

// ════════════════════════════════════════════════════════════
//  ANALYTICS ROUTES
// ════════════════════════════════════════════════════════════

// GET /api/analytics/summary
app.get('/api/analytics/summary', authMiddleware, async (req, res) => {
  const [todayQ, monthlyP, revenue, topAilments] = await Promise.all([
    db.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='waiting') as waiting,
              COUNT(*) FILTER (WHERE triage='urgent') as urgent
              FROM queue WHERE doctor_id=$1 AND date=CURRENT_DATE`, [req.user.id]),
    db.query(`SELECT COUNT(DISTINCT patient_id) as count FROM queue
              WHERE doctor_id=$1 AND date>=date_trunc('month',CURRENT_DATE)`, [req.user.id]),
    db.query(`SELECT COALESCE(SUM(p.amount),0) as total FROM payments p
              JOIN bookings b ON p.booking_id=b.id WHERE b.doctor_id=$1
              AND p.status='paid' AND p.created_at>=date_trunc('month',CURRENT_DATE)`, [req.user.id]),
    db.query(`SELECT complaint, COUNT(*) as count FROM queue WHERE doctor_id=$1
              AND date>=CURRENT_DATE-30 GROUP BY complaint ORDER BY count DESC LIMIT 5`, [req.user.id])
  ]);
  res.json({
    today: todayQ.rows[0],
    monthly_patients: monthlyP.rows[0].count,
    monthly_revenue: revenue.rows[0].total,
    top_ailments: topAilments.rows
  });
});

// GET /api/analytics/footfall?days=7
app.get('/api/analytics/footfall', authMiddleware, async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const result = await db.query(
    `SELECT date, COUNT(*) as count FROM queue WHERE doctor_id=$1
     AND date>=CURRENT_DATE-$2 GROUP BY date ORDER BY date`,
    [req.user.id, days]
  );
  res.json(result.rows);
});

// ════════════════════════════════════════════════════════════
//  CLINIC SETTINGS
// ════════════════════════════════════════════════════════════

// GET /api/settings
app.get('/api/settings', authMiddleware, async (req, res) => {
  const result = await db.query('SELECT * FROM clinic_settings WHERE doctor_id=$1', [req.user.id]);
  res.json(result.rows[0] || {});
});

// PUT /api/settings
app.put('/api/settings', authMiddleware, async (req, res) => {
  const {
    clinic_name, address, open_time, close_time,
    slot_duration, max_patients_day, advance_booking_days,
    consultation_fee, advance_fee, upi_id,
    bot_greeting, bot_active, ai_triage, followup_enabled,
    reminder_enabled, languages
  } = req.body;
  await db.query(
    `INSERT INTO clinic_settings
       (doctor_id,clinic_name,address,open_time,close_time,slot_duration,max_patients_day,
        advance_booking_days,consultation_fee,advance_fee,upi_id,bot_greeting,bot_active,
        ai_triage,followup_enabled,reminder_enabled,languages)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     ON CONFLICT (doctor_id) DO UPDATE SET
       clinic_name=$2,address=$3,open_time=$4,close_time=$5,slot_duration=$6,
       max_patients_day=$7,advance_booking_days=$8,consultation_fee=$9,advance_fee=$10,
       upi_id=$11,bot_greeting=$12,bot_active=$13,ai_triage=$14,followup_enabled=$15,
       reminder_enabled=$16,languages=$17`,
    [req.user.id,clinic_name,address,open_time,close_time,slot_duration,max_patients_day,
     advance_booking_days,consultation_fee,advance_fee,upi_id,bot_greeting,bot_active,
     ai_triage,followup_enabled,reminder_enabled,languages]
  );
  res.json({ success: true });
});

// ════════════════════════════════════════════════════════════
//  SUBSCRIPTIONS (plans stored in DB)
// ════════════════════════════════════════════════════════════

// GET /api/subscription
app.get('/api/subscription', authMiddleware, async (req, res) => {
  const result = await db.query('SELECT * FROM subscriptions WHERE doctor_id=$1 ORDER BY created_at DESC LIMIT 1', [req.user.id]);
  res.json(result.rows[0] || { plan: 'free' });
});

// POST /api/subscription/upgrade
app.post('/api/subscription/upgrade', authMiddleware, async (req, res) => {
  const { plan } = req.body;
  const prices = { starter: 999, growth: 2499, pro: 4999 };
  const amount = prices[plan];
  if (!amount) return res.status(400).json({ error: 'Invalid plan' });
  const order = await razorpay.orders.create({ amount: amount * 100, currency: 'INR', receipt: `sub_${req.user.id}` });
  res.json({ order_id: order.id, amount, plan, key: process.env.RAZORPAY_KEY_ID });
});

// POST /api/subscription/activate — called after payment verified
app.post('/api/subscription/activate', authMiddleware, async (req, res) => {
  const { plan } = req.body;
  const expiry = new Date(); expiry.setMonth(expiry.getMonth() + 1);
  await db.query(
    `INSERT INTO subscriptions (doctor_id, plan, status, expires_at)
     VALUES ($1,$2,'active',$3)
     ON CONFLICT (doctor_id) DO UPDATE SET plan=$2, status='active', expires_at=$3`,
    [req.user.id, plan, expiry]
  );
  res.json({ success: true });
});

// ════════════════════════════════════════════════════════════
//  HEALTH CHECK
// ════════════════════════════════════════════════════════════
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.0.0', app: 'MediTreat' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`MediTreat API running on port ${PORT}`));


// ════════════════════════════════════════════════════════════
//  DATABASE SCHEMA  (run this once in PostgreSQL)
// ════════════════════════════════════════════════════════════
/*
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(200),
  clinic_name VARCHAR(100),
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'doctor',   -- doctor | receptionist | admin
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE patients (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER REFERENCES users(id),
  name VARCHAR(100),
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

CREATE TABLE queue (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER REFERENCES users(id),
  patient_id INTEGER REFERENCES patients(id),
  token_number INTEGER,
  complaint TEXT,
  triage VARCHAR(20) DEFAULT 'normal',   -- normal | urgent | emergency
  status VARCHAR(20) DEFAULT 'waiting',  -- waiting | active | done | skipped
  payment_status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  date DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER REFERENCES users(id),
  patient_id INTEGER REFERENCES patients(id),
  booking_date DATE,
  time_slot TIME,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'confirmed',
  payment_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  amount INTEGER,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE visits (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id),
  doctor_id INTEGER REFERENCES users(id),
  visit_date DATE DEFAULT CURRENT_DATE,
  complaint TEXT,
  diagnosis TEXT,
  prescription TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE clinic_settings (
  doctor_id INTEGER PRIMARY KEY REFERENCES users(id),
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
  bot_greeting TEXT,
  bot_active BOOLEAN DEFAULT TRUE,
  ai_triage BOOLEAN DEFAULT TRUE,
  followup_enabled BOOLEAN DEFAULT FALSE,
  reminder_enabled BOOLEAN DEFAULT TRUE,
  languages TEXT[] DEFAULT ARRAY['en','hi']
);

CREATE TABLE subscriptions (
  doctor_id INTEGER PRIMARY KEY REFERENCES users(id),
  plan VARCHAR(20) DEFAULT 'free',
  status VARCHAR(20) DEFAULT 'active',
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
*/
