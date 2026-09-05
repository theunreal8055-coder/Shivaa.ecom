# Shivaa · Real-SMS OTP with auto-fill — v33 step-by-step guide

**Built 31 Aug 2026 · for shivaa.in (Hostinger hPanel deploy)**

---

## 0 · What you already have (read this first — it matters)

Your codebase **already contains the complete OTP machinery**:

| Already in v31/v32 | Where |
|---|---|
| Phone-OTP login ("Shivaa Passport" — no password needed) | `js/auth.js` |
| OTP-verified account registration | `js/auth.js` + `/api/auth/register` |
| OTP-verified mobile in the jeweller KYC form | `js/app.js` + `/api/kyc/send-otp` |
| 6-digit codes, hashed storage, 5-min expiry, 5-try lockout, 30-s resend cooldown | `api.php` |

But it runs in **DEMO mode**: the code is *shown on screen* (`demo OTP: 439464`) — no SMS is ever sent. `api.php` even had a comment `// SMS gateway plug-in point` waiting for this.

**What v33 adds (this update):**

1. **Real SMS delivery** — new `sms.php` plugs into the gateway of your choice. No config → demo mode, *exactly* as before. Zero disturbance.
2. **Auto-fill of the code** — new `js/otp-autofill.js`:
   - **Android Chrome**: the SMS ends with `@shivaa.in #123456`. The browser reads it itself (WebOTP API) and fills the 6 boxes automatically — the customer just taps Verify.
   - **iPhone Safari**: every OTP input now has `autocomplete="one-time-code"`, so the code appears as a suggestion **above the keyboard** — one tap fills it.
3. **Admin panel card** — `#/admin → Settings → "SMS & OTP delivery"`: shows LIVE/DEMO status, error log, and a **Send test SMS** button.

**Files touched (all additive):** `sms.php` + `js/otp-autofill.js` (new) · `api.php` (+ gateway call at 2 spots, + 2 admin routes) · `js/auth.js`, `js/app.js`, `js/admin.js` (auto-fill wiring) · `index.html` (`?v=33` on all 7 assets). Nothing else changed. Demo behaviour is untouched until you create a config file.

---

## PART 1 · Deploy the site update (10 minutes, do this first)

Live shivaa.in is still **v27** — it doesn't even have OTP login yet. This one zip carries v28–v33.

1. **Backup**: hPanel → File Manager → select `public_html` → Compress → `backup-before-v33.zip`. (If anything looks wrong, you extract this back.)
2. **Upload**: File Manager → `public_html` → Upload `shivaa-UPDATE-v33.zip` → right-click → **Extract** → overwrite all when asked.
   - The zip contains **no `data/` and no `uploads/`** — your products, orders, reviews, db.json are physically impossible to touch. (Never upload `data/db.json` from a dev zip.)
3. Visit `shivaa.in/migrate-repair.php` **once** (it asks for the admin password) — this upgrades the DB schema after the v27→v33 jump.
4. Hard refresh: **Ctrl+Shift+R** (or Cmd+Shift+R on Mac).
5. Quick check: `shivaa.in` loads → footer shows Track/FAQ → click **Sign in → Continue with mobile** → enter your number → **Send my code**. A demo code appears in a chip on screen. That is the v33 site working in demo mode.

**Rollback at any point:** extract your backup zip back. SMS-level rollback is even easier — see PART 5.

---

## PART 2 · Choose an SMS gateway (pick ONE option)

Indian OTP SMS requires TRAI **DLT registration** for full quality (your own sender name like `SHIVAA`, delivery on DND numbers, and the auto-fill SMS line). You have two speeds:

### Option A · Fast2SMS generic OTP route — live in ~15 minutes (no DLT)
- Sign up at fast2sms.com → verify mobile + email → **add ₹100+ to the wallet in ONE transaction** (API stays locked otherwise) → complete the light **KYC: Aadhaar OTP + verify you own shivaa.in** (they give you a small file/meta-tag to place — 2 minutes in File Manager).
- Pricing: **₹0.35 per OTP SMS** on this route (₹500 ≈ 1,400 codes). A ₹5/SMS "Quick SMS" international route also exists without any KYC — do NOT use it for OTP.
- SMS arrives from a **generic sender** as `Your OTP: 439467` (their pre-approved template, delivers on DND numbers too). The `@shivaa.in #code` line is **not** included → **Android auto-read won't fire; iPhone keyboard suggestion still works.**

### Option B · MSG91 (or Fast2SMS own-template) + DLT — the proper setup, 2–7 days approval
- Sign up at msg91.com → SMS OTP product → they walk you through DLT linking.
- **Android auto-fill works** (your template can carry the `@shivaa.in #code` line), your own 6-letter sender, best delivery.
- Rough cost: DLT one-time ~₹500–1,000 + GST, SMS ~₹0.15–0.25 per OTP.

> Practical advice: **do Option A today** so real customers get codes on their phones, and **start Option B in parallel** — switch by editing one JSON file when DLT approves.

---

## PART 3 · DLT registration (only for Option B)

1. Register as a **Principal Entity** on one DLT platform (Jio TrueConnect `trueconnect.jio.in`, or Airtel/Vi/BSNL DLT) using the business PAN + GST certificate of **Ernate Shine Jewellery Private Limited**. You get a **PE/Entity ID**.
2. Add a **Header** (sender name), 6 letters: `SHIVAA`. Get it approved.
3. Add a **Content Template** — type *Service Implicit* or *Transactional*, consent-none (OTP). Paste **exactly** (two variables):

