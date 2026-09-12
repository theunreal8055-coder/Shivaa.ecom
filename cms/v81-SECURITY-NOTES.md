# Shivaa update v81 — security hardening notes (read once, then safe to delete)

Deploy exactly like previous updates: unzip over the web root (htdocs/public_html),
overwriting files. Nothing in data/ (your db.json, OTP/SMS config) is touched.

## Maintenance scripts — important

- `migrate-repair.php` is now **blocked at web-server level** by `.htaccess`.
  If you are ever told to run it: rename it in File Manager to something secret
  (e.g. `repair-xx92.php`), open it once, then delete it.
- `admin-reset.php` (break-glass password recovery) is unchanged in how you arm
  it, but now: wrong recovery keys lock the page for 30 minutes after 6 tries,
  and the page is never cached. Keep deleting it after use as before.

## What changed (plain-English summary)

1. Login: 20 attempts/15 min per connection AND 8 wrong passwords locks one
   account for 15 min. "Unknown email" and "wrong password" return the same
   message.
2. OTP sends/attempts capped per connection and per phone number; codes are
   compared in constant time (no timing guessing).
3. Public forms (contact, newsletter, service booking, rate alerts, partner
   application, reviews, checkout, bullion/metal orders, payment screenshots,
   GST KYC checks) all have per-hour limits and strict length/range validation.
4. Order totals, bullion rates and quantities are computed/verified on the
   server; zero-rate or negative/absurd orders are rejected.
5. API request bodies capped at 3 MB; uploads must be genuine images/PDFs
   (verified by file contents, not filename); payment screenshots max 6 MB and
   12 per order.
6. The public settings API can no longer leak nested secrets (GST API key,
   gateway secrets, MPIN, relay keys, tokens).
7. Database writes are atomic (temp file + rename) — a crash can never leave a
   half-written db.json.
8. Client IP can no longer be spoofed via X-Forwarded-For on shared hosting.
9. Include files (sms/mail/trust/hallmark) and the relay/ folder return 403 if
   hit directly; .git/.env/composer/backup files are blocked too.
10. Stored-XSS gaps in admin print views are closed; service/review/order
    notes are escaped everywhere.
11. Rate-limit and abuse counters self-prune (no unbounded db growth).

## Honest note

No website on earth is literally unhackable. v81 closes every vulnerability
class found in a full audit (secret exposure, brute force, enumeration,
DoS/abuse, price tampering, IDOR, file upload, stored XSS, leftover maintenance
doors). Keeping PHP and hosting patched plus unique admin passwords remains
ongoing hygiene.
