# Shivaa update v83 — third security hardening pass (read once, then safe to delete)

Deploy exactly like v81/v82: unzip over the web root (htdocs / public_html),
overwriting files. Nothing in `data/` (db.json, OTP/SMS/mail config) and none of
your uploaded images/catalogues/videos are touched or deleted. After unzipping,
hard-refresh once (Ctrl+Shift+R) — the service worker and all JS/CSS files are
cache-busted to v83 automatically for your customers.

## Honest scope statement

No website is literally unhackable — Hostinger, the browser vendors, Razorpay
and every future dependency are outside this code. What v83 does is eliminate
every vulnerability class we could find in *this* application by reading every
route and every render path again: authentication bypass, cross-account
access, payment forgery, stored XSS, code/file execution, brute force,
parameter tampering and data exfiltration. Each item below is a concrete code
change with an automated regression test (150+ static assertions and a hostile-
payload browser test all pass).

## 1. Partner approvals were not actually enforced (privilege gap)

Applying as a B2B jeweller used to issue a full partner session **immediately**
— the application sat in "pending" but the account could already open the
bullion desk, place metal-exchange and custom orders, and pull catalogues.

- New `require_partner_approved()` / `partner_is_approved()` gates now cover
  every partner route (bullion board/order/orders, alerts, metal exchange,
  custom orders, catalogues). Approval, suspension and rejection are read live
  on every request, so suspending a partner takes effect at once.

## 2. OTP lifecycle holes

- **Password-reset codes could be returned to the browser.** Demo builds show
  login/registration codes on screen; the same delivery path was used for the
  password-reset credential, so on a machine with the demo marker (or no SMS
  gateway configured locally) anyone who entered an email could read the code
  and change that account's password — including the admin's. Reset codes now
  **never** appear in any API response.
- Registration and the partner application used to accept a code minted for the
  *reset* flow. Both gates now explicitly reject reset-purpose codes.
- Single-use enforcement was missing at registration and partner-apply; both
  now consume the verified code exactly once (a replayed code is refused).
- Partner-apply also normalises the mobile number, rejects duplicate mobiles
  and duplicate GSTINs with 409, and burns the OTP before issuing the token.

## 3. Two status-update routes were dead for everyone

The metal-exchange and bullion status boxes carried a regex whose character
range was accidentally reversed by double-escaping (`\` down to `/`). PHP
rejected the pattern on every call, so **all** order status updates returned
"Invalid status" 400. Both patterns are corrected and regression-tested.

## 4. Stored-XSS sweep across product media and render sinks

Even an admin-only writer must not be able to store markup that later executes
in every visitor's browser (a compromised staff login, a hostile API client,
or a legacy db row).

- New server-side `shv_safe_media_url()`: relative site paths or http(s) only,
  strict character set, no quotes/brackets/control characters, ≤300 chars,
  max 12 images; unsafe video URLs are blanked. Applied on product create/edit
  **and on every public product response**, so rows saved before this update
  are re-filtered on the way out.
- Catalogue title/description/category are length-capped on upload and edit;
  the "featured" flag is cast to a real boolean (it previously stored any
  supplied value).
- Client-side, every media sink was audited and now routes through `safeUrl()`:
  product cards, compare tray, cart/checkout lines, the product gallery
  (including the video tag), search suggestions, recently-viewed, design
  selection desk, review photos, admin product grid/editor thumbnails, and the
  bullion news feed. RSS feed links from external news providers must now be
  http(s) URLs (a compromised feed can no longer inject a `javascript:` link).
- All remaining inline handlers with dynamic values (search suggestions,
  orders, reviews, cashbook print/CSV/close) pass values through `jsArg()`.
- A browser-level test loads a product whose name, images and video contain
  quote-breakout and `javascript:` payloads and asserts no element or script is
  ever created.

## 5. Payments and orders

- **Replay protection on gateway verification.** Re-submitting a captured
  Razorpay payment id against the same order used to add another payment line;
  it now returns idempotent "already recorded".
- Orders priced against a dead/zero rate feed fail closed with 503 instead of
  being accepted at ₹0 of metal value.
- Manual rate overrides are range-checked (gold ₹10,000–50,00,000 per 10 g,
  silver ₹1,000–50,00,000 per kg) and must be finite numbers.
- Login on an unknown email now spends the same bcrypt time as a real account,
  so response timing can't enumerate registered email addresses.

## 6. Data hygiene and tampering

- Coupon creation used to merge the **entire raw request body** into the
  coupon record; it now whitelists fields and caps the customer-visible note.
- Product create/edit can no longer overwrite the server-minted id/createdAt
  (a PUT that changed an id used to collapse product lookups).
- Swarna Nidhi instalments have an upper bound; cashbook and reports reject
  malformed `date`/`from`/`to` parameters (calendar shape required).
- Settings (WhatsApp, phone, UPI id, GSTIN, links) are validated before save;
  the WhatsApp number helper returns digits only, and the last hardcoded store
  number in the bullion confirmation now comes from Settings like everywhere
  else.
- The error log is capped (~256 KB) so a fault storm cannot fill disk.

## 7. Maintenance script

`migrate-repair.php` (already blocked by Apache rules) now additionally throttles
its password gate to 8 attempts per 15 minutes per connection, persisted in the
private `data/` folder.

## What was checked and found already safe (no change needed)

- Order/refund/service/savings routes are all owner-scoped server-side; lists
  are filtered by the session partner/user, never by a client-supplied id.
- The gold-finale quiz is scored server-side against the canonical answer bank;
  purchase eligibility re-checks ownership, payment and qualifying weight.
- Uploads verify real image/PDF magic bytes, get random server names, live in a
  no-execute directory, and pay-proof amounts are clamped to the order total.
- Razorpay signatures are HMAC-verified and bound to the server-issued gateway
  order; the demo gateway only works on localhost.
- HSTS, CSP (Razorpay-only exceptions), frame/object/form restrictions, nosniff,
  no CORS wildcard, and edge denial for `data/`, includes, backups and the
  repair tool were all re-verified.
- There is no `?next=`/return-URL redirect parameter, no `eval`/`new Function`,
  and no external script origin other than Razorpay.

## Files in this update

`api.php`, `hallmark.php`, `mail.php`, `sms.php`, `trust.php`, `migrate-repair.php`,
`admin-reset.php`, `.htaccess`, `index.html`, `sw.js`, `js/app.js`, `js/admin.js`,
`js/bot.js`, and the no-execute `.htaccess` guards under `uploads/`.
