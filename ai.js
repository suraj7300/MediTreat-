// ============================================================
//  MEDITREAT AI MODULE  —  ai.js
//  Powered by Anthropic Claude API
//  All AI features: triage, summaries, prescriptions, insights
// ============================================================

const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL  = 'claude-sonnet-4-20250514';

// ── BASE CALLER ──────────────────────────────────────────────
async function ask(systemPrompt, userContent, maxTokens = 500) {
  const res = await claude.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }]
  });
  return res.content[0].text;
}

// ════════════════════════════════════════════════════════════
//  1. SYMPTOM TRIAGE
//     Classifies patient symptoms as normal / urgent / emergency
//     Used by WhatsApp bot before booking
// ════════════════════════════════════════════════════════════
async function analyzeSymptoms(complaint) {
  const system = `
You are a medical triage assistant for a general physician clinic in India.
Classify the patient's symptoms into one of three levels:
  - normal    : routine illness, can wait for a scheduled appointment
  - urgent    : needs to be seen today (high fever, persistent vomiting, severe pain)
  - emergency : life-threatening — must go to emergency room NOW

Respond ONLY with valid JSON. No explanation, no markdown.
Format: { "level": "normal|urgent|emergency", "note": "one brief sentence for patient" }
`;
  try {
    const raw = await ask(system, `Patient complaint: "${complaint}"`);
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { level: 'normal', note: '' };
  }
}

// ════════════════════════════════════════════════════════════
//  2. PATIENT SUMMARY
//     Generates a pre-consultation briefing for the doctor
//     Shown in the Live Queue patient panel
// ════════════════════════════════════════════════════════════
async function generatePatientSummary(patient, visits) {
  const system = `
You are an AI medical assistant for a doctor in India.
Generate a brief pre-consultation summary (3-4 sentences max) for the doctor
before they see the patient. Be clinical, concise, and highlight:
  - Recurring patterns or chronic issues
  - Relevant past prescriptions
  - Any allergy or risk flags
  - Today's complaint in context of history
Do NOT suggest diagnosis. This is a briefing only.
`;
  const visitHistory = visits.slice(0, 5).map(v =>
    `Date: ${v.visit_date}, Complaint: ${v.complaint}, Diagnosis: ${v.diagnosis || 'N/A'}, Rx: ${v.prescription || 'N/A'}`
  ).join('\n');

  const userContent = `
Patient: ${patient.name}, Age: ${patient.age}, Gender: ${patient.gender}
Allergies: ${patient.allergies || 'None known'}
Blood Group: ${patient.blood_group || 'Unknown'}
Total visits: ${patient.total_visits}

Visit history (recent first):
${visitHistory || 'No previous visits'}

Today's complaint: ${patient.current_complaint || 'Not specified'}
`;
  try {
    return await ask(system, userContent, 300);
  } catch (e) {
    return 'Unable to generate AI summary. Please review patient records manually.';
  }
}

// ════════════════════════════════════════════════════════════
//  3. PRESCRIPTION ASSISTANT
//     Suggests common medicines based on complaint + diagnosis
//     Doctor MUST review and approve before use
// ════════════════════════════════════════════════════════════
async function suggestPrescription(complaint, diagnosis, patientAge, allergies) {
  const system = `
You are a clinical decision support assistant for a general physician in India.
Suggest a basic prescription for common outpatient conditions.
Rules:
  - Only suggest medicines available OTC or commonly prescribed in India
  - Check for common allergy conflicts
  - Include dosage, frequency, duration
  - Add 1-2 lifestyle/diet tips
  - Add "⚠️ Doctor must review before prescribing" disclaimer always
  - Do NOT suggest for emergency or serious conditions
  
Respond in clean plain text, no markdown. Keep it short (under 150 words).
`;
  const userContent = `
Patient age: ${patientAge}
Allergies: ${allergies || 'None'}
Complaint: ${complaint}
Diagnosis (doctor input): ${diagnosis}
`;
  try {
    return await ask(system, userContent, 300);
  } catch (e) {
    return 'Unable to generate prescription suggestion.';
  }
}

// ════════════════════════════════════════════════════════════
//  4. DAILY CLINIC INSIGHT
//     AI summary shown at top of doctor dashboard every morning
// ════════════════════════════════════════════════════════════
async function generateDailyInsight(todayData) {
  const system = `
You are an AI analytics assistant for a medical clinic.
Given today's clinic data, generate a helpful morning briefing for the doctor.
Keep it under 4 sentences. Be practical and actionable.
Mention: patient volume trends, common ailments, any urgent flags,
and one suggestion to improve clinic flow today.
`;
  const userContent = JSON.stringify(todayData);
  try {
    return await ask(system, userContent, 200);
  } catch (e) {
    return 'AI insight unavailable. Have a great clinic day!';
  }
}

