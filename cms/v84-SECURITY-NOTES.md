# Shivaa update **v84 — fourth security sweep** (cumulative)

Deploy exactly like v81–v83: unzip **over** `public_html` on Hostinger
(File Manager → Upload → Extract, choosing "overwrite"). Your `db.json`,
customer uploads, `data/` config and images are **not** in the zip. After
extraction, hard-refresh once (Ctrl+Shift+R) — `sw.js` and every asset tag
moved to `?v=84`, so all customers get the new files automatically.

Nothing in this round needs any setting change or migration.

---

## Honest scope statement

No website is literally unhackable — that promise does not exist for any
software on the internet. What this round does, like v81–v83, is close
**every concrete weakness found by another full adversarial read of the
running application** (api.php, the PHP includes, the maintenance scripts,
app.js / admin.js / bot.js, .htaccess and sw.js), add server-side guards so
the API is safe even when the UI is bypassed, and add automated regression
tests so fixed issues cannot silently return. Remaining risk is dominated by
things outside this code: hosting account compromise, domain/email takeover,
key disclosure, or a future zero-day in Apache/PHP/the browser.

---

## What was found and fixed in v84

### 1. Database writes now *fail closed* (`api.php`)
`db_save` already wrote atomically (temp file + rename under lock), but it
did not check the result of `json_encode`, `fwrite`, or `rename`. A failed
encode (invalid UTF-8), a short write (disk full/quota), or a failed rename
could in the worst case leave an empty or truncated `db.json`.
- Failed/empty encode → logged, HTTP 500, old database kept.
- Short write → temp file deleted, logged, HTTP 500, old database kept.
- Failed rename → temp file deleted, HTTP 500.
- The legacy `file_put_contents` fallback now only runs for non-empty JSON.

### 2. GET requests can no longer change state
- `services/{id}/status` returned `405 Method Not Allowed` + `Allow: PUT`
  for any non-PUT method — previously a prefetched/shared link could advance
  a repair job's workflow.
- `admin/products/{id}/hallmark` is `405` outside GET/PUT.
- `addresses/{id}` is `405` outside GET/PUT/DELETE, and **GET never writes**
  (a stray write flag is now set only by PUT/DELETE).

### 3. Money inputs are typed and clamped everywhere
The audit walked every ledger and board write with a debugger's eye:
- **Payment ledger** (`order_add_payment`): a payment line can never be
  negative and can never push "amount paid" past the order total — the figure
  refund clamping and revenue reports depend on.
- **Cash refunds**: a non-exchange refund can never exceed money actually
  received (`amountPaid`) — an unpaid COD order can no longer generate a
  cashbook outflow; still also capped at the order total.
- **COD self-confirmation**: only honoured on COD, non-cancelled orders.
- **Bullion cash board**: each buy/sell must be 0 (closed) or between
  ₹10,000 and ₹5,00,00,000 per 10 g — a typo can't publish a ₹1 quote that
  the B2B order ticket treats as firm.
- **Bullion order ticket**: the firm rate is additionally checked in a
  sane per-gram band (silver ₹10–50,000/g, gold ₹100–5,00,000/g) before an
  order is accepted, independent of the board check.
- **Bullion rate-alerts**: targets must be in the same per-gram band.
- **Settings**: shipping fee, free-ship threshold, prepaid/COD percentages,
  referral reward, bullion premiums and metal factor reject non-numeric input
  (`"1OO"`, null, arrays) and out-of-range values; `invoiceSeq` must be a
  non-negative whole number; UPI/name/address-style keys reject arrays.
- **Karigar job-work**: weight 0–1 t, wastage 0–100%, job charge/advance
  bounded, ISO due date, free-text status rejected in favour of a
  letters/digits/space pattern, returned weight bounded, extra/payment
  lines bounded (positive and negative safe).
- **Partner khata**: no ledger line for an unknown partner (orphan-row
  block), amounts bounded (₹100 cr / 1 t gold per line), integer rupees or
  3-decimal grams.
- **Swarna Nidhi**: admin back-dated instalments must be real
  `YYYY-MM-DD` timestamps instead of arbitrary stored text.
- **Cash book**: manual entry timestamps validated as dates; day-open/close
  cash counts must be finite and between ₹0 and ₹100 crore.
- **Custom design orders**: melting/advance money bounded.
- **Making-charge chart**: the PUT now validates shape (max 100 rows,
  sanitised keys, bounded finite numbers) — previously a raw JSON body
  flowed unexamined to the B2B board.
- **Product catalogue writes**: a full field whitelist + type/clamp layer
  (`shv_sanitize_product_fields`) now guards POST and PUT — weight > 0 and
  ≤ 1 t, less-weight ≤ weight, wastage 0–100%, stock bounded, stone value
  bounded, making-charge scheme restricted to fixed/percent/per-gram with
  percent capped at 100, sizes/tags capped and trimmed, unknown keys and
  hallmark fields dropped. Name/weight/picture are enforced server-side.

