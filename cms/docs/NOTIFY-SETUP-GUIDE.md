# Shivaa · Automated WhatsApp + Email order & payment confirmations — v49 step-by-step guide

**Built 4 Sep 2026 · for shivaa.in (Hostinger hPanel deploy)**

---

## 0 · What this feature does

Customers and the shop get **instant, branded confirmations** with no staff effort:

| Event | Channel | When |
|---|---|---|
| **Order confirmed** | WhatsApp + Email | the moment an order is placed (`POST /api/orders`) |
| **Payment received** | WhatsApp + Email | the moment Razorpay payment verifies (`POST /api/payment/verify`) |
| **Status change** (Packed/Shipped/Delivered/Cancelled) | WhatsApp + Email | the moment Admin changes the order status in the dashboard |

Every message carries the order line items, totals, the **Track** link, and the **Invoice** link. It runs in two modes:

- **DEMO (default, no config):** every confirmation is still **composed and queued** in `data/db.json` → `db['notifications']`, plus a health trail in `db['notifyLog']`. You can preview the exact copy customers will get inside **Admin → 🔔 Notifications** — no gateway, no cost, no risk. **This is what you're running right now.**
- **LIVE:** add `data/notify-config.json` and the real WhatsApp/email send fires instead of queueing.

**Rollback is one file:** delete/rename `data/notify-config.json` → back to demo mode instantly. Nothing else to undo.

---

## PART 1 · See it working (demo mode — 1 minute)

1. Open `shivaa.in/#/admin` → sign in → **🔔 Notifications** tab (top nav).
   - Mode shows **● DEMO** and the four counters (Sent / Queued / Failed / Stored).
2. Click **Send test** with your email/mobile → a demo record appears in the table with the full message text.
3. Or place a real order on the store (UPI/Card) → after payment you'll see a `payment_confirmed` notification in this tab with the exact WhatsApp + email copy the customer would receive.

Nothing has been sent anywhere yet — that's the point. It's testable and reviewable before you spend a rupee on a gateway.

---

## PART 2 · Choose your email provider (pick ONE)

API keys are **stored only in `data/notify-config.json`**, which `.htaccess` blocks from the web (`Require all denied` for `*.json`). They never touch the storefront or admin code.

### Option A · Mailgun (recommended for Indian jewellery traffic)
- dashboard.mailgun.com → pick a domain you control → **Domain → SMTP/API credentials** → copy the **API key** and **sending domain**.
- Best deliverability of the free-tier providers, live in ~5 minutes.

### Option B · SendGrid
- sendgrid.com → Settings → **API Keys** → create a key (starts `SG.`). Use it with your verified sender.

### Option C · Resend
- resend.com → API Keys → create a key (starts `re_`). Modern, generous free tier, great HTML rendering.

### Option D · Server mail() (no API key)
- The host's own mailer (`From` = an address on the same hosting account, e.g. `no-reply@shivaa.in`). Zero cost, but check Hostinger's daily sending limits (typically ~200/day on shared hosting).

---

## PART 3 · Choose your WhatsApp provider (pick ONE, or skip)

### Option A · Twilio WhatsApp Sandbox (fastest free test)
- twilio.com → Messaging → **WhatsApp** → the sandbox gives you a `whatsapp:+14155238886` `From` number + a **Account SID** and **Auth Token**.
- To receive your test message, the recipient must first send `join <your-sandbox-code>` to the Twilio number. Remove this to use a paid Twilio WhatsApp number.

### Option B · Any other gateway URL (MSG91 Interakt, WATI, Gupshup, Airship…)
- Use the **custom** provider and paste their HTTP endpoint — the URL may contain `{phone}` and `{message}` placeholders and any headers/body fields you need.

> WhatsApp requires the recipient's number to be **opted-in** (they have an account/order with you). Confirmations are transactional, so you're compliant.

---

## PART 4 · Create the config file (the only "switch")

hPanel → File Manager → `public_html/data/` → **New File** → name it exactly **`notify-config.json`** → paste a template below:

### Email only (no WhatsApp yet):
```json
{
  "email": { "provider": "mailgun", "key": "key-xxxx", "domain": "mg.yourdomain.com", "from": "no-reply@shivaa.in" },
  "whatsapp": { "provider": "none" }
}
```

### Email + Twilio WhatsApp:
```json
{
  "email": { "provider": "sendgrid", "key": "SG.xxxx", "from": "no-reply@shivaa.in" },
  "whatsapp": { "provider": "twilio", "sid": "ACxxxx", "token": "xxxx", "from": "whatsapp:+14155238886" }
}
```

