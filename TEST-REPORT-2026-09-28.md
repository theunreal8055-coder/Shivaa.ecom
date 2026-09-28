# Shivaa shop/PWA local test report — 28 September 2026

**Scope:** The current workspace's v185 source (storefront, PHP API, SW, offline/mobile shell). Isolated PHP-WASM fixtures used synthetic accounts/data; no requests to production login, payments, uploads or billing software. No deploy or application-code change was made for this test.

## Results

| Check | Result |
|---|---|
| `npm test` from `tools/mega/smoke/` | **PASS, exit 0**. Includes deployment approval gate (20/20), v185 mobile assertions (4/4), v184 product gallery (8/8), v183 PHP (4/4), v182 PHP (9/9), v181 PHP (6/6), v180 PHP (8/8), v179 PHP (25/25), v179 relay (7/7), v169 pages (25/25), v169 PHP (28/28), v168 boundary (39/39), upload signatures (12/12). Some older stamp-exact static checks explicitly SKIP because v185 supersedes them; corresponding PHP regression suites ran. |
| `node v117-check.js` | **PASS 27/27** (storefront jsdom boot, carousel, CSS/SW links, no unhandled page errors). |
| `node v118-check.js` | **PASS 19/19** (category/shop/product UI flows, gallery, Quick View, checkout launcher). |
| Isolated real-PHP auth route probes | **PASS 6/6:** wrong/right password; 20 per-IP attempts followed by HTTP 429 even for a correct password; account lock after 8 failures across distinct IPs; admin users route denies guest/member; OTP's sixth attempt blocked; correct OTP logs in once then rejects replay. Fixture uses synthetic `.invalid` addresses, no gateway/network. |
| Read-only live version request (`https://shivaa.in/api/version`) | **NOT RUN TO COMPLETION**: TLS handshake returned `curl: (35) SSL_ERROR_SYSCALL`. No live version or production config was verified. |

**No failing application assertions in the completed suites.** A first draft of the one-off auth probe requested the nonexistent `users` route and returned the expected 404; it was corrected to the real `admin/users` endpoint and rerun cleanly. That was a test-harness mistake, not a product bug.

## What these tests do not prove

- No real-browser/phone visual test: no installed Chromium/Firefox; the browser download previously failed TLS. jsdom does not measure mobile layout or verify gestures on a handset.
- No authorised live penetration test, live OTP/SMS, Cashfree payment, production Apache/LiteSpeed `.htaccess`, firewall, or server configuration test. The app's production version is unknown because HTTPS from this sandbox failed.
- These checks cannot certify that the site cannot be hacked, or extend a security rating to the separate billing app (not in the supplied source).

**Recommended acceptance:** Owner checks the live `/api/version`, 320–390px Home/Shop/Product/Privacy/footer in an actual phone browser, an authorised test-account login and OTP, then commissions a scoped independent security assessment before treating the app as security-certified. Do not test lockout against the owner's real admin account.