```
{#var#} is your Shivaa Jewellers verification code. It expires in 5 minutes. Never share it with anyone.
@shivaa.in #{#var#}
```

4. After approval, enter the Entity ID / Header / Template ID inside your gateway dashboard (MSG91 → Settings → DLT; Fast2SMS → DLT settings), and buy OTP credits.
5. Copy the API key → PART 4.

*If your DLT platform rejects the `@` line, approve the template without it — everything still works, Android just falls back to keyboard suggestion like iPhone. Some platforms want the line as `@shivaa.in #123456` with a fixed "123456" — register it that way and keep variable count the same.*

---

## PART 4 · Create the config file (the only "switch")

hPanel → File Manager → `public_html/data/` → **New File** → name it exactly `sms-config.json` → paste ONE of these:

**MSG91** (needs DLT template id):
```json
{ "provider": "msg91", "authkey": "YOUR_AUTHKEY", "template_id": "YOUR_TEMPLATE_ID" }
```

**Fast2SMS — generic OTP route (no DLT):**
```json
{ "provider": "fast2sms", "key": "YOUR_API_KEY" }
```

**Fast2SMS — own DLT template (full auto-fill):**
```json
{ "provider": "fast2sms", "key": "YOUR_API_KEY", "sender_id": "SHIVAA", "template_id": "TEMPLATE_ID", "entity_id": "ENTITY_ID" }
```

**Textlocal:** `{ "provider": "textlocal", "key": "…", "sender": "SHIVAA" }`
**Twilio:** `{ "provider": "twilio", "sid": "AC…", "token": "…", "from": "+1…" }`
**Any other gateway:** `{ "provider": "custom", "method": "POST", "url": "https://gateway/send?to={phone}&text={msg}", "headers": { "Authorization": "Bearer xyz" } }`

Save. **That's it — you are LIVE.** The file is instantly live on the next OTP request; no server restart, no deploy. (It can't be read from the web — `.htaccess` blocks all `.json`.)

Optional extra keys: `"message": "…{code}…"` (custom text), `"autofill": false` (drop the `@shivaa.in` line).

---

## PART 5 · Test it (2 minutes)

1. `shivaa.in/#/admin` → sign in → **Settings** → find **"SMS & OTP delivery"**.
   - Mode should say **● LIVE — real SMS via MSG91/Fast2SMS** (or DEMO if no config yet).
2. Type **your own mobile** → **Send test SMS** → the SMS should arrive in seconds.
   - If it fails, the gateway's exact error shows right there (wrong key, DLT not approved, low balance…). Fix → test again.
3. End-to-end: log out → Sign in → Continue with mobile → your number → Send my code.
   - **Android**: a "Verify your phone number" sheet pops up → tap Allow → boxes fill by themselves → Verify.
   - **iPhone**: when the SMS lands, the code sits above the keyboard → tap it.
4. Also test the KYC form (For Jewellers → apply) once — same wiring.

**Rollback (SMS only):** delete/rename `data/sms-config.json` → back to demo mode instantly, site untouched. Nothing to undo anywhere else.

---

## PART 6 · Cheat-sheet

| Question | Answer |
|---|---|
| Does OTP change my login flows? | No — same flows; codes just arrive by SMS instead of on screen |
| Where are codes stored? | `data/db.json` `otps[]` as SHA-256 hashes — never in plain text |
| Rate limits? | 30 s between sends, 5 tries per code, 5-minute expiry (unchanged) |
| Why does the SMS end with `@shivaa.in #123456`? | That's what Android Chrome matches to auto-fill (WebOTP standard) |
| Costs? | Fast2SMS OTP route ₹0.35/SMS · DLT route ₹0.11–0.25 · Quick route ₹5 (avoid) |
| Will old cached pages break? | No — assets moved to `?v=33`, browsers refetch automatically |
| Can I use WhatsApp OTP instead? | MSG91 supports a WhatsApp channel too — ask them, then use the `custom` provider with their webhook/URL |

---

## For your next chat agent (handoff addendum — v33)

- v33 = v32 (Shivaa Passport auth.js) **+ SMS delivery + OTP auto-fill**. Built from the repo's `shivaa-UPDATE-v32.zip`, tested against the v31 FULL db reference (users 3 / orders 0 / tokens 0).
- New files: `sms.php` (gateway adapters: msg91 / fast2sms / textlocal / twilio / custom, config = `data/sms-config.json`, absent → demo mode), `js/otp-autofill.js` (`window.ShivaaOtp.watch/stop/fill`, WebOTP).
- `api.php`: `shivaa_sms_send()` called in `auth/send-otp` + `kyc/send-otp` (failure → 502 generic; detail logged to `db.sms.lastErr`); new admin routes `GET /api/sms/status`, `POST /api/sms/test` (Bearer admin token).
- `index.html` assets now `?v=33` ×7 (added `/js/otp-autofill.js` between qr.js and app.js).
- Dev verify (all passed): demo devCode unchanged; live send via mock gateway `{"ok":true,"sent":true}` with `@shivaa.in #<code>` in payload; otp-login round-trip token OK; dead-gateway → 502 + lastErr visible in sms/status; unauth status → 403; node `--check` clean; `ShivaaOtp.fill` unit-passed on fake DOM.
- Zips: `deploy/shivaa-UPDATE-v33.zip` (140 files) · `deploy/shivaa-FULL-fresh-install-v33.zip` (170 files). Live still v27 until deployed (PART 1).
- Still outstanding from before: rotate the admin password; deploy v33.