### Custom gateway for both (MSG91 Interakt / WATI etc.):
```json
{
  "email": { "provider": "custom", "method": "POST", "url": "https://api.example.com/send?to={email}&subject={subject}",
              "headers": { "Authorization": "Bearer xyz" },
              "body": { "to": "{email}", "subject": "{subject}", "text": "{text}" } },
  "whatsapp": { "provider": "custom", "method": "POST", "url": "https://api.example.com/wa?to={phone}",
                 "headers": { "Authorization": "Bearer xyz" },
                 "body": { "to": "{phone}", "text": "{message}" } }
}
```

### Optional top-level keys:
```json
{
  "fromName": "Shivaa Jewellers",
  "replyTo":  "care@shivaa.in",
  "domain":   "shivaa.in",
  "channels": ["whatsapp", "email"]
}
```
- `channels` lets you turn one off (e.g. `["email"]`) — default is both.
- `domain` is used for the **Track** and **Invoice** links inside every message.

Save. **That's it — you are LIVE.** No restart, no deploy. `api.php` reads the config on the next order/payment/status event.

---

## PART 5 · Test it (2 minutes)

1. `shivaa.in/#/admin` → 🔔 **Notifications** → the card should now say **● LIVE — real delivery via SENDGRID/TWILIO** (or the provider name).
2. Send a **test** to your own email + mobile.
   - Email: check the inbox (and spam) — the branded HTML order card should arrive.
   - WhatsApp: check the chat (Twilio sandbox needs the receive-side `join` first).
   - If a send fails, the gateway's exact error appears in the row → fix → test again.
3. End-to-end: complete a demo order with Cod → the `order_confirmed` notification appears as **sent** (live) or **queued** (demo).

**Rollback:** delete/rename `data/notify-config.json` → demo mode instantly, site untouched.

---

## PART 6 · Cheat-sheet

| Question | Answer |
|---|---|
| Does this change checkout? | No — orders/payments flow exactly as before; we just fire a message after success |
| Where are messages stored? | `data/db.json` → `db['notifications']` (capped at 500) + `db['notifyLog']` counters |
| What if a gateway is down? | The order/payment still succeeds; the failed send is logged with its exact error and retried the next event |
| Costs? | Email: Mailgun/SendGrid free tier · WhatsApp: Twilio per-message or your gateway's rate |
| Will old cached pages break? | No — assets moved to `?v=49`, browsers refetch automatically |
| Can I send WhatsApp only? | Set `"channels": ["whatsapp"]` (and leave email off) |
| Is the config safe from the web? | Yes — `.htaccess` denies all `.json` (same as `sms-config.json`) |

---

## For your next chat agent (handoff addendum — v49)

- **New files:** `cms/notify.php` (gateway adapters: email = mailgun/sendgrid/resend/mail/custom · whatsapp = twilio/custom · config = `data/notify-config.json`, absent → demo mode that **queues**), `cms/docs/NOTIFY-SETUP-GUIDE.md`.
- **`api.php`:** `require_once __DIR__.'/notify.php'` after `sms.php`; schema auto-heals `db['notifications']` + `db['notifyLog']`; hooks at `POST /api/orders` (event `order_confirmed`), `POST /api/payment/verify` (event `payment_confirmed`), and status-change `PUT /api/orders/{id}` (event `order_status`, only when the status actually changed); new admin routes `GET /api/notify/status`, `GET /api/notify`, `POST /api/notify/test` (Bearer admin token).
- **`js/admin.js`:** new 🔔 **Notifications** tab (nav + title + render block) showing a gateway status/test card (`ShivaaAdmin.notifCard`) and the recent-notifications log table (event, channel, recipient, subject, status/demo badge).
- **`index.html`:** assets `?v=49` ×7.
- **Dev verify (all passed):** `php-parser` (PHP 7) parse of `notify.php` + `api.php` clean; Node mirror of `shivaa_notify_build()` + queueing validated for `order_confirmed`, `payment_confirmed`, `order_status` (Delivered), COD-without-contact (0 channels), and the 500-record cap. Live sends route through `shivaa_notify_email()` / `shivaa_notify_whatsapp()` returning `['ok','mode','provider','error','response']` — exact mirrors of the `sms.php` shape. Gateway errors are captured per-record (never crash the order) and surfaced in the admin log.
