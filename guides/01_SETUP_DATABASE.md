# 01 – Setting Up the Database
**File:** `guides/01_SETUP_DATABASE.md`

---

## What You Need
- A free Supabase account → supabase.com
- Your `.env` file open and ready

---

## Step 1 — Create Supabase Project

1. Go to **supabase.com** → Sign up (free)
2. Click **New Project**
3. Fill in:
   - Name: `meditreat`
   - Database Password: (save this, you'll need it)
   - Region: `ap-south-1` (Mumbai — best for India)
4. Click **Create Project** — wait ~2 mins

---

## Step 2 — Get Your Connection String

1. Inside your project → **Settings** (left sidebar)
2. Click **Database**
3. Scroll to **Connection String** → select **URI** tab
4. Copy the string — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abcxyz.supabase.co:5432/postgres
   ```
5. Open your `.env` file and paste:
   ```
   DATABASE_URL=postgresql://postgres:yourpassword@db.abcxyz.supabase.co:5432/postgres
   ```

---

## Step 3 — Create All Tables

### Option A — Using Supabase SQL Editor (easiest)
1. Supabase → **SQL Editor** → **New Query**
2. Open `scripts/setup-db.js` in your code editor
3. Copy everything inside the `const schema = \`...\`` block
4. Paste into Supabase SQL Editor
5. Click **Run** (▶)
6. You should see: `Success. No rows returned`

### Option B — Run the script locally
```bash
cd meditreat/
node scripts/setup-db.js
# Output: ✅ MediTreat database setup complete!
```

---

## Step 4 — Verify Tables Were Created

In Supabase → **Table Editor** — you should see:

| Table | Purpose |
|-------|---------|
| `users` | Doctor / staff accounts |
| `patients` | All patient records |
| `queue` | Today's live queue |
| `bookings` | Advance bookings |
| `payments` | Razorpay payment records |
| `visits` | Consultation history |
| `clinic_settings` | Per-doctor configuration |
| `subscriptions` | Plan info per doctor |

---

## Step 5 — Create First Doctor Account

Run this in Supabase SQL Editor to seed your first doctor:

```sql
-- First register via API (recommended) or manually:
INSERT INTO users (name, email, password_hash, clinic_name, phone, role)
VALUES (
  'Dr. Your Name',
  'doctor@yourclinic.com',
  '$2a$12$placeholder',   -- use /api/auth/register instead
  'Your Clinic Name',
  '+91 98100 XXXXX',
  'doctor'
);
```

**Better:** Use the API endpoint after backend is running:
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Dr. Sharma","email":"dr@clinic.com","password":"secret123","clinic_name":"Sharma Clinic","phone":"+91 98100 00000"}'
```

---

## Common Errors

| Error | Fix |
|-------|-----|
| `SSL required` | Add `ssl: { rejectUnauthorized: false }` in Pool config (already in server.js) |
| `relation already exists` | Tables already created — safe to ignore |
| `password authentication failed` | Double-check DATABASE_URL password |
| `ECONNREFUSED` | Wrong host in DATABASE_URL |

---

## ✅ Done!
Your database is ready. Proceed to `02_WHATSAPP_INTEGRATION.md`.
