# Shivaa — codes now go by email (v48)

**Upload:** `shivaa-update-v48-email-codes.zip` (168 KB, 10 files + the `js/` folder) → extract into **`public_html`**, keeping the folder structure.

This one zip contains **everything** — including the v46 update you told me you never uploaded. So it is the only update you need to do.

---

## What this changes

One-time codes (the 6 digits for sign-in, sign-up, partner KYC and password reset) are now **emailed to the account's own address** instead of relying on an SMS gateway you do not have.

| Before | Now |
|---|---|
| No SMS gateway → the site printed the code **on the screen for whoever asked** | The code is emailed to the address **on the account** and never appears in the browser |
| Anyone who knew a customer's mobile number or email could sign in as them | Without mailbox access, the code is useless |
| "Forgot password?" could not text anybody | "Forgot password?" emails you the code |
| New customers could not verify a phone number | The code goes to the email address they type in the form |

**This closes a real security hole.** With no gateway configured, the old code path handed the one-time code back to the caller — and `auth/otp-login` then signed that caller in as the account owner. That is now gone: the code is only ever sent to the address on the account (or, for a brand-new registration, the address being typed into the form at that moment).

**After this update, always try the normal route first:** the **“Forgot password?”** link on the sign-in screen. It emails you a 6-digit code, valid 5 minutes. The recovery file `admin-reset.php` stays as the emergency door for when email itself fails.

---

## Order of work (do it in this order)

1. **Get back in first** — upload `shivaa-admin-recovery-FIXED.zip`'s file, arm it, set your password, then delete it. *(Details in `DEPLOY-v47-ADMIN-RECOVERY-FIX.md`.)*
2. **Then upload this update** — extract `shivaa-update-v48-email-codes.zip` into `public_html` (File Manager → upload the zip → right-click → Extract).
3. **Then test that email delivery works.** In the admin dashboard open the **Settings** tab → the **SMS / code delivery** card → type your email in the new box → **Send test code**. You should get an email within a minute.
   - **If it says it was sent but nothing arrives, check the spam folder.** If it never arrives at all, tell me — your host may need a proper SMTP account, and I will set that up (the card shows the exact error the server gave).
4. **Then test the real thing:** sign out, press **“Forgot password?”**, enter your admin email and set a new password by email.
5. Delete the leftover v46 zip if you have it — this update supersedes it.

---

## What is in the zip

| File | What it does |
|---|---|
| `api.php` | The whole backend. New: codes are emailed (`otp_deliver`), the code is never returned to the browser, `POST /api/mail/test` for the dashboard, and the 30-second + 5-per-hour limits stay. |
| `mail.php` | **New file.** Sends the code with your host's mail service. Works with no configuration; optional `data/mail-config.json` lets you set the From address/subject. |
| `sms.php`, `hallmark.php`, `trust.php` | Required by `api.php` — included so the upload cannot half-break the site. |
| `index.html` | Cache-busts the scripts (`?v=48`) so customers get the new code. |
| `js/auth.js`, `js/app.js`, `js/admin.js` | Say where the code was sent ("Code sent to r•••@example.com"), pass the typed email during sign-up, and add the **Send test code** button. |
| `admin-reset.php` | The fixed break-glass file (v47), disarmed as always. |

**Do not upload `data/db.json`** — it is deliberately not in this zip, because that would overwrite your live orders and customers.

---

## Things to know

- **Email address is now required to receive a code.** If someone starts sign-up and leaves the email box blank, the site tells them to add it. That is expected — it is the only channel available until an SMS gateway exists.
- **Anti-abuse:** a single connection can request at most 12 codes an hour, so the site cannot be used as an email relay.
- **The 30-second and 5-per-hour limits per account are unchanged.** So is the rule that a successful reset signs out every old session.
- **Want SMS as well, later?** Create `data/sms-config.json` with a gateway (MSG91 / Fast2SMS / Textlocal / Twilio — see `docs/OTP-SETUP-GUIDE.md`). The moment it exists and accepts a message, the site uses SMS first and keeps email as the fallback. Nothing else to change.
- **My dev preview** is the only place a code is still shown on screen; that is a preview convenience and has no equivalent on your live site.

---

## Verified / not verified

- **Verified by reading and by tests:** `devtools/qa_password_reset.py` → **53 passed, 0 failed**. New assertions include *"api.php never returns the one-time code to the caller"*, *"all three code-sending routes go through `otp_deliver()`"*, the email module's ordering/header-injection/code-format guards, and the per-connection cap. The zip was extract-checked byte-for-byte against the project files.
- **Not verified:** there is no PHP interpreter in my sandbox, so `mail()` itself has never run here — email delivery depends on your host, which is exactly what step 3 tests. If the host refuses, the dashboard card will show the reason and we go to SMTP.
- The email body never contains anything except the 6-digit code and a "you can ignore this" line. The code is valid 5 minutes, one use, and 5 wrong tries invalidate it.
