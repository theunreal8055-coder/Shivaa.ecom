# Shivaa update **v86** — fifth security sweep (payment doors, dashboard integrity, privacy erasure, coupon logic)

Cumulative update on top of v85 (real APITxT OTP) and v84. Only **`api.php`**
contains code changes; every JS/CSS asset is repacked unchanged so the zip is
still a safe full "upload-and-overwrite" package. No service-worker/cache
bump is needed because no front-end file changed.

**Tests:** static audit suite **v86: 193/193 green** (includes every v81–v85
assertion); PHP bracket lint PASS; functional jsdom suites v83 19/19,
v84 13/13, v85 login 12/12, board + v80 all green.

---

## 1. A cancelled order could still be paid (three doors closed)

A customer with an old checkout open — or someone replaying a captured
request — could still hit the payment endpoints for an order the shop had
**Cancelled**. Consequences ranged from a confusing UPI payment against a
dead order to a flood of Razorpay gateway orders and payment-proof
screenshots. All three payment doors now refuse cancelled orders up front:

- `POST /api/pay/order` → *"This order was cancelled — please place a new
  order."*, **and** a per-customer cap of 60 payment-order creations per
  hour (`payorder-u`), so a scripted checkout cannot flood Razorpay or the
  manual proof queue.
- `POST /api/pay/verify` → *"This order was cancelled — no payment can be
  applied to it."* (checked before the HMAC/gateway logic).
- `POST /api/pay/proof` (UPI screenshot upload) → *"This order was
  cancelled — no payment proof can be attached."* (checked before rate
  limits and file handling).

The COD-confirm route already had this guard from v84.

## 2. Dashboard no longer counts cancelled orders as revenue

`GET /api/admin/stats` summed **every** order including cancelled ones, so
the owner dashboard's revenue, day-by-day chart and average order value
were inflated after any cancellation. Revenue and the by-day chart now
use a `$liveOrders` filter (status ≠ `Cancelled`), and AOV divides by the
live-order count. The headline "orders" counter deliberately still shows
**total order volume** (cancellations are operations data worth seeing).

## 3. "Delete my data" now erases more (privacy / DPDP)

The admin anonymise tool (`POST /api/admin/user-data/{q}/anonymize`)
scrubbed name/email/phone but left direct identifiers behind. It now also:

- refuses a **partner** account (suspend partners from the B2B screen, so
  the B2B ledger never loses its counterparty),
- empties saved **addresses**, replaces the personal **profile** with
  `{erased:true}`, empties the **wishlist**, removes **referralCode /
  referredBy** linkage,
- **revokes every saved login session/token** for the account.

Name/email/phone scrubbing, admin-account refusal and the audit log entry
are unchanged.

## 4. Coupon creation: real booleans and a real expiry date

Creating a coupon (`POST /api/admin/coupons`, admin-only) copied the raw
`oncePerUser`, `forNewUsers`, `active` and `expiresAt` fields from the
request:

- The JS admin sends the boolean `false` as the **string** `"false"`,
  which is *truthy* under PHP's `!empty()` — a coupon unticked "active /
  once per customer / new customers only" could be saved **on**. All
  three flags are now coerced against an explicit truthy set
  (`true, "true", 1, "1"`), defaulting to safe values.
- A malformed `expiresAt` made `strtotime()` return `false`, so the
  coupon **never expired**. Expiry is now validated (400 on junk) and
  bounded to 40 characters; `forUser` is bounded to 40 characters.

The coupon value/min-order clamps and code whitelist from earlier
releases are unchanged, and checkout-side enforcement of these flags was
already server-side in v84.

---

## Areas re-audited this sweep and found already solid

(no change needed — listed so the coverage is honest)

- `jout()` always terminates execution; rate-limit table self-trims
  (4,000 → 3,000 keys).
- Rate endpoints: `rates/refresh` admin-gated; `rates/override` bounded
  to a sane range; `rates/alert` public-rate-limited with email/phone
  validation.
- Bullion: `tick` approved-partner-gated; cash/RTGS quotes bounded;
  status updates admin-only with character whitelists.
- Razorpay verify: `hash_equals` HMAC, gateway order id must be the one
  this server issued for that exact order, payment-id idempotency.
- Reports accept only strict `YYYY-MM-DD` and compare ISO-style.
- Trust page is GET/read-only; contest (Bhai Dooj finale) is
  server-scored, one entry per user, 5 attempts/day IST, with order
  ownership / paid / non-cancelled / qualifying-weight checks.
- Service worker is network-first and bypasses `/api/`, `/data/`,
  `/uploads/`; bullion-news RSS links must begin `http(s)://`.
- Password reset start/confirm are purpose-bound to the email+number,
  codes are single-use, and a successful reset revokes all sessions.
- All route inventory (~110 state-changing routes) re-checked for auth
  gates: admin routes call `need_admin`, customer routes resolve the
  token and verify ownership; public doors are rate-limited.
- Upload sinks (pay proofs, review photos, catalogs, design images)
  verify magic bytes, force safe extensions and use random server-side
  filenames; no `eval`/`unserialize`/`create_function`, no user-driven
  redirect headers anywhere.
- Public settings projection recursively strips every secret-shaped key
  (the APITxT key lives only in `data/sms-config.json`, never in db.json).

## Honest caveat

No website can be promised 100% unhackable. This sweep closes the concrete
logic gaps above and re-verifies the rest of the attack surface with
automated tests, but a determined attacker, a stolen admin password, or a
Hostinger platform compromise remain outside application-level control.
Keep the APITxT auth key and admin password private, and keep the
automatic database backups working.

---

## Deploy (same as every round — ~3 minutes, zero downtime risk)

1. In hPanel File Manager go to `public_html`.
2. Upload **`shivaa-update-v86.zip`**, extract it here, choose
   **overwrite** when asked.
3. **Do not delete or touch `data/`** — `db.json` (orders/customers) and
   `sms-config.json` (your live OTP key) are not in the zip and stay
   exactly as they are.
4. Hard-refresh the site once (Ctrl+F5). No service-worker update is
   needed; only server-side code changed.
5. Quick smoke test: sign in with OTP, open the admin dashboard (revenue
   number looks right), and try opening checkout on an order you cancel —
   it should refuse payment with a clear message.

Rollback: re-upload `shivaa-update-v85.zip` (or v84/v83) the same way;
the database format is unchanged.
