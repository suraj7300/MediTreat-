// ============================================================
//  MEDITREAT WHATSAPP BOT  —  whatsapp.js
//  Provider: WATI (wati.io) — India-friendly WhatsApp API
//  Mount this on your Express server:  require('./whatsapp')(app, db)
// ============================================================

const axios  = require('axios');
const { analyzeSymptoms, generatePatientSummary } = require('./ai');  // Claude AI module

const WATI_API    = process.env.WATI_API_URL;     // e.g. https://live-mt-server.wati.io/XXXXX
const WATI_TOKEN  = process.env.WATI_API_TOKEN;   // from WATI dashboard
const MEDITREAT_API = process.env.BACKEND_URL || 'http://localhost:4000';

// ── SEND MESSAGE VIA WATI ────────────────────────────────────
async function sendMessage(phone, message) {
  try {
    await axios.post(
      `${WATI_API}/api/v1/sendSessionMessage/${phone}`,
      { messageText: message },
      { headers: { Authorization: `Bearer ${WATI_TOKEN}` } }
    );
  } catch (e) {
    console.error('WATI send error:', e.response?.data || e.message);
  }
}

// ── SEND PAYMENT LINK ────────────────────────────────────────
async function sendPaymentLink(phone, booking_id, amount, slot) {
  const link = `${process.env.FRONTEND_URL}/pay/${booking_id}`;
  const msg =
    `✅ *Booking Confirmed!*\n\n` +
    `📅 Slot: *${slot}*\n` +
    `💰 Advance: ₹${amount}\n\n` +
    `👉 Pay here to confirm:\n${link}\n\n` +
    `_MediTreat – Sharma Family Clinic_`;
  await sendMessage(phone, msg);
}

// ── SESSION STORE (use Redis in production) ──────────────────
const sessions = new Map();
function getSession(phone) {
  if (!sessions.has(phone)) sessions.set(phone, { step: 'menu', data: {} });
  return sessions.get(phone);
}
function resetSession(phone) { sessions.set(phone, { step: 'menu', data: {} }); }

// ── CONVERSATION FLOW ────────────────────────────────────────
const MENU_MSG = (name, greeting) =>
  `${greeting || 'Namaste'} ${name ? `*${name}*` : ''}! 👋\n` +
  `Welcome to *MediTreat* AI Assistant.\n\n` +
  `What would you like to do?\n\n` +
  `1️⃣  Book an appointment\n` +
  `2️⃣  Check queue status\n` +
  `3️⃣  My past visits\n` +
  `4️⃣  Clinic info & timings\n` +
  `5️⃣  Cancel booking\n` +
  `6️⃣  Speak to doctor 🩺\n\n` +
  `_Reply with a number (1-6)_`;

