# 03 – Razorpay Payment Integration
**File:** `guides/03_RAZORPAY_PAYMENTS.md`

---

## Step 1 — Create Razorpay Account
1. Go to **razorpay.com** → Sign Up
2. Use your clinic's business email
3. Dashboard opens in **Test Mode** by default (safe to experiment)

## Step 2 — Get API Keys
1. Razorpay Dashboard → **Settings** → **API Keys**
2. Click **Generate Test Key**
3. Copy **Key ID** and **Key Secret**
4. Paste into `.env`:
   ```
   RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
   RAZORPAY_KEY_SECRET=your_secret_key_here
   ```

## Step 3 — Complete KYC (for Live Payments)
1. Dashboard → **Account & Settings** → **Business Information**
2. Upload any ONE of:
   - Clinic Registration Certificate
   - GST Certificate
   - Shop & Establishment Certificate
3. KYC approval: **1–3 business days**
4. After approval, generate **Live Keys** and replace test keys in `.env`

## Step 4 — Set Up Webhook
1. Razorpay → **Settings** → **Webhooks** → **Add New Webhook**
2. URL: `https://your-backend.railway.app/api/payments/verify`
3. Secret: any random string (save it — add to `.env` as `RAZORPAY_WEBHOOK_SECRET`)
4. Events to select: `payment.captured`, `payment.failed`

## Step 5 — Test a Payment
1. Open `public/pay.html` in browser
2. Use test card: `4111 1111 1111 1111`, expiry `12/25`, CVV `123`
3. Check Razorpay dashboard → Transactions — should appear
4. Check your DB `payments` table — status should be `paid`

## Pricing
- No monthly fee
- **2% per transaction** (domestic cards/UPI)
- UPI payments: often 0% for amounts under ₹2,000

---

---

# 04 – Claude AI Setup
**File:** `guides/04_CLAUDE_AI_SETUP.md`

---

## Step 1 — Get API Key
1. Go to **console.anthropic.com**
2. Sign up → Verify email
3. **API Keys** → **Create Key** → name it `meditreat-prod`
4. Copy the key (shown only once!)
5. Paste into `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXXXX
   ```

## Step 2 — Free Credits
- New accounts get **$5 free credits** — enough for ~500 AI calls
- Sufficient for testing all 7 AI features

## Step 3 — Add Billing for Production
1. Console → **Billing** → Add credit card
2. Set a **spending limit** (e.g. $20/month) to avoid surprises
3. Estimated cost for 50 clinics: ~$30–50/month

## AI Features in MediTreat (all in ai.js)

| Function | When Called | Tokens Used |
|----------|------------|-------------|
| `analyzeSymptoms()` | Patient enters complaint on WhatsApp | ~200 |
| `generatePatientSummary()` | Doctor opens patient in queue | ~300 |
| `suggestPrescription()` | Doctor clicks "AI Suggest" | ~300 |
| `generateDailyInsight()` | Dashboard loads each morning | ~200 |
| `answerFAQ()` | Patient asks question on WhatsApp | ~150 |
| `translateMessage()` | Patient selects Hindi mode | ~200 |
| `forecastDemand()` | Analytics page loads | ~250 |

## Step 4 — Test AI Locally
```bash
node -e "
  require('dotenv').config();
  const { analyzeSymptoms } = require('./ai');
  analyzeSymptoms('chest pain and difficulty breathing').then(console.log);
"
# Expected: { level: 'urgent', note: 'Chest pain may indicate...' }
```

---

---

# 05 – Deploy Backend on Railway
**File:** `guides/05_DEPLOY_BACKEND.md`

---

## Step 1 — Push Code to GitHub
```bash
# In your meditreat/ folder:
git init
echo "node_modules/" >> .gitignore
echo ".env" >> .gitignore
git add .
git commit -m "MediTreat backend initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/meditreat-backend.git
git push -u origin main
```

## Step 2 — Deploy on Railway
1. Go to **railway.app** → Sign in with GitHub
2. **New Project** → **Deploy from GitHub Repo**
3. Select `meditreat-backend`
4. Railway auto-detects Node.js → builds automatically

## Step 3 — Add Environment Variables
1. Railway → your project → **Variables** tab
2. Click **+ New Variable** for EACH line in your `.env`:
   ```
   DATABASE_URL = postgresql://...
   JWT_SECRET = your_secret
   ANTHROPIC_API_KEY = sk-ant-...
   WATI_API_URL = https://...
   WATI_API_TOKEN = eyJ...
   RAZORPAY_KEY_ID = rzp_live_...
   RAZORPAY_KEY_SECRET = ...
   PORT = 4000
   FRONTEND_URL = https://meditreat.vercel.app
   ```
3. Railway auto-restarts after adding variables

## Step 4 — Get Your Backend URL
1. Railway → your project → **Settings** → **Domains**
2. Click **Generate Domain**
3. You get: `https://meditreat-backend-production.up.railway.app`
4. Save this — it's your `BACKEND_URL`

