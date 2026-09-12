# Shivaa update **v85** — login fix + real SMS (APITxT)

This is a focused hotfix on top of v84 (it includes everything in v84).

## 1. New customers could not finish signing up (root cause fixed)

**The bug, in plain words:** the sign-in sheet asks every visitor for mobile
+ OTP. For a *new* mobile the code correctly verified, but the server marked
that one-time code **already used a moment before noticing no account
existed**. The next step (name / date of birth / city) then always failed
with *"Verify your phone with OTP first"* — the "Create my account" button
appeared dead for every new customer. Returning customers were unaffected.

**The fix (api.php, `auth/otp-login`):** the account is now looked up
*before* the code is consumed:
- existing mobile → code consumed once, token issued (unchanged),
- new mobile → code stays "verified, unconsumed" for the one-time personal
  details form; `/auth/register` then burns it exactly once when the
  account is created. Retry/replay protection is unchanged.

Verified by a new end-to-end jsdom test that drives the real Passport
sheet (number → code → details → welcome) for both new and returning
visitors: **12/12 green**. Full static suite: **165/165 green**.

## 2. Real OTP SMS via APITxT (your `apitxt.com` account)

`sms.php` now has a native **apitxt** provider
(`POST https://apitxt.com/api/sendOTP`, form fields `authkey`,
`mobile=91xxxxxxxxxx`, `otp`, `country=91`; success =
`{"status":"success", …}`). Optional `channel` (`whatsapp`/`voice`) and
`template_id` (your DLT template) are supported.

### One-time activation (2 minutes in File Manager)
1. hPanel → File Manager → `public_html` → open the **`data`** folder
   (create it if it isn't there — same folder where `db.json` lives).
2. Create file **`sms-config.json`** with exactly:

   ```json
   { "provider": "apitxt", "authkey": "PASTE-YOUR-FULL-APITXT-AUTH-KEY" }
   ```

   The key is the one shown at apitxt.com → **API Keys** (the eye icon
   reveals the full "Shivaa otp" key). The file is blocked from the web by
   the existing `.htaccess` rule (`*.json → Require all denied`).
3. Admin → **Settings → SMS** (or the SMS panel) → **Send test code** to
   your own mobile. You should receive a real SMS within a few seconds.
4. Delete or rename `sms-config.json` any time to instantly return to
   email/demo mode.

Notes:
- Without a `template_id`, APITxT uses its system OTP template (works
  immediately; ₹0.22–0.30 per SMS as of today). Your own approved DLT
  template is only needed if you want the exact Shivaa wording / Android
  one-tap autofill footer — add `"template_id": <id>` then.
- Rate limits are already in place (30 s between sends, 8/hour per number,
  14/hour per connection), matching APITxT's own 3/minute limit.
- With SMS live, new customers receive their code even without an email —
  this was the other half of "no button works".

## 3. Completeness

This package also carries the other JavaScript and CSS files the page
actually loads (`auth.js`, `otp-autofill.js`, `qr.js`, `hallmark.js`,
`trust.js`, and the six CSS files). Earlier update zips only contained the
three main scripts; if any of these were missing or stale on the host the
login sheet could render without its logic or styles — every referenced
asset is now included so `public_html` matches the tested build.

## Deploy
Unzip over `public_html`, overwrite, then create `data/sms-config.json` as
above. `db.json`, `data/` contents, uploads and images are not in the zip.
Rollback: keep and re-extract v84.