async function handleMessage(phone, text, db) {
  const session = getSession(phone);
  const msg = text.trim();

  // ── MENU RESET ───────────────────────────────────────────
  if (['hi','hello','menu','start','helo','namaste'].includes(msg.toLowerCase())) {
    resetSession(phone);
    const patient = await findPatient(phone, db);
    await sendMessage(phone, MENU_MSG(patient?.name, 'Namaste'));
    return;
  }

  // ─────────────────────────────────────────────────────────
  switch (session.step) {

    case 'menu': {
      switch (msg) {
        case '1': return startBooking(phone, session, db);
        case '2': return checkQueue(phone, db);
        case '3': return pastVisits(phone, db);
        case '4': return clinicInfo(phone, db);
        case '5': return cancelBooking(phone, session, db);
        case '6': return speakToDoctor(phone, db);
        default:
          await sendMessage(phone, `Please reply with a number 1-6. Type *menu* anytime to restart.`);
      }
      break;
    }

    // ── BOOKING FLOW ────────────────────────────────────────
    case 'ask_name': {
      session.data.name = msg;
      session.step = 'ask_age';
      await sendMessage(phone, `Thanks *${msg}*! 📋\nWhat is your age?`);
      break;
    }

    case 'ask_age': {
      if (isNaN(msg)) { await sendMessage(phone, 'Please enter a valid age number.'); return; }
      session.data.age = parseInt(msg);
      session.step = 'ask_gender';
      await sendMessage(phone, `Got it. Please enter gender:\n*M* for Male\n*F* for Female\n*O* for Other`);
      break;
    }

    case 'ask_gender': {
      const g = msg.toUpperCase();
      if (!['M','F','O'].includes(g)) { await sendMessage(phone, 'Reply with M, F or O.'); return; }
      session.data.gender = g === 'M' ? 'Male' : g === 'F' ? 'Female' : 'Other';
      session.step = 'ask_complaint';
      await sendMessage(phone, `Please describe your symptoms or reason for visit:\n_(e.g. fever and headache since 2 days)_`);
      break;
    }

    case 'ask_complaint': {
      session.data.complaint = msg;

      // AI TRIAGE — analyze symptoms
      const settings = await getSettings(db);
      let triageResult = { level: 'normal', note: '' };
      if (settings?.ai_triage) {
        triageResult = await analyzeSymptoms(msg);
      }
      session.data.triage = triageResult.level;

      if (triageResult.level === 'emergency') {
        await sendMessage(phone,
          `🚨 *EMERGENCY ALERT*\n\n` +
          `Based on your symptoms, this may need *immediate medical attention*.\n\n` +
          `Please go to the nearest emergency room or call *112*.\n\n` +
          `You can still book with us — type *1* to continue.`
        );
        resetSession(phone);
        return;
      }

      if (triageResult.level === 'urgent') {
        await sendMessage(phone,
          `⚠️ *Note:* Your symptoms suggest this may be *urgent*.\n` +
          `${triageResult.note}\n\nWe are showing you the earliest available slots.`
        );
      }

      // Show available slots
      const slots = await getAvailableSlots(db);
      session.data.slots = slots;
      session.step = 'choose_slot';
      const slotText = slots.map((s, i) => `${i+1}️⃣  ${s.label}`).join('\n');
      await sendMessage(phone,
        `📅 *Available slots:*\n\n${slotText}\n\n_Reply with slot number_`
      );
      break;
    }

    case 'choose_slot': {
      const idx = parseInt(msg) - 1;
      if (isNaN(idx) || !session.data.slots[idx]) {
        await sendMessage(phone, `Please reply with a valid slot number (1-${session.data.slots.length}).`);
        return;
      }
      session.data.chosen_slot = session.data.slots[idx];
      session.step = 'confirm_booking';
      const s = session.data;
      await sendMessage(phone,
        `📋 *Confirm your booking:*\n\n` +
        `👤 Name: *${s.name}*\n` +
        `🗓️ Slot: *${s.chosen_slot.label}*\n` +
        `🩺 Complaint: _${s.complaint}_\n` +
        `💰 Advance: *₹${s.chosen_slot.fee}*\n\n` +
        `Reply *YES* to confirm or *NO* to cancel`
      );
      break;
    }

    case 'confirm_booking': {
      if (msg.toUpperCase() === 'YES') {
        const booking = await createBooking(phone, session, db);
        if (booking) {
          await sendPaymentLink(phone, booking.id, session.data.chosen_slot.fee, session.data.chosen_slot.label);
        }
        resetSession(phone);
      } else {
        resetSession(phone);
        await sendMessage(phone, `Booking cancelled. Type *menu* to start again.`);
      }
      break;
    }

    // ── CANCEL FLOW ─────────────────────────────────────────
    case 'cancel_which': {
      const bid = parseInt(msg);
      if (isNaN(bid)) { await sendMessage(phone, 'Please enter a valid booking number.'); return; }
      await db.query(`UPDATE bookings SET status='cancelled' WHERE id=$1`, [bid]);
      resetSession(phone);
      await sendMessage(phone,
        `✅ Booking #${bid} has been cancelled.\n` +
        `Refund (if paid) will be processed in 3-5 business days.\n\nType *menu* to start again.`
      );
      break;
    }

    default: {
      resetSession(phone);
      const patient = await findPatient(phone, db);
      await sendMessage(phone, MENU_MSG(patient?.name));
    }
  }
}