## Step 5 — Verify Deployment
```bash
curl https://your-railway-url.railway.app/api/health
# Response: {"status":"ok","version":"1.0.0","app":"MediTreat"}
```

## Step 6 — View Logs
Railway → your project → **Deployments** → click latest → **View Logs**
You should see:
```
MediTreat API running on port 4000
[CRON] All cron jobs started ✅
```

---

---

# 06 – Deploy Frontend on Vercel
**File:** `guides/06_DEPLOY_FRONTEND.md`

---

## Option A — Deploy HTML Dashboard (Quickest, 5 mins)

1. Go to **vercel.com** → Sign up with GitHub
2. **New Project** → **Upload** (drag and drop)
3. Upload the `public/` folder (contains `index.html` and `pay.html`)
4. Click **Deploy**
5. You get URL: `https://meditreat.vercel.app`

**Update the API URL inside `index.html`:**
Find this line and update it:
```javascript
const BASE = 'https://YOUR-RAILWAY-URL.railway.app/api';
```

---

## Option B — Deploy React App (Full Version)

### Setup React project:
```bash
npx create-react-app meditreat-frontend
cd meditreat-frontend
npm install react-router-dom
```

### Copy your files:
```
Copy all .jsx files into src/
Copy api.js into src/
```

### Add environment variable:
Create `.env` in `meditreat-frontend/`:
```
REACT_APP_API_URL=https://your-railway-url.railway.app/api
```

### Deploy to Vercel:
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Or via GitHub:
1. Push `meditreat-frontend` to GitHub
2. Vercel → New Project → select repo
3. Add `REACT_APP_API_URL` in Vercel Environment Variables
4. Click Deploy

---

## Update CORS in server.js

Make sure your backend allows the Vercel frontend URL:
```javascript
// In server.js — replace:
app.use(cors());

// With:
app.use(cors({
  origin: [
    'https://meditreat.vercel.app',
    'https://meditreat.in',
    'http://localhost:3000'
  ]
}));
```

Redeploy backend after this change.

---

---

# 07 – Domain and SSL Setup
**File:** `guides/07_DOMAIN_AND_SSL.md`

---

## Step 1 — Buy Your Domain
1. Go to **godaddy.com** or **namecheap.com**
2. Search for `meditreat.in` (~₹600/yr)
3. Purchase it

## Step 2 — Connect Domain to Vercel (Frontend)
1. Vercel → your project → **Settings** → **Domains**
2. Click **Add Domain** → type `meditreat.in`
3. Vercel shows you DNS records to add:
   ```
   Type: A     Name: @      Value: 76.76.19.19
   Type: CNAME Name: www    Value: cname.vercel-dns.com
   ```
4. Go to GoDaddy → **DNS Management** → add these records
5. Wait 15–30 mins → Vercel shows **Valid Configuration**
6. SSL certificate issued automatically ✅

## Step 3 — Connect Subdomain to Railway (Backend)
1. Railway → project → **Settings** → **Custom Domain**
2. Add: `api.meditreat.in`
3. Railway gives you a CNAME target, e.g.: `xyz.railway.app`
4. GoDaddy DNS → Add:
   ```
   Type: CNAME  Name: api   Value: xyz.railway.app
   ```
5. Wait 15–30 mins → Railway shows domain active

## Step 4 — Update All URLs
After domain is live, update in Railway environment variables:
```
FRONTEND_URL = https://meditreat.in
BACKEND_URL  = https://api.meditreat.in
```

And update `REACT_APP_API_URL` in Vercel:
```
REACT_APP_API_URL = https://api.meditreat.in/api
```

---

---

# 08 – Full Integration Map
**File:** `guides/08_FULL_INTEGRATION_MAP.md`

---

## How All Services Connect

```
┌─────────────────────────────────────────────────────────────┐
│                    PATIENT JOURNEY                          │
└─────────────────────────────────────────────────────────────┘

Patient WhatsApp (+91 XXXXX)
         │
         ▼
   WATI.io Server
   (WhatsApp API)
         │  POST /api/webhook/whatsapp
         ▼
┌─────────────────────────┐
│   server.js             │   ← Railway.app
│   (Express API)         │
│   port 4000             │
└──────────┬──────────────┘
           │
    ┌──────┴──────────────────────┐
    │                             │
    ▼                             ▼
whatsapp.js                    ai.js
(Bot logic)               (Claude API)
    │                             │
    │  Book appointment           │  Analyze symptoms
    │  Show slots                 │  Generate summary
    │  Send payment link          │  Suggest prescription
    │                             │
    └──────────┬──────────────────┘
               │
               ▼
      PostgreSQL Database
         (Supabase)
               │
    ┌──────────┴──────────────┐
    │                         │
    ▼                         ▼
Patient pays             Doctor sees update
pay.html                 on Dashboard
(Razorpay)              (index.html / React)
    │                         │
    ▼                         │
/api/payments/verify          │
    │                         │
    └──────────►──────────────┘
         Booking confirmed
         in database


┌─────────────────────────────────────────────────────────────┐
│                    DOCTOR JOURNEY                           │
└─────────────────────────────────────────────────────────────┘

Doctor opens meditreat.in
         │
         ▼
  Login (JWT token)
         │
         ▼
  Dashboard (React/HTML)
         │
   ┌─────┴──────────────────────────────┐
   │             │             │        │
   ▼             ▼             ▼        ▼
Queue         Bookings     Patients  Analytics
/api/queue   /api/bookings  /api/    /api/analytics
/today                     patients  /summary
   │
   ▼
Click patient
   │
   ▼
/api/ai/patient-summary
(Claude generates briefing)
   │
   ▼
Doctor consults → adds notes
   │
   ▼
/api/queue/:id/status → "done"
   │
   ▼
Patient visit saved to DB
Follow-up scheduled (cron.js)
```