// ════════════════════════════════════════════════════════════
//  5. WHATSAPP FAQ RESPONDER
//     Answers patient questions intelligently on WhatsApp
//     Falls back to menu if question is unrecognized
// ════════════════════════════════════════════════════════════
async function answerFAQ(question, clinicInfo) {
  const system = `
You are a helpful WhatsApp assistant for ${clinicInfo.clinic_name || 'a medical clinic'} in India.
Answer the patient's question based on the clinic info provided.
Keep answers SHORT (under 60 words). Be friendly and clear.
If you cannot answer from the provided info, say:
"For this, please call us at ${clinicInfo.phone || 'the clinic'}."

Clinic info:
${JSON.stringify(clinicInfo)}
`;
  try {
    return await ask(system, question, 150);
  } catch (e) {
    return `For this query, please call the clinic directly. We're happy to help!`;
  }
}

// ════════════════════════════════════════════════════════════
//  6. MULTILINGUAL MESSAGE TRANSLATOR
//     Translates bot messages to Hindi or other languages
// ════════════════════════════════════════════════════════════
async function translateMessage(text, language = 'Hindi') {
  const system = `Translate the following WhatsApp message to ${language}.
Keep the same tone — friendly and helpful. Preserve *bold* formatting.
Return only the translated text, nothing else.`;
  try {
    return await ask(system, text, 300);
  } catch {
    return text; // fallback to English
  }
}

// ════════════════════════════════════════════════════════════
//  7. DEMAND FORECASTING
//     Predicts busy days based on historical + seasonal data
// ════════════════════════════════════════════════════════════
async function forecastDemand(historicalData, currentMonth) {
  const system = `
You are a healthcare analytics AI for a clinic in India.
Based on historical patient footfall data and the current month,
predict which days of the coming week will be busiest and why.
Give practical advice the doctor can act on (e.g. schedule extra staff, block slots).
Respond in 3-5 bullet points. Plain text, no markdown headers.
`;
  const userContent = `Month: ${currentMonth}\nHistorical data: ${JSON.stringify(historicalData)}`;
  try {
    return await ask(system, userContent, 250);
  } catch {
    return 'Forecast unavailable.';
  }
}

// ════════════════════════════════════════════════════════════
//  EXPRESS ROUTES — mount on your server.js
// ════════════════════════════════════════════════════════════
module.exports = (app, db, authMiddleware) => {

  // POST /api/ai/triage
  app.post('/api/ai/triage', authMiddleware, async (req, res) => {
    const { complaint } = req.body;
    const result = await analyzeSymptoms(complaint);
    res.json(result);
  });

  // POST /api/ai/patient-summary
  app.post('/api/ai/patient-summary', authMiddleware, async (req, res) => {
    const { patient_id, current_complaint } = req.body;
    const p = await db.query('SELECT * FROM patients WHERE id=$1 AND doctor_id=$2', [patient_id, req.user.id]);
    const v = await db.query('SELECT * FROM visits WHERE patient_id=$1 ORDER BY visit_date DESC LIMIT 5', [patient_id]);
    if (!p.rows[0]) return res.status(404).json({ error: 'Patient not found' });
    const summary = await generatePatientSummary({ ...p.rows[0], current_complaint }, v.rows);
    res.json({ summary });
  });

  // POST /api/ai/prescription
  app.post('/api/ai/prescription', authMiddleware, requireRole('doctor'), async (req, res) => {
    const { complaint, diagnosis, patient_age, allergies } = req.body;
    const suggestion = await suggestPrescription(complaint, diagnosis, patient_age, allergies);
    res.json({ suggestion });
  });

  // GET /api/ai/daily-insight
  app.get('/api/ai/daily-insight', authMiddleware, async (req, res) => {
    const stats = await db.query(
      `SELECT COUNT(*) as total,
       COUNT(*) FILTER (WHERE triage='urgent') as urgent,
       COUNT(*) FILTER (WHERE status='waiting') as waiting,
       array_agg(DISTINCT complaint) as complaints
       FROM queue WHERE doctor_id=$1 AND date=CURRENT_DATE`,
      [req.user.id]
    );
    const insight = await generateDailyInsight(stats.rows[0]);
    res.json({ insight });
  });

  // POST /api/ai/forecast
  app.post('/api/ai/forecast', authMiddleware, async (req, res) => {
    const history = await db.query(
      `SELECT date, COUNT(*) as patients FROM queue WHERE doctor_id=$1
       AND date >= CURRENT_DATE - 30 GROUP BY date ORDER BY date`,
      [req.user.id]
    );
    const month = new Date().toLocaleString('en-IN', { month: 'long' });
    const forecast = await forecastDemand(history.rows, month);
    res.json({ forecast });
  });

  // POST /api/ai/faq
  app.post('/api/ai/faq', async (req, res) => {
    const { question, doctor_id } = req.body;
    const s = await db.query('SELECT * FROM clinic_settings WHERE doctor_id=$1', [doctor_id]);
    const answer = await answerFAQ(question, s.rows[0] || {});
    res.json({ answer });
  });
};

// Export functions for use in whatsapp.js
module.exports.analyzeSymptoms      = analyzeSymptoms;
module.exports.generatePatientSummary = generatePatientSummary;
module.exports.translateMessage     = translateMessage;
module.exports.answerFAQ            = answerFAQ;

// ── requireRole helper (used above) ─────────────────────────
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role))
      return res.status(403).json({ error: 'Access denied' });
    next();
  };
}
