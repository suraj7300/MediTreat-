# 🏥 MediTreat — AI-Powered Medical Dispensary Management

> Smart Queue. Happy Patients. Healthier Practice.

MediTreat is a full-stack SaaS platform for small/medium medical dispensaries in India.  
Patients interact via **WhatsApp**, doctors manage everything via a **web dashboard**, powered by **Claude AI**.

---

## 📁 Project Structure

```
meditreat/
├── .env.example              ← Credentials template
├── .gitignore
├── package.json              ← Backend dependencies
├── server.js                 ← Express REST API
├── whatsapp.js               ← WhatsApp bot engine
├── ai.js                     ← Claude AI features
├── scripts/
│   ├── setup-db.js           ← Creates all DB tables (run once)
│   └── cron.js               ← Reminders + follow-up scheduler
├── public/
│   ├── index.html            ← Full dashboard UI
│   └── pay.html              ← Patient payment page
├── frontend/                 ← React app (full version)
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── App.jsx
│       ├── api.js
│       ├── context/AuthContext.jsx
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Dashboard.jsx
│       │   ├── Queue.jsx
│       │   ├── Bookings.jsx
│       │   ├── Patients.jsx
│       │   ├── Analytics.jsx
│       │   ├── WhatsAppBot.jsx
│       │   ├── Settings.jsx
│       │   └── Billing.jsx
│       └── components/
│           ├── Sidebar.jsx
│           └── Topbar.jsx
└── guides/
    ├── 01_SETUP_DATABASE.md
    ├── 02_WHATSAPP_INTEGRATION.md
    ├── 03_RAZORPAY_PAYMENTS.md
    ├── 04_CLAUDE_AI_SETUP.md
    ├── 05_DEPLOY_BACKEND.md
    ├── 06_DEPLOY_FRONTEND.md
    ├── 07_DOMAIN_AND_SSL.md
    ├── 08_FULL_INTEGRATION_MAP.md
    └── 09_LAUNCH_CHECKLIST.md
```

---

## ⚡ Quick Start (Local)

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/meditreat.git
cd meditreat

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Fill in your credentials in .env

# 4. Create database tables (run once)
node scripts/setup-db.js

# 5. Start backend
npm run dev
# API running at http://localhost:4000

# 6. Open dashboard
open public/index.html
```

---

## 🔑 Required Credentials

| Service | Sign Up | Purpose |
|---------|---------|---------|
| Supabase | supabase.com | PostgreSQL database |
| WATI | wati.io | WhatsApp Business API |
| Razorpay | razorpay.com | Payments |
| Anthropic | console.anthropic.com | Claude AI |

---

## 🚀 Deployment

| Part | Platform | Cost |
|------|----------|------|
| Backend (`server.js`) | Railway.app | Free tier |
| Frontend (`public/`) | Vercel | Free |
| Database | Supabase | Free tier |

Follow step-by-step guides in the `guides/` folder.

---

## 💳 Subscription Plans

| Plan | Price | Patients/mo |
|------|-------|-------------|
| Starter | ₹999/mo | 100 |
| Growth | ₹2,499/mo | 500 |
| Pro | ₹4,999/mo | Unlimited |

---

## 🤖 AI Features (Powered by Claude)

- Symptom triage (normal / urgent / emergency)
- Pre-consultation patient summary for doctor
- Prescription suggestions
- Daily clinic insight
- WhatsApp FAQ bot
- Demand forecasting
- Hindi/multilingual translation

---

## 📞 Tech Stack

`Node.js` · `Express` · `PostgreSQL` · `React` · `Claude API` · `WhatsApp Business API` · `Razorpay`
