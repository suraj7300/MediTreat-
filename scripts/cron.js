// ============================================================
//  MEDITREAT — scripts/cron.js
//  Automated reminders + follow-ups
//  Auto-started from server.js
// ============================================================

const cron = require('node-cron');

module.exports = function startCronJobs(db) {

  // ── Every hour: send appointment reminders ───────────────
  cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Running reminder job...');
    try {
      const { sendMessage } = require('../whatsapp');
      const upcoming = await db.query(`
        SELECT b.id, b.time_slot, p.phone, p.name,
               cs.clinic_name, cs.address
        FROM bookings b
        JOIN patients p  ON b.patient_id = p.id
        LEFT JOIN clinic_settings cs ON cs.doctor_id = b.doctor_id
        WHERE b.booking_date = CURRENT_DATE
          AND b.time_slot BETWEEN NOW() + INTERVAL '55 minutes'
                              AND NOW() + INTERVAL '65 minutes'
          AND b.status = 'confirmed'
          AND b.reminder_sent IS NOT TRUE
      `);

      for (const b of upcoming.rows) {
        await sendMessage(b.phone,
          `⏰ *Appointment Reminder*\n\n` +
          `Hi *${b.name}*, your appointment at *${b.clinic_name || 'the clinic'}* ` +
          `is in *1 hour* at ${b.time_slot}.\n` +
          `📍 ${b.address || ''}\n\n` +
          `_Reply *2* to check your queue status._`
        );
        await db.query(
          `UPDATE bookings SET reminder_sent = TRUE WHERE id = $1`,
          [b.id]
        );
      }
      console.log(`[CRON] Sent ${upcoming.rows.length} reminders`);
    } catch (e) {
      console.error('[CRON] Reminder error:', e.message);
    }
  });

  // ── Every day at 9am: send follow-ups ────────────────────
  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Running follow-up job...');
    try {
      const { sendMessage } = require('../whatsapp');
      const clinics = await db.query(
        `SELECT doctor_id, clinic_name FROM clinic_settings WHERE followup_enabled = TRUE`
      );

      for (const s of clinics.rows) {
        const patients = await db.query(`
          SELECT DISTINCT p.name, p.phone, v.complaint
          FROM visits v
          JOIN patients p ON v.patient_id = p.id
          WHERE v.doctor_id = $1
            AND v.visit_date = CURRENT_DATE - 3
            AND p.id NOT IN (
              SELECT patient_id FROM queue
              WHERE doctor_id = $1 AND date > v.visit_date
            )
        `, [s.doctor_id]);

        for (const p of patients.rows) {
          await sendMessage(p.phone,
            `🌡️ *Follow-up from ${s.clinic_name || 'Your Clinic'}*\n\n` +
            `Hi *${p.name}*, hope you're feeling better after your visit 3 days ago.\n` +
            `_(${p.complaint})_\n\n` +
            `If symptoms persist, type *1* to book another appointment.\n` +
            `_Stay healthy! 💊_`
          );
        }
        console.log(`[CRON] Sent ${patients.rows.length} follow-ups for clinic ${s.doctor_id}`);
      }
    } catch (e) {
      console.error('[CRON] Follow-up error:', e.message);
    }
  });

  console.log('[CRON] All cron jobs started ✅');
};