## Environment Variable Flow

```
.env file
   │
   ├─► Railway Variables ──► server.js, whatsapp.js, ai.js, cron.js
   │
   ├─► Vercel Variables ───► React frontend (REACT_APP_API_URL)
   │
   └─► Local .env ─────────► Development testing
```

---

---

# 09 – Launch Checklist
**File:** `guides/09_LAUNCH_CHECKLIST.md`

---

## Pre-Launch Technical Checklist

### Database
- [ ] Supabase project created
- [ ] All 8 tables created (run `setup-db.js`)
- [ ] `DATABASE_URL` added to Railway variables
- [ ] First doctor account created via `/api/auth/register`

### Backend
- [ ] `server.js` deployed on Railway
- [ ] All `.env` variables added to Railway dashboard
- [ ] `/api/health` returns `{"status":"ok"}`
- [ ] CORS updated with your Vercel/domain URL
- [ ] Cron jobs showing in Railway logs

### WhatsApp
- [ ] WATI account created
- [ ] `WATI_API_URL` and `WATI_API_TOKEN` in `.env`
- [ ] Webhook URL set in WATI dashboard
- [ ] Sandbox tested — bot replies to "hello"
- [ ] Templates submitted for approval (reminder, confirmation, follow-up)

### Payments
- [ ] Razorpay account created
- [ ] KYC completed (for live payments)
- [ ] Test payment successful on `pay.html`
- [ ] Razorpay webhook URL set
- [ ] `payments` table shows `paid` after test

### AI
- [ ] Anthropic API key added to `.env`
- [ ] `analyzeSymptoms()` tested locally
- [ ] Patient summary generates on Queue page
- [ ] Daily insight shows on Dashboard

### Frontend
- [ ] `index.html` or React app deployed on Vercel
- [ ] API URL updated to Railway backend URL
- [ ] Login works with doctor credentials
- [ ] All 8 pages load correctly

### Domain (Optional but recommended)
- [ ] Domain purchased (meditreat.in)
- [ ] DNS records added in GoDaddy
- [ ] Vercel shows Valid Configuration
- [ ] Railway custom domain active
- [ ] SSL certificate issued (auto)
- [ ] All env URLs updated to new domain

---

## Pre-Launch Business Checklist

- [ ] WhatsApp Business number dedicated for clinic
- [ ] Clinic settings filled in (Settings page)
- [ ] Slot timing configured (9am–8pm etc.)
- [ ] Consultation fee and advance fee set
- [ ] Bot greeting message customized
- [ ] Staff accounts created (receptionist role)
- [ ] Test end-to-end with 2–3 known patients
- [ ] Doctor has reviewed AI summary feature
- [ ] Backup contact number added for emergencies

---

## Go-Live Day Steps

1. Switch Razorpay from Test to **Live keys**
2. Update `.env` and Railway variables with live keys
3. Send WhatsApp message to clinic number from patient phone — confirm flow works
4. Add clinic to Google Maps (free visibility)
5. Print a QR code linking to your WhatsApp number for the clinic waiting room
6. Announce to existing patients via SMS or WhatsApp broadcast

---

## 🎉 You're Live!

**Support contacts if something breaks:**
| Service | Help |
|---------|------|
| Railway (backend down) | help.railway.app |
| Vercel (frontend down) | vercel.com/support |
| WATI (WhatsApp not working) | support@wati.io |
| Razorpay (payment issue) | razorpay.com/support |
| Supabase (DB issue) | supabase.com/support |
| Claude AI (AI not replying) | console.anthropic.com |

---

## Monthly Maintenance

- [ ] Check Railway usage (stay within free tier or upgrade)
- [ ] Review Anthropic API costs in console
- [ ] Backup database monthly (Supabase → Backups)
- [ ] Check WhatsApp template message approvals
- [ ] Review analytics for insights
- [ ] Collect doctor feedback → plan next features
