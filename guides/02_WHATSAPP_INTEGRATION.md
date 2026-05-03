# 02 – WhatsApp Business API Integration
**File:** `guides/02_WHATSAPP_INTEGRATION.md`

---

## Overview
MediTreat uses **WATI.io** as the WhatsApp Business API provider.
WATI is India-friendly, affordable, and has a sandbox for instant testing.

---

## Step 1 — Sign Up on WATI

1. Go to **wati.io** → Click **Start Free Trial**
2. Sign up with your email
3. Choose **Sandbox** plan for testing (free, instant)
4. For production: choose **Growth** plan (~₹2,500/mo for 1000 conversations)

---

## Step 2 — Get API Credentials

1. WATI Dashboard → **API** (left sidebar)
2. Copy:
   - **API Endpoint URL** → looks like `https://live-mt-server.wati.io/YOUR_ACCOUNT_ID`
   - **Access Token** → long string starting with `eyJ...`
3. Paste into `.env`:
   ```
   WATI_API_URL=https://live-mt-server.wati.io/YOUR_ACCOUNT_ID
   WATI_API_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

## Step 3 — Set Up Webhook

This tells WATI to forward patient messages to your backend.

1. WATI Dashboard → **Webhook** → **Configure**
2. Webhook URL:
   ```
   https://your-backend.railway.app/api/webhook/whatsapp
   ```
3. Click **Save**
4. Make sure your backend is deployed first (see `05_DEPLOY_BACKEND.md`)

---

## Step 4 — Test the Sandbox

WATI sandbox gives you a test WhatsApp number.

1. WATI → **Sandbox** → scan the QR code with your WhatsApp
2. Send "hello" to the sandbox number
3. Your backend should receive it and reply with the menu
4. Check Railway logs for: `Webhook received from +91XXXXXXXXXX`

---

## Step 5 — Connect a Real Business Number (Production)

1. You need a **Facebook Business Account** (business.facebook.com)
2. WATI → **Phone Numbers** → **Add Number**
3. Enter your clinic's WhatsApp number
4. Complete Facebook Business Verification (takes 2–5 days)
5. Once approved, WATI connects it automatically

**Requirements for the number:**
- Must be a valid Indian mobile number
- Cannot be used on personal WhatsApp while connected to API
- Use a dedicated SIM card for the clinic

---

## Step 6 — Create Message Templates (for outbound messages)

WhatsApp requires pre-approved templates for first messages to patients.

Go to WATI → **Template Messages** → **New Template**

Create these templates:

### Template 1: Booking Confirmation
```
Name: booking_confirmation
Body: Namaste {{1}}! Your appointment at {{2}} is confirmed for {{3}} at {{4}}. 
Advance fee: ₹{{5}}. Pay here: {{6}}
```

### Template 2: Appointment Reminder
```
Name: appointment_reminder
Body: Hi {{1}}, your appointment at {{2}} is in 1 hour ({{3}}). 
Please arrive 5 mins early. Reply 2 to check queue status.
```

### Template 3: Follow-up
```
Name: followup_message
Body: Hi {{1}}, hope you're feeling better after your visit 3 days ago. 
If symptoms persist, reply 1 to book again. - {{2}}
```

Submit each for WhatsApp approval (takes 24–48 hours).

---

## How the Bot Flow Works

```
Patient sends "Hi" on WhatsApp
         ↓
WATI receives message
         ↓
WATI POST → your webhook: /api/webhook/whatsapp
         ↓
whatsapp.js → handleMessage(phone, text)
         ↓
Session tracking (step-by-step conversation)
         ↓
AI triage if symptoms entered (ai.js)
         ↓
Booking created in database
         ↓
Payment link sent back via WATI API
```

---

## Common Errors

| Error | Fix |
|-------|-----|
| `401 Unauthorized` | Wrong WATI_API_TOKEN — regenerate in WATI dashboard |
| `Webhook not receiving` | Backend URL wrong or not deployed yet |
| `Template rejected` | Rephrase — avoid promotional language |
| `Message not delivered` | Patient hasn't messaged first (24hr window rule) |

---

## ✅ Done!
WhatsApp bot is live. Proceed to `03_RAZORPAY_PAYMENTS.md`.