### 4. Coupon rules are enforced by the server, not just the UI
`oncePerUser` and `forNewUsers` were only hiding codes in the checkout UI.
The API now rejects them at **both** `coupons/validate` and order placement —
a customer cannot reuse a "once" code or use a first-order code on a
returning account by replaying the API call.

### 5. Delivery and contact data quality
- Saved-address phone (POST + PUT) must match the Indian mobile grammar
  `^[6-9]\d{9}$` (normalised to 10 digits).
- **Checkout orders now require a complete delivery address server-side**
  (name, valid 10-digit mobile, line, city, 6-digit pincode) — a crafted API
  request could previously place an order with no address at all.
- Service requests: same mobile grammar (with 91/0 normalisation), and the
  optional email is actually validated.
- Contact form, rate alerts and abandoned-cart leads store a phone only when
  it is a real 10-digit mobile (garbage like `123` is dropped rather than
  printed on the admin lead sheet).

### 6. Cross-account read in "my repair requests"
`services/mine` matched requests when the last-10 phone digits matched —
including when **both sides were empty**, so every phone-less account could
see every phone-less request. Matching now requires a real, non-empty, exact
10-digit number on both records (userId match still works as before).

### 7. Uploads tree can no longer serve active documents
All six upload `.htaccess` files (root + catalogs, designs, payproofs,
reviews, videos) now:
- deny execution/serve of PHP family, CGI/PL/PY/SH/ASP/JSP, **and active
  documents** `.html/.htm/.shtml/.svg/.xml/.xsl/.js/.mjs` (an inline SVG or
  HTML file opened straight from `/uploads` could previously run scripts in
  your site's origin);
- send a locked-down CSP (`default-src 'none'`, images/media same-origin +
  blob/data, `frame-ancestors 'self'` so the catalogue PDF viewer still
  works, `base-uri/form-action none`), `X-Content-Type-Options: nosniff` and
  a strict Referrer-Policy.
Magic-byte upload validation (from v81/v83) remains in place; this is
defence in depth if a hostile file ever lands there by any other route.

### 8. Custom Pages (admin-authored) verified inert
Pages are stored as raw plain text and rendered through the text escaper +
paragraph splitter. A new jsdom functional test loads a page containing
`<script>`, `<img onerror>`, `<svg onload>` and a `javascript:` link and
asserts none of them create elements/attributes or execute (13 checks,
green). Title is escaped in the same render. Stored markup stays as
visible text — exactly the intended "write your policy in plain text" model.

### 9. Output-side sweeps (app.js / admin.js / bot.js)
Every `innerHTML` sink was re-traced against data an outsider can influence:
customer names, product fields, reviews, service/contact/lead text, bullion
notes/partners, khata entries, refund reasons and bot history. All such
fields pass through `esc`/`safeUrl`/`jsArg` (v83 layer) or are numeric;
the unescaped interpolations found were static catalogue constants or
numbers, not user data. No new sink was introduced this round; the existing
guards are covered by the v83 hostile-payload functional test (still green).

### 10. Re-confirmed safe this round (no fix needed)
Order money math (coupon/points caps, total floored at zero, zero-subtotal
fail-closed), payment config leaking only the public key id, settings secret
stripping, owner-scoped payment/refund routes with ceilings, review/catalog/
proof upload magic-byte checks and random names, finale server-side scoring
and answer secrecy, OTP single-use/purpose binding and throttling, login
timing equalisation, partner-approval gates, SSRF guard on the GST lookup,
email header injection cleaning, the include-library SHV_RUN guards, the
edge `.htaccess` deny rules, and the break-glass recovery file's
file-creation proof.

---

## Tests run before packaging
- New **v84 static suite: 153 checks, 0 failures** (regressions for every fix
  above plus all v81–v83 invariants).
- New **v84 functional jsdom suite: 13/13** — hostile custom-page payload
  renders as inert text.
- v83 hostile-product functional suite: **19/19**; v80 **10/10**;
  v79 board **27/27** — all still green.
- `node --check` on app.js / admin.js / bot.js / sw.js; bracket lint on all
  PHP files; `unzip -tq` integrity check; extraction + md5 verification.

## Files in the package (flat web root)
`api.php`, `index.html`, `sw.js`, `robots.txt`, `.htaccess`,
`hallmark.php`, `mail.php`, `sms.php`, `trust.php`, `migrate-repair.php`,
`admin-reset.php`, `js/app.js`, `js/admin.js`, `js/bot.js`, and the six
hardened `uploads/**/.htaccess` files with their `.gitkeep` markers.
Excluded as always: `db.json`, everything in `data/`, customer-uploaded
files, images, caches, `node_modules`, and the Render `relay/`.

## Rollback
Keep `shivaa-update-v83.zip`. If anything looks wrong after deploy, extract
v83 back over the same folder (your data is untouched either way), then
hard-refresh.