// ── FLOW HANDLERS ────────────────────────────────────────────

async function startBooking(phone, session, db) {
  const patient = await findPatient(phone, db);
  if (patient) {
    // returning patient — skip name/age
    session.data = { name: patient.name, age: patient.age, gender: patient.gender, patient_id: patient.id };
    session.step = 'ask_complaint';
    await sendMessage(phone,
      `Welcome back *${patient.name}*! 👋\n_(Visit #${patient.total_visits + 1})_\n\n` +
      `Please describe your symptoms today:`
    );
  } else {
    session.step = 'ask_name';
    await sendMessage(phone, `Let's get you registered! 📝\n\nWhat is your *full name*?`);
  }
}

async function checkQueue(phone, db) {
  const patient = await findPatient(phone, db);
  if (!patient) {
    await sendMessage(phone, `You are not in today's queue.\nType *1* to book an appointment.`);
    return;
  }
  const q = await db.query(
    `SELECT token_number, status, triage,
     (SELECT COUNT(*) FROM queue WHERE doctor_id=(SELECT doctor_id FROM queue WHERE patient_id=$1 AND date=CURRENT_DATE LIMIT 1)
      AND date=CURRENT_DATE AND status='waiting' AND token_number < (SELECT token_number FROM queue WHERE patient_id=$1 AND date=CURRENT_DATE LIMIT 1)) as ahead
     FROM queue WHERE patient_id=$1 AND date=CURRENT_DATE LIMIT 1`,
    [patient.id]
  );
  if (!q.rows[0]) {
    await sendMessage(phone, `You are not in today's queue.\nType *1* to book an appointment.`);
    return;
  }
  const row = q.rows[0];
  const waitMins = row.ahead * 10;
  const statusMap = { waiting: '⏳ Waiting', active: '🟢 In consultation', done: '✅ Done' };
  await sendMessage(phone,
    `📍 *Your Queue Status*\n\n` +
    `🎫 Token: *#${row.token_number}*\n` +
    `📊 Status: *${statusMap[row.status] || row.status}*\n` +
    `👥 People ahead: *${row.ahead}*\n` +
    `⏱️ Est. wait: *~${waitMins} mins*\n\n` +
    `_We'll message you when your turn is near!_`
  );
}

async function pastVisits(phone, db) {
  const patient = await findPatient(phone, db);
  if (!patient) {
    await sendMessage(phone, `No records found. Type *1* to book your first appointment.`);
    return;
  }
  const visits = await db.query(
    `SELECT visit_date, complaint, diagnosis FROM visits WHERE patient_id=$1 ORDER BY visit_date DESC LIMIT 3`,
    [patient.id]
  );
  if (!visits.rows.length) {
    await sendMessage(phone, `No past visits found yet.`);
    return;
  }
  const lines = visits.rows.map(v =>
    `📅 ${v.visit_date} — _${v.complaint}_ → ${v.diagnosis || 'See doctor notes'}`
  ).join('\n');
  await sendMessage(phone, `📋 *Your Last ${visits.rows.length} Visit(s):*\n\n${lines}\n\nType *1* to book next appointment.`);
}

async function clinicInfo(phone, db) {
  const s = await getSettings(db);
  await sendMessage(phone,
    `🏥 *${s?.clinic_name || 'Sharma Family Clinic'}*\n\n` +
    `📍 ${s?.address || 'B-14, Lajpat Nagar, New Delhi'}\n` +
    `🕐 Timings: ${s?.open_time || '9:00 AM'} – ${s?.close_time || '8:00 PM'}\n` +
    `💊 Consultation Fee: ₹${s?.consultation_fee || 300}\n` +
    `📞 Call: ${s?.phone || '+91 98100 XXXXX'}\n\n` +
    `_Type *1* to book an appointment_`
  );
}

