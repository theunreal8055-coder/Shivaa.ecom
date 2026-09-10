# DEPLOY · v46 — Admin password recovery (the lockout fix)

**Update file:** `shivaa-update-v46-password-recovery.zip` (5 files)
**Why:** there was no way to recover a password anywhere on the site. Only a
*signed-in admin* could set another user's password — so if the admin password
was lost, the dashboard was unreachable with no way back. Three recovery doors
now exist.

---

## 1. What is in the zip

| File | Goes to | What it does |
|---|---|---|
| `index.html` | `public_html/index.html` | cache-busts `auth.js` → `?v=45`, `admin.js` → `?v=45` |
| `js/auth.js` | `public_html/js/auth.js` | "Forgot password?" now a **real reset flow** (email → SMS code → new password) |
| `js/admin.js` | `public_html/js/admin.js` | admin **Security card**: change your own password + recent security events |
| `api.php` | `public_html/api.php` | new endpoints `auth/reset/start`, `auth/reset/confirm`, `auth/change-password`, `admin/security-log` (+ fixes a session bug, see §5) |
| `admin-reset.php` | `public_html/admin-reset.php` | **break-glass file** for when SMS is impossible — ships DISARMED |

Upload all five, keeping the `js/` folder structure.

## 2. The three ways back in

**Door 1 — normal (use this first).** Sign-in screen → **Forgot password?** →
enter `admin@shivaa.in` → a 6-digit code goes to the mobile registered on the
account (**+91 89050 05921**) → set the new password. Works for admin, partner
and customer accounts. Nothing is revealed about which emails exist.

> If SMS is in **demo mode** (no gateway configured in `data/sms-config.json`),
> the code is shown on screen instead of being texted — the field appears under
> the code boxes.

**Door 2 — you are already signed in.** Admin → **Overview → 🔐 My sign-in
password** → change it with the current one. Other devices are signed out; the
one you are using stays in.

**Door 3 — break-glass, when the phone/SIM is gone.** `admin-reset.php`.

### Using door 3 safely

1. In cPanel → File Manager, open `admin-reset.php` and change these two lines:
   ```php
   const ENABLED = false;                      // ← set to true
   const RECOVERY_KEY = 'CHANGE-THIS-KEY-123'; // ← your own long random key
   ```
   **The file refuses to work with the placeholder key — that is deliberate.**
2. Upload it next to `api.php` (usually `public_html/`).
3. Open `https://shivaa.in/admin-reset.php`, pick the account, set the new
   password.
4. **Delete `admin-reset.php` from the server.** It works exactly once, but it
   already refuses the placeholder key and will refuse after its first use;
   deleting it removes the door entirely.

⚠ Anyone who can read that file can reset the admin password. Set your own key,
upload it only while locked out, delete it straight after.

## 3. Fail-safes now in the code

- The reset code is stored **hashed**, **expires in 5 minutes**, dies after
  **5 wrong tries**, and resend is limited to **1 per 30 s / 5 per hour per email**.
- Unknown email → **identical reply** to a known one (no account discovery).
- A successful reset **revokes every existing session** for that account, so a
  stolen session cannot survive the reset. (Door 2 keeps only the current one.)
- All events are written to the database `securityLog` **with role + IP** and
  shown in the admin **Recent security events** card.
- No password is ever revealed or emailed — only replaced.
- To switch off SMS resets entirely: set `"otpReset": false` in the `settings`
  object of `data/db.json`; the API then points you to door 3.

## 4. Verify after upload

1. `https://shivaa.in/` loads; sign-in sheet still opens.
2. Sign-in → **Forgot password?** → your admin email → code arrives → set a new
   password → sign in at `/#/admin`.
3. Admin → Overview shows **🔐 My sign-in password** and **Recent security
   events** listing that reset, with the session count it signed out.
4. If you used door 3, confirm `admin-reset.php` is **gone** from the server.

## 5. Bug fixed while in here (please note)

`PUT /api/admin/users/{id}/password` (the "Password" button in the Customers
list) intended to end one user's sessions but rebuilt the whole token table with
`array_values()`, which **signed out every user on the site** — and left the
token map in a state where no stored session could ever match again. Tokens are
keyed by the token string; that route (and all three recovery doors) now rebuild
the map key-for-key. Covered by a QA assertion so it cannot come back.

## 6. QA run before shipping

- `devtools/qa_password_reset.py` — **42/42 pass**: static audit of the guards
  above, plus a behavioural run against the preview shim covering
  generic-no-enumeration, rate limits, wrong/short input, expired/used codes,
  session revocation, old-password rejection, change-password semantics and the
  admin gate.
- `node --check` clean on `auth.js`, `admin.js`, `app.js`.
- Zip extract-checked byte-identical to the source tree.

*(`devtools/` — the preview shim and QA scripts — is development-only and is
gitignored: it is never part of a deploy zip and is not reachable on the live
site.)*
