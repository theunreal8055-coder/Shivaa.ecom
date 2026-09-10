# Shivaa — why you could not reset the admin password, and the fix

**File to upload now:** `shivaa-admin-recovery-FIXED.zip` (7.4 KB) → contains one file, `admin-reset.php`.

---

## What went wrong — in plain words

The recovery file I gave you in the last update (`admin-reset.php`) **could not run at all**. PHP refused to start it because of one line placed in the wrong order — a rule in PHP that says the "strict types" line must be the very first instruction in the file, and in that file two settings lines came before it. PHP produces a **fatal error**, which on your host shows up as a **blank white page or "HTTP 500"** instead of the recovery form.

So it was not your password, not your hosting, and not your account: the file I handed you was dead on arrival. **That is my mistake, and it is fixed.** The same mistake was in the earlier rings bridge too — that one I had already caught and corrected before sending it.

**Proof (line numbers from the file I sent you):**

| Line | Before (broken) | Now |
|---|---|---|
| 1 | `<?php` | `<?php` |
| 34 | `const ENABLED = false;` ← came first | `declare(strict_types=1);` ← now first ✔ |
| 35 | `const RECOVERY_KEY = '…';` | `const ENABLED = false;` |
| 38 | `declare(strict_types=1);` ← too late → fatal | `const RECOVERY_KEY = '…';` |

The same check now runs against **every** PHP file we ship (`45/45` checks pass), so this class of mistake cannot go out again.

---

## Get back in — 5 steps, about 5 minutes

1. **File Manager** in your hosting panel → open `public_html`.
2. Right-click **`admin-reset.php`** → **Edit**, and make **two** changes near the top:
   ```php
   const ENABLED = true;                          // was false
   const RECOVERY_KEY = 'shivaa-9f4b-2c71-Jayal';  // put your own long random text here
   ```
   Save. (The file refuses the placeholder key on purpose, and it ships switched off on purpose.)
3. Upload `admin-reset.php` from the zip into **`public_html`** — the same folder that has `api.php` and `index.html`. Overwrite the old one.
4. Open **`https://shivaa.in/admin-reset.php`** in your browser.
   - First press **“Check what is wrong (changes nothing)”** — it verifies your key and then shows you the real state of the site (see the next section).
   - Then choose your account (your admin account is marked ★), type a new password twice, and press **“Set the new password”**.
5. You are in. Sign in at **https://shivaa.in/#/admin**, then **delete `admin-reset.php` from the server**. It also works only once, ever — after that it refuses.

If the page still cannot run, it will now **tell you the exact PHP error instead of going blank** — send me that red box word for word and I will fix it immediately.

---

## What the “Check what is wrong” button tells you

It reads your server — **it changes nothing** — and prints:

- **Is the update deployed?** whether `api.php` on the server contains the new `auth/reset/start` route (the "Forgot password?" feature), and whether `js/auth.js` is the updated one. If these say **MISSING**, the v46 update was never uploaded — which alone explains why the sign-in screen's reset could not do anything.
- **Is an SMS gateway configured?** whether `data/sms-config.json` exists. If it says **NOT CONFIGURED**, your site cannot text a code to anyone — so the "Forgot password?" link can never deliver one until a gateway is set up.
- **The last SMS attempt** — sent / delivered / mode / last error, so you can see a gateway failure directly.
- **Every account** with its mobile number (masked), whether it has a valid Indian mobile at all, whether the password is stored securely, and how many devices are signed in.
- **A plain verdict** at the bottom: what to do next.

That button is how we find out the real reason on your server instead of guessing. **Run it once and tell me what the verdict says.**

---

## Two things I need to flag honestly

1. **The “Forgot password?” link needs an SMS provider to work.** A site cannot text without one (in India that means MSG91 / Fast2SMS / Textlocal / Twilio plus DLT registration). If no gateway is configured, the only way in is this recovery file — and the same limitation means new customers cannot verify their phone number when registering. Tell me what the Check button says and I will tell you the cheapest way forward.
2. **Until it is configured, I found a security hole that has to be closed.** With no SMS gateway, the site currently hands the one-time code **back to whoever asks for it** — so anyone who knows a customer's mobile number or email could sign in as that customer, including you. I did not close it yet because the same code path is what lets new customers register right now; switching it off before an SMS gateway exists would block sign-ups. So I need your decision before I touch it (asking you on the next screen).

---

## Files

| File | Size | What it is |
|---|---|---|
| `shivaa-admin-recovery-FIXED.zip` | 7.4 KB | **Upload this now** — one file, `admin-reset.php`, to put in `public_html` |
| `shivaa-update-v46-password-recovery.zip` | 65 KB | The full v46 update, **rebuilt** with the fixed file (`index.html`, `api.php`, `admin-reset.php`, `js/auth.js`, `js/admin.js`) — use it if you never uploaded v46 |
| `DEPLOY-v46-PASSWORD-RECOVERY.md` | — | The original walkthrough (still valid, apart from this fix) |
| `DEPLOY-v47-ADMIN-RECOVERY-FIX.md` | — | This note |

Both zips were extract-checked byte-for-byte against the files in the project, and `devtools/qa_password_reset.py` now reports **45 passed, 0 failed** — including a new permanent check that this PHP ordering mistake can never ship again.

**Not verified by running:** there is no PHP interpreter in my sandbox, so the fixed file was validated by careful reading, by the ordering check above, and by the behaviour tests against the preview shim — not by executing it on a server. Your first click is the real test; if anything looks odd, the error box at the top of the page will now say what happened.