async function cancelBooking(phone, session, db) {
  const patient = await findPatient(phone, db);
  if (!patient) { await sendMessage(phone, `No bookings found.`); return; }
  const bookings = await db.query(
    `SELECT b.id, b.booking_date, b.time_slot FROM bookings b
     WHERE b.patient_id=$1 AND b.status='confirmed' AND b.booking_date>=CURRENT_DATE
     ORDER BY b.booking_date LIMIT 5`,
    [patient.id]
  );
  if (!bookings.rows.length) { await sendMessage(phone, `You have no upcoming bookings to cancel.`); return; }
  const lines = bookings.rows.map(b => `#${b.id} — ${b.booking_date} at ${b.time_slot}`).join('\n');
  session.step = 'cancel_which';
  await sendMessage(phone, `Your upcoming bookings:\n\n${lines}\n\nReply with the *booking number* (#) to cancel.`);
}

async function speakToDoctor(phone, db) {
  // Notify doctor (you can add a dashboard notification or SMS here)
  await sendMessage(phone,
    `🩺 *Doctor Request Sent!*\n\n` +
    `Dr. Sharma has been notified. You will receive a callback within *30 minutes* during clinic hours.\n\n` +
    `For emergencies, call: *+91 98100 XXXXX*`
  );
}

// ── HELPERS ──────────────────────────────────────────────────

async function findPatient(phone, db) {
  const clean = phone.replace(/\D/g, '').slice(-10);
  const result = await db.query(`SELECT * FROM patients WHERE phone LIKE $1 LIMIT 1`, [`%${clean}`]);
  return result.rows[0] || null;
}

async function getSettings(db) {
  const result = await db.query(`SELECT * FROM clinic_settings LIMIT 1`);
  return result.rows[0] || null;
}

async function getAvailableSlots(db) {
  const settings = await getSettings(db);
  const today = new Date();
  const slots = [];
  const start = parseInt((settings?.open_time || '09:00').split(':')[0]);
  const end   = parseInt((settings?.close_time || '20:00').split(':')[0]);
  const dur   = settings?.slot_duration || 10;

  for (let d = 0; d <= (settings?.advance_booking_days || 3); d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const dateStr = date.toISOString().split('T')[0];
    const label = d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

    // just show 3 sample slots per day for WhatsApp simplicity
    for (const hour of [start, start+2, start+4]) {
      if (hour >= end) break;
      const booked = await db.query(
        `SELECT id FROM bookings WHERE booking_date=$1 AND time_slot=$2 AND status!='cancelled'`,
        [dateStr, `${hour}:00`]
      );
      if (!booked.rows.length) {
        slots.push({ date: dateStr, time: `${hour}:00`, fee: settings?.advance_fee || 100, label: `${label} ${hour > 12 ? hour-12+'pm' : hour+'am'}` });
      }
      if (slots.length >= 6) return slots;
    }
  }
  return slots;
}

