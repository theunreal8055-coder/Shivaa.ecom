# Shivaa update v82 — second security hardening pass (read once, then safe to delete)

Deploy exactly like v81: unzip over the web root (htdocs/public_html),
overwriting files. Nothing in `data/` (db.json, OTP/SMS/mail config) and none
of your uploaded images/catalogues are touched or deleted.

## Headline fix — the "demo payment" hole is closed on live sites

Before v82, when no Razorpay keys were configured, **any logged-in person could
tell the server their own order was paid** (the on-screen "demo success" button
called a verify route that always accepted it). On your live Hostinger site this
meant an order could be marked fully paid without any money arriving.

- The fake/demo gateway now exists **only on local previews** (`localhost` or
  the optional `data/.otp-dev-mode` marker).
- On your public site, "Pay online" opens the **real UPI QR** (your counter UPI
  ID) and asks for the screenshot / UTR reference, which you approve from Admin
  → Orders exactly as before. Card/net-banking switches on automatically the
  moment Razorpay keys are added.
- Razorpay verification additionally checks the signed gateway order belongs to
  *that* order (a valid signature for one order can't mark another paid).
- Online payments above ₹1 crore are told to use WhatsApp/RTGS.

## Account & OTP attacks closed

1. **Cross-purpose OTPs fixed** — a password-reset code can no longer be used to
   log in, and a login/KYC code can no longer reset a password. Reset codes are
   bound to the exact email they were issued for.
2. OTP codes, dev payment receipts and debug info are **never returned in an
   HTTP response on a public host** (previews/loopback only; opt-in marker).
3. Sessions are capped at the **12 newest per account** — a login loop can't
   grow the token table without limit; password reset still revokes every
   session for that account.
4. Login/quiz attempt counters are updated atomically (a half-filled finale
   quiz no longer burns the day's attempts; the finale route gate was fixed
   against AND/OR short-circuit mistakes).

## Server-side input & money handling

5. Coupon codes are sanitised on creation (charset, unique), and discounts are
   always clamped to 0…order value — a mistyped percent/negative coupon can't
   inflate a total or "pay" the customer. Loyalty points + coupon combined can
   never exceed the goods value.
6. Order, custom-order, bullion and metal-exchange IDs now include 4 random
   characters — two orders in the same second no longer collide (the old IDs
   matched the *first* order for payments/refunds/status updates).
7. Numeric guards everywhere: finite/positive checks and ceilings on payment
   amounts, old-gold weights/rates/deductions, cash-book entries, bullion
   quantities; refunds can never exceed the order value.
8. Fixed status vocabularies are enforced on the server for orders, payment
   status, service/care requests and partner applications — markup or arbitrary
   strings in a status field are rejected with HTTP 400 (blocks stored-XSS via
   admin endpoints even from a hijacked admin session).
9. The GST lookup's configurable endpoint is SSRF-guarded: http(s) only, no
   internal/private addresses — a hostile custom URL can't make the server fetch
   internal resources while carrying the API key.
10. Unknown order IDs to the order-update route now return 404 instead of
    responding 200 with `null`.

## Uploads & the file system

11. Custom-design uploads check the **exact** file signature (RIFF+WEBP, not
    bare "RIFF" which also matches WAV/AVI), alongside the existing image/PDF
    magic checks on proofs, reviews, media and catalogues.
12. Every uploads subfolder (catalogs, designs, payproofs, reviews, videos)
    now carries its own `.htaccess` denying PHP/CGI/script execution, dotfiles
    and directory listing — defence in depth on top of the parent rule.
13. `robots.txt` asks crawlers to keep out of /relay/, admin-reset.php and
    migrate-repair.php.

## Cross-site scripting (XSS) closures

14. New `jsArg()` encoder for **inline onclick handlers** — the old pattern of
    HTML-escaping a value inside `onclick="f('...')"` is bypassable because the
    browser HTML-decodes the attribute before parsing the JavaScript. Cart
    buttons (item id + size) and the admin "nudge"/WhatsApp buttons now use the
    JSON-stringify-then-attribute-encode helper. Remaining inline values are
    server-generated IDs whose charset is restricted to hex/alphanumerics.
15. Admin tables/receipts now escape and numeric-cast partner, bullion,
    metal-exchange, refund, khata, low-stock, bestseller and order-item fields
    (thermal receipt, bullion receipt, invoices and slips included).
16. Links built from stored data (payment screenshot, catalogue file, review
    photos) pass through the `safeUrl:` allow-lister, so a `javascript:` URL
    stored in a path field can't execute.

## Information leakage / platform hygiene

17. PHP fatal/warning text is never shown to a browser — it is logged to
    `data/error-log.txt` (web-denied) with a generic 500 response; display of
    errors is disabled and the PHP version banner is removed in PHP and Apache.
18. Outgoing mail no longer advertises the PHP version in its X-Mailer header.
19. Service worker cache shell and asset versions bumped to v82 so every
    customer receives the new files immediately.

## Reassurance on what was already checked and found safe

- No SQL (JSON file store with atomic, file-locked writes); no `eval`/shell
  calls; no PHP sessions or cookies (stateless bearer tokens → no CSRF surface);
  no redirect endpoints (no open-redirect); no user input ever reaches HTTP
  headers or filenames on disk; include files and data/ remain web-denied;
  CSP, frame-deny, nosniff, referrer and permissions policies unchanged.
- Password hashing, lockouts, public rate limits, hallmarked-product guards and
  HUID rules from v81 all verified intact.

## Honest note

No website on earth is literally unhackable — security is layers, not a
guarantee. v81 closed the brute-force/abuse/leak classes; v82 closes the
authenticated-logic classes (self-confirmed payments, OTP mix-ups, ID
collisions, money math, stored-XSS via status/notes, SSRF) and adds
fail-closed file and error handling. Keep admin passwords strong, keep SMS
gateway / Razorpay keys only in Admin Settings (never emailed), and keep
backups of data/db.json.
