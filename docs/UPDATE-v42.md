# SHIVAA · UPDATE v42 — Security hardening, bug fixes & new storefront features

**Date:** 2026-09-06 · **Files changed:** `index.html`, `api.php`, `js/app.js`,
`js/admin.js`, `css/styles.css` · **Version tags bumped:** `?v=42` (11 refs).
**Package:** `shivaa-update-v42.zip` (repo root). Overwrites only those 5 files —
never touches `data/`, `uploads/`, or prices. Rollback = re-upload v41 files.

> Audit scope: `cms/api.php` (all routes), `js/app.js`, `js/admin.js`,
> `index.html`, plus the existing `.htaccess`/`hallmark.php`/`trust.php`/`sms.php`
> posture. Reviewed as code (PHP lint via AST parser — PHP CLI not available in
> the sandbox this session) and exercised in a DOM test harness against the
> preview shim: home, PDP, rates calculator, gift assistant, recently-viewed
> rail and rate-alert modal all render with **0 console errors**.

---

## 1 · Security threats found (and what v42 does)

| # | Threat | Severity | Fix in v42 |
|---|---|---|---|
| 1 | **Public `GET /api/settings` leaked secrets.** The whole settings object was served to anonymous visitors — including `gstApi.key` (the live GST-verification API key), and anything else an admin later added (e.g. SMTP/OTP keys). Anyone could `curl /api/settings` and read it. | **High** | Non-admin GET now returns the public subset only; `gstApi` is replaced by `{configured: true/false}` and any credential-looking key is stripped. Only an authenticated admin receives the full object. |
| 2 | **Brute-force bypass + state bloat via spoofed `X-Forwarded-For`.** Login lockouts were keyed on `X-Forwarded-For`, which any direct client can forge — every attempt could present a fresh IP and dodge the 5-fail / 15-min lockout forever. | **High** | Lockout + throttles now key on `REMOTE_ADDR` only (Hostinger's proxy writes the true client there). Added a coarse per-IP cap on `/api/auth/login`. |
| 3 | **Unbounded single-file DB growth (DoS).** Every visitor could append to `tokens`, `otps`, `loginfails`, `rateAlerts`, `contactMsgs`, `serviceRequests`, `newsletter` with no cap — each write rewrites the whole `db.json`, so a small script could balloon the file and slow/stop the shop. | **High** | Central `db_housekeep()` runs on **every save**: expired tokens/OTPs are pruned, stale lockout rows dropped, and every visitor-written collection is capped (tokens 2k, otps 300, rateAlerts 800, contactMsgs 1.2k, newsletter 2.5k, serviceRequests 1k, reviews 3k). |
| 4 | **SMS-bombing vector.** `auth/send-otp` + `kyc/send-otp` had only a 30 s per-phone window — any phone number could be flooded once the gateway is live. | Medium | Added per-IP throttle (12/10 min) on both OTP senders, plus `/api/auth/register` & `/api/partners/apply` limits. |
| 5 | **Guest write endpoints unlimited** (`newsletter`, `contact`, `services`, `reviews`, `rates/alert`). | Medium | Per-IP windows added; all free-text inputs are truncated (`tcap`) and control characters stripped at the API boundary. |
| 6 | **`partners/me` data leak.** A logged-in customer *without* a partner profile silently fell back to `partners[0]` — exposing the first partner's full KYC record (GSTIN, PAN, settlements). | Medium | Removed the fallback: no `partnerId` ⇒ `404`; profile must match the caller. |
| 7 | **Weak/absent validation on writes** — OTP-free duplicate registrations of the same phone, case-sensitive newsletter duplicates, non-`https` provider URL usable in `gst-lookup` (SSRF-ish if settings ever got edited by an attacker), order "engraving"/notes stored unbounded, cart qty unbounded, password field with no upper bound (bcrypt CPU abuse on huge strings), coupon/settings keys added freely. | Medium | Phone-uniqueness on register/partner apply; newsletter dedupe is case-insensitive + idempotent; `gst-lookup` URL must start `https://`; qty capped 1–99; engraving ≤60, size ≤20; passwords 8–128 chars with early reject before `password_verify`; settings PUT is **allowlisted** (unknown keys can never be smuggled in). |
| 8 | **Order/reference IDs collided.** `SHV` + last-8-of-epoch-seconds meant two orders in the same second shared an ID (invoice/track/status update ambiguity). | Low | New `ref_id()`: prefix + `yymmdd` + 4 random hex (`SHV260906A3F2`…) for SHV/MX/CO/BL references. |
| 9 | Misc | Low | `pages?slug=` miss now returns a real 404; review rating must be 1–5 and the product must exist; rating recount only touches the affected product; profile/address/name lengths capped; live `db_save` centralised pruning keeps every route honest. |

**Retained posture (verified, unchanged):** `data/db.json`, `sms-config.json`,
`samples-payload.json` blocked from the web (`.htaccess`); `api.php` direct = 404;
magic-byte checks on every upload; hallmark/trust routes never fabricate
verification; CSP + security headers unchanged; no secrets in the package.

**Residual notes (not changed — by design / needs owner):**
- The live **admin password should be rotated** if it was ever shared (see
  `REPAIR-SITE-v37.md` action item). Keys are not in this repo.
- Clearing the saved GST API key is a deliberate API-only action (the UI now
  *keeps* the saved key when the field is left blank — it never echoes it back).
- `sms-config.json` remains **absent** until go-live; demo OTP stays on-screen.

## 2 · Bugs fixed
- Order/quote IDs could collide within the same second (above).
- Newsletter sign-up added duplicates differing only by case and re-saved the
  DB even when the address already existed.
- Rate-alert subscribe was unbounded, silently stored junk, and the toast
  claimed an email would be sent with **no delivery channel** behind it.
- Admin "Save settings" wiped the GST key whenever the (never-filled) field was
  left blank on a routine save — it now preserves the stored key.
- `partners/me` fallback leak (above).
- Settings object could grow arbitrary nested junk via PUT.

## 3 · New storefront elements & fancy features (v42)
1. **🎁 Gift Assistant** — a 30-second, 3-step finder (Who → Occasion → Budget)
   that shortlists real, live-priced pieces from the catalogue with a
   "send shortlist on WhatsApp" hand-off. Launched from a new homepage band and
   usable anywhere via `Shivaa.giftOpen()`.
2. **🧮 Live gold price calculator** on the `#/rates` page — metal/purity,
   weight slider and making-charge tier; outputs the exact metal + making + GST
   breakdown using today's Jaipur rates (same math as the PDP, honest).
3. **👀 Recently viewed rail** on every product page (device-local, up to 10).
4. **🔔 Rate-alert modal** (homepage ticker + rates page) — validated, deduped,
   throttled subscription that lands in the **admin Leads → "Rate alerts"
   panel** with a ready-to-send mailto (the desk is the real delivery channel —
   no fake "instant email" promise).
5. **Floating quick actions** — WhatsApp bubble (pulse) + back-to-top button,
   mobile-aware, above the bottom nav.
6. **SEO/social polish** — JSON-LD `JewelryStore` schema and OpenGraph/Twitter
   meta in `index.html`.

## 4 · Deploy (Hostinger — ~5 minutes)
1. hPanel → File Manager → `public_html`.
2. Upload **`shivaa-update-v42.zip`** → **Extract** (overwrites the 5 files
   listed above only).
3. Hard refresh (Ctrl+Shift+R) / private window — purge LiteSpeed cache if the
   old look persists (`hPanel → LiteSpeed Cache → Purge All`).
4. Verify:
   - View source → `?v=42` appears **11 times**.
   - `curl https://shivaa.in/api/settings` → **no** `"gstApi":{"key":…}` —
     only `"gstApi":{"configured":…}`.
   - `curl -X POST https://shivaa.in/api/rates/alert` with junk → 400/429 not
     200-with-junk.
   - Home: Gift Assistant band renders; PDP shows "Recently viewed"; rates page
     shows the calculator.
5. Rollback = re-upload the five v41 files.

## 5 · Regression evidence (this workspace)
- `node --check` clean on `js/app.js` + `js/admin.js`.
- PHP AST parse clean on `api.php`/`hallmark.php`/`trust.php`/`sms.php`.
- jsdom smoke (site JS against the preview shim): 14/14 checks passed,
  zero window errors — home gift band + CTA, FABs, gift modal walk-through
  (4 product cards out), calculator total, PDP + recently-viewed rail,
  wishlist, rate-alert modal, shop grid.
- Repository `data/db.json` untouched (demo DB ships clean; QA tests
  `test_hallmark_*` / `test_trust_*` design contract preserved — no hallmark or
  trust file changed).