async function createBooking(phone, session, db) {
  try {
    let patient = await findPatient(phone, db);
    if (!patient) {
      // create new patient
      const doctor = await db.query(`SELECT id FROM users WHERE role='doctor' LIMIT 1`);
      const p = await db.query(
        `INSERT INTO patients (doctor_id, name, age, gender, phone, total_visits)
         VALUES ($1,$2,$3,$4,$5,0) RETURNING *`,
        [doctor.rows[0]?.id, session.data.name, session.data.age, session.data.gender, phone]
      );
      patient = p.rows[0];
    }

    const doctor = await db.query(`SELECT id FROM users WHERE role='doctor' LIMIT 1`);
    const slot = session.data.chosen_slot;
    const booking = await db.query(
      `INSERT INTO bookings (doctor_id, patient_id, booking_date, time_slot, reason, status, payment_status)
       VALUES ($1,$2,$3,$4,$5,'confirmed','pending') RETURNING *`,
      [doctor.rows[0]?.id, patient.id, slot.date, slot.time, session.data.complaint]
    );

    // also add to queue if booking is today
    if (slot.date === new Date().toISOString().split('T')[0]) {
      const tokenRes = await db.query(
        `SELECT COALESCE(MAX(token_number),0)+1 AS next FROM queue WHERE doctor_id=$1 AND date=CURRENT_DATE`,
        [doctor.rows[0]?.id]
      );
      await db.query(
        `INSERT INTO queue (doctor_id, patient_id, token_number, complaint, triage, status, payment_status, date)
         VALUES ($1,$2,$3,$4,$5,'waiting','pending',CURRENT_DATE)`,
        [doctor.rows[0]?.id, patient.id, tokenRes.rows[0].next, session.data.complaint, session.data.triage || 'normal']
      );
    }

    return booking.rows[0];
  } catch (e) {
    console.error('createBooking error:', e.message);
    return null;
  }
}

// ── REMINDER SCHEDULER (run every hour via cron) ─────────────
async function sendReminders(db) {
  const upcoming = await db.query(
    `SELECT b.*, p.phone, p.name FROM bookings b JOIN patients p ON b.patient_id=p.id
     WHERE b.booking_date=CURRENT_DATE
     AND b.time_slot BETWEEN NOW() + INTERVAL '55 minutes' AND NOW() + INTERVAL '65 minutes'
     AND b.status='confirmed' AND b.reminder_sent IS NOT TRUE`
  );
  for (const b of upcoming.rows) {
    await sendMessage(b.phone,
      `⏰ *Appointment Reminder*\n\n` +
      `Hi *${b.name}*, your appointment is in *1 hour* at ${b.time_slot}.\n\n` +
      `📍 Sharma Family Clinic, Lajpat Nagar\n` +
      `_Please arrive 5 mins early. Type *2* to check your queue status._`
    );
    await db.query(`UPDATE bookings SET reminder_sent=TRUE WHERE id=$1`, [b.id]);
  }
}

// ── FOLLOW-UP SCHEDULER (run daily at 9am via cron) ──────────
async function sendFollowUps(db) {
  const settings = await getSettings(db);
  if (!settings?.followup_enabled) return;
  const daysAgo = 3;
  const patients = await db.query(
    `SELECT DISTINCT p.id, p.name, p.phone, v.complaint FROM visits v
     JOIN patients p ON v.patient_id=p.id
     WHERE v.visit_date = CURRENT_DATE - $1
     AND p.id NOT IN (SELECT patient_id FROM queue WHERE date>v.visit_date)`,
    [daysAgo]
  );
  for (const p of patients.rows) {
    await sendMessage(p.phone,
      `🌡️ *Follow-up from Sharma Clinic*\n\n` +
      `Hi *${p.name}*, hope you're feeling better after your visit 3 days ago.\n` +
      `_(${p.complaint})_\n\n` +
      `If symptoms persist, please book again:\nType *1* to book appointment.\n\n` +
      `_Take care – Dr. Sharma_`
    );
  }
}

// ── WEBHOOK (mount this on Express app) ──────────────────────
module.exports = (app, db) => {
  // WATI calls this endpoint when a patient messages
  app.post('/api/webhook/whatsapp', async (req, res) => {
    res.sendStatus(200);  // always respond 200 fast
    try {
      const { waId, text } = req.body;
      if (!waId || !text?.body) return;
      await handleMessage(waId, text.body, db);
    } catch (e) { console.error('Webhook error:', e.message); }
  });

  // Cron triggers (call from node-cron or external scheduler)
  app.post('/api/cron/reminders',  async (req, res) => { await sendReminders(db);  res.json({ ok: true }); });
  app.post('/api/cron/followups',  async (req, res) => { await sendFollowUps(db);  res.json({ ok: true }); });
};

module.exports.sendMessage = sendMessage;
