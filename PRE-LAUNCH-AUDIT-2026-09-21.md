# Shivaa.in full pre-launch technical audit

**Audit date:** 21 September 2026 (IST)  
**Target:** `https://shivaa.in` and the release-170 source deployed from this repository  
**Audit type:** safe, non-destructive external checks plus white-box source and automated regression review

## Executive conclusion

**Launch recommendation: NO-GO until the Critical/High items in “Fix before launch” are resolved and independently re-tested.**

The deployed release handshake is healthy (`/api/version` returned release 170 with index/app/worker all matched and force-latest enabled), and the code contains substantial authentication, authorization, payment reconciliation, upload and cache hardening. However:

1. all 83 repository products are gold products and **0/83 have a populated HUID/hallmark entry**; the live API sample returns `hallmark.status: "not_provided"` while descriptions claim BIS hallmark assurance;
2. customer, KYC, order and token data are held in one plaintext JSON database and downloadable admin backups are plaintext;
3. KYC/business-card uploads are stored under the public web root and are returned as URLs;
4. bearer sessions are stored in JavaScript-readable `localStorage`, while CSP still permits inline script;
5. production checkout, Cashfree Secure ID/KYC Studio, real OTP, notifications, TLS grading, real-device/browser, load, restore and legal/GST accuracy could not safely be certified in this environment.

No destructive payload, real OTP, real payment, real order, real KYC submission, admin mutation, spam or denial-of-service load was sent to production.

## Evidence and limitations

### Directly tested

- Live `GET /`, `/api/version`, `/api/products`, `/robots.txt`, and `/sitemap.xml`.
- Live release result: `rel:170`, `shell:shivaa-shell-v170`, `forceLatest:true`, and all release stamps matched.
- Repository regression belt: 25/25 page cases, 28/28 PHP cases, 39/39 boundary cases and 12/12 upload-signature cases passed.
- Desktop category/slow-network/control suite: 32/32 passed.
- Production dependency audit: `npm audit --omit=dev` reported 0 known vulnerabilities among 68 production packages used by the test tooling.
- Source-level route-by-route review of authentication, authorization, Cashfree reconciliation/webhook signature validation, file upload boundaries, caching, headers and compliance pages.
- Local catalogue aggregation: 83 products, all gold; 0 populated hallmark/HUID entries.

### Explicitly not tested

- Real payment, refund, OTP/SMS/email delivery, Cashfree Secure ID/KYC Studio account configuration, or real customer/admin accounts.
- Any mutation of live customer/order/catalogue data.
- SSL Labs completion (scan remained in `DNS` state), Mozilla Observatory (service returned 502), and PageSpeed Insights (API returned quota 429).
- Physical iOS/Android/older devices, physical ring sizer, physical printers, assistive technology, or all four real desktop browsers.
- Authorized high-volume load/DoS tests, malware scanning, host filesystem permissions, encrypted disks/backups, hosting-region contracts, cron execution and restore drills.

---

# 1. Security

## S1 — JavaScript-readable 30-day bearer sessions

**Severity: High**  
**Issue:** Access tokens are random and server-expiring, but the frontend stores `shv_token` in `localStorage`. Any successful same-origin XSS can steal a 30-day bearer token. Cookie controls requested in the audit (Secure/HttpOnly/SameSite) do not apply because authentication does not use a cookie.  
**Steps to reproduce:** Inspect `cms/js/app.js`: `token()` reads `shv_token` via the local-storage wrapper; API calls add `Authorization: Bearer`. Inspect `issue_token()` in `cms/api.php`: expiry is 30 days.  
**Recommended fix:** Move sessions to an opaque `Secure; HttpOnly; SameSite=Lax/Strict` cookie, rotate at login/privilege change, shorten idle/absolute lifetimes, retain server-side logout revocation, and add CSRF tokens/origin checking for cookie-authenticated mutations.

## S2 — CSP permits inline scripts and styles

**Severity: High**  
**Issue:** CSP contains `script-src 'unsafe-inline'` and the application uses many inline handlers. This materially weakens CSP as an XSS containment boundary, particularly with local-storage bearer tokens.  
**Steps to reproduce:** Review `cms/.htaccess` CSP and generated `onclick=` handlers in `app.js`.  
**Recommended fix:** Remove inline handlers, use delegated listeners, adopt per-response nonces or hashes, remove `'unsafe-inline'` from `script-src`, and add CSP reporting before enforcement tightening.

## S3 — CSRF protection is architecture-dependent and incomplete for a cookie migration

**Severity: Medium**  
**Issue:** Current protected mutations require an Authorization bearer header, which browsers do not attach cross-site automatically; this reduces classic CSRF exposure. Public write routes and guest checkout use route-specific validation/rate limits. There is no general CSRF token or uniform Origin/Referer enforcement.  
**Steps to reproduce:** Inspect state-changing routes in `api.php`; no central CSRF middleware exists.  
**Recommended fix:** Add same-origin Origin/Referer validation now. If sessions move to HttpOnly cookies (recommended), add synchronizer/double-submit CSRF tokens to every mutation and test checkout, profile, address, admin, refund and logout routes.

## S4 — Injection testing not fully completed against production

**Severity: Not tested (High-risk area)**  
**Issue:** Safe source review found no SQL/NoSQL engine—the application uses decoded JSON and typed/escaped boundaries—so conventional SQL injection is not applicable. Existing regression tests cover many HTML escaping and prototype/query cases. A complete reflected/stored/DOM XSS payload matrix was not sent to production because that would create persistent content/orders/forms.  
**Steps to reproduce:** Run an authorized isolated copy and submit a documented payload corpus to every text field, query/hash parameter, product/admin field, contact/B2B form, address, review, status, catalogue metadata and upload filename; verify both API JSON and every render sink.  
**Recommended fix:** Add automated taint/sink tests using OWASP payloads to an isolated DB; prohibit unescaped template interpolation; continue server allowlists and `esc()` use; deploy a strict nonce CSP.

## S5 — Authentication has good controls, but Cashfree Secure ID/KYC Studio claim was not verifiable

**Severity: High (not certified)**  
**Issue:** The repository implements its own mobile OTP plus jeweller email/password flows. OTP hashes, five-minute expiry, attempt limits, per-IP/per-phone limits, one-time consumption, password hashing, token invalidation on logout and password reset are present. The requested “OTP-less Cashfree Secure ID / KYC Studio” end-to-end flow and dashboard configuration were not available for verification.  
**Steps to reproduce:** Source routes are `/auth/send-otp`, `/auth/otp-login`, `/auth/login`; no currently active Cashfree identity callback route was found. Attempt login on an authorized staging number and inspect provider transaction, replay behavior and session issuance.  
**Recommended fix:** Reconcile product documentation with the actual login architecture. If Cashfree identity is intended, implement and independently test signed callback/state/nonce validation, audience/issuer checks, one-time codes and account binding before launch. Do not market it as active until verified.

## S6 — Admin URL is guessable; authorization is role-based but privileged auth is not separate MFA

**Severity: High**  
**Issue:** `#/admin` and admin APIs are discoverable. Guessability is not a security control; server-side `need_admin()` checks are correctly used on reviewed privileged routes, and login attempts are rate-limited, but admins share the same bearer/session architecture and no mandatory admin MFA was found. An `admin-reset.php` file also exists (robots denial does not secure it; Apache restrictions must be verified live).  
**Steps to reproduce:** Navigate to `/#/admin`; inspect `need_admin()` and admin routes. Request `admin-reset.php` in a safe external check and confirm denial—not merely robots exclusion.  
**Recommended fix:** Require phishing-resistant MFA/passkey or TOTP for admins, shorter privileged sessions and re-authentication for payment/refund/user changes. Restrict/remove reset and migration utilities from production; protect them at server level. Add admin alerting and IP/device anomaly review.

## S7 — IDOR controls appear present but need two-account black-box confirmation

**Severity: Medium (partially tested)**  
**Issue:** Orders are filtered by `userId`, order detail checks owner/admin/guest PIN, addresses are looked up only inside the authenticated user, and partner orders are filtered by partner ID. This is strong white-box evidence, but two real test accounts were unavailable.  
**Steps to reproduce:** On staging create users A/B and partner A/B; capture IDs for orders, addresses, wishlist, invoices, custom orders, metal/bullion orders and certificates; replay every request under the other identity and expect 403/404 with no metadata leakage.  
**Recommended fix:** Add an automated authorization matrix for every object route and run it in CI.

## S8 — API rate limiting is present but search/read endpoints lack edge bot protection

**Severity: Medium**  
**Issue:** OTP, login, reset, partner apply, checkout/payment and many anonymous writes have DB-backed limits. Public product/search behavior is client-side over the full `/api/products` payload; no CDN/WAF/bot policy was verifiable. DB-backed global rate counters also add write pressure.  
**Steps to reproduce:** Review `rate_block()` uses and the public `GET /api/products`; inspect hosting/WAF settings (not available).  
**Recommended fix:** Put login/OTP/checkout/search behind edge rate limits and bot controls; use Redis or another atomic TTL store at scale; return standard `Retry-After`; monitor abuse and SMS spend.

## S9 — CORS could not be confirmed from live headers

**Severity: Not tested (Medium-risk area)**  
**Issue:** Source does not add permissive CORS headers, which is good. The sandbox TLS path blocked a raw OPTIONS/header check, so proxy/CDN-injected CORS was not verified.  
**Steps to reproduce:** From an external machine send preflight and credentialed requests with `Origin: https://evil.example` to public and protected APIs.  
**Recommended fix:** Omit CORS entirely unless required; otherwise use an exact allowlist, never reflect arbitrary origins, and never combine wildcard origin with credentials.

## S10 — Transport/security headers are coded but external grading is incomplete

**Severity: Medium (not certified)**  
**Issue:** Source config sets HSTS (one year/includeSubDomains), CSP, frame denial, nosniff, Referrer-Policy, Permissions-Policy, COOP and CORP. Raw live headers could not be fetched from this sandbox; SSL Labs remained at DNS and Observatory returned 502.  
**Steps to reproduce:** Run SSL Labs and Mozilla Observatory from an unrestricted network; test HTTP→HTTPS redirect and all representative HTML/API/error/upload responses.  
**Recommended fix:** Require TLS 1.2/1.3, modern suites, complete chain, OCSP stapling where supported, HTTP redirect, HSTS preload only after all subdomains are HTTPS; ensure host-managed `.htaccess` actually contains the reviewed directives.

## S11 — Dependency inventory is incomplete despite a clean npm audit

**Severity: Medium**  
**Issue:** `npm audit` found zero known vulnerabilities in the tracked npm lock, but production is mostly self-hosted vanilla JS/PHP and remotely loads Cashfree SDK. There is no Composer lock/SBOM and no automated PHP/third-party SDK advisory workflow.  
**Steps to reproduce:** List manifests: only the smoke-test npm lock was found.  
**Recommended fix:** Generate an SBOM, pin/document Cashfree SDK version/integrity strategy, inventory PHP runtime/extensions and all copied libraries, enable Dependabot/OSV/Trivy-style scheduled scanning.

## S12 — Payment architecture is appropriately hosted, but production PCI behavior is not certified

**Severity: High (not certified)**  
**Issue:** Source creates Cashfree orders server-side, launches hosted checkout, verifies webhook HMAC, and reconciles payment state with server-to-server Cashfree GET before crediting. No card fields were found in Shivaa forms. Real merchant configuration, domain allowlisting, webhook secret, PCI attestation and paid/refund behavior were not tested.  
**Steps to reproduce:** Use Cashfree sandbox/approved low-value production plan; inspect browser/network to prove card data only reaches Cashfree; replay/tamper webhook and return parameters; close the browser after payment; test duplicate webhooks and refund races.  
**Recommended fix:** Complete Cashfree integration checklist and SAQ-A/PCI documentation; rotate secrets; alert on signature failures; preserve idempotency; conduct an authorized end-to-end payment/refund test.

## S13 — PII, KYC, tokens and orders are plaintext at rest

**Severity: Critical**  
**Issue:** `cms/data/db.json` contains application records and token metadata in plaintext; KYC/order/customer records and admin-downloaded backups are not application-encrypted. Source comments/policy cannot prove disk or backup encryption.  
**Steps to reproduce:** Inspect `DB_FILE`, `db_load/db_save`, and `/api/admin/backup`; no field encryption or encrypted archive is applied.  
**Recommended fix:** Move to a supported database; encrypt sensitive columns/objects with KMS-managed keys and rotation, encrypt disks and every backup, separate token hashes from raw tokens, tightly restrict filesystem permissions, document retention/deletion, and complete a restore test.

## S14 — Sensitive KYC uploads are under web root

**Severity: Critical**  
**Issue:** Business cards/KYC files are written to `uploads/kyc` and stored/returned as web URLs. Extension/magic/size checks and no-execute `.htaccess` are good, but confidentiality is not access-controlled and Apache rules do not prevent direct viewing of allowed image/PDF types. No antivirus/CDR scan is present.  
**Steps to reproduce:** Submit a test business card on staging, inspect returned/stored URL, then request it without authentication.  
**Recommended fix:** Store KYC outside web root or in private object storage; serve only through an authenticated, authorized, short-lived signed download; encrypt objects; add malware scanning/CDR; validate full decoding/PDF structure; define retention and deletion.

## S15 — General upload validation is partial

**Severity: Medium**  
**Issue:** Media/design/payment-proof/KYC routes have size/extension and some magic-byte checks, random names and no-execute rules. Header checks do not prove safe full decoding; payment-proof/catalogue paths need the same uniform scanner and authorization review.  
**Steps to reproduce:** Existing 12/12 signature regression passed; full polyglot/decompression-bomb/malformed-media testing was not run.  
**Recommended fix:** Decode/re-encode images server-side, inspect PDFs/media with a maintained parser, virus-scan asynchronously, enforce pixel/page/duration limits, quarantine before publication, and centralize upload policy.

---

# 2. Data privacy and India compliance

## C1 — Policy exists, but consent capture and rights execution are not evidenced

**Severity: High**  
**Issue:** A detailed DPDP page names the company/DPO, purposes, rights and grievance path. However, claims such as “fully compliant,” “data in India,” response windows and consent withdrawal were not supported by processor contracts, consent logs, a tested deletion/access workflow or hosting evidence. Signup/checkout consent granularity was not end-to-end tested.  
**Steps to reproduce:** Open `/#/privacy`; review signup, checkout, newsletter and B2B source; request access/deletion using a test identity and verify downstream erasure (not performed).  
**Recommended fix:** Obtain Indian privacy counsel review; add versioned, purpose-specific consent records; provide authenticated access/correction/erasure workflows; maintain processor/retention records; remove absolute compliance claims until evidenced.

## C2 — Consumer e-commerce disclosures need legal/content verification

**Severity: High**  
**Issue:** Company identity, address, phone, DPO/grievance contact and privacy/refund/shipping routes exist. Accuracy, conspicuous placement, grievance designation, return/cancellation timelines and marketplace/seller disclosures were not legally verified.  
**Steps to reproduce:** Visit footer routes privacy, terms, shipping, refund, contact and checkout; compare every statement to actual operations and Consumer Protection (E-Commerce) Rules.  
**Recommended fix:** Have Indian e-commerce counsel approve final pages; show legal name, CIN/GSTIN, geographic address, customer care and grievance officer prominently at checkout/order documents; ensure cancellation/refund mechanics match text.

## C3 — GST invoice legal correctness not certified

**Severity: Critical**  
**Issue:** Automated tests verify invoice numbering/escaping/totals and saved adjustments, but no CA-reviewed evidence confirms supplier GSTIN, place of supply, intra/inter-state CGST/SGST/IGST selection, taxable value, HSN, reverse charge and mandatory fields. Product-level HSN was not found in the reviewed catalogue aggregate.  
**Steps to reproduce:** Generate paid test orders for Rajasthan and another state, retail and B2B, discounts/COD/refund; compare invoices to Rule 46 and current jewellery HSN/GST treatment with a CA.  
**Recommended fix:** Block production invoicing until a CA/GST practitioner signs off; model HSN and tax jurisdiction explicitly; add golden invoice tests for interstate/intrastate, credit notes and refunds.

## C4 — HUID/hallmark data is missing while listings claim assurance

**Severity: Critical**  
**Issue:** Local catalogue check found 83 gold products and **zero populated hallmark/HUID entries**. The live `/api/products` sample reports `hallmark.status:"not_provided"` while product descriptions claim “BIS hallmark assured.” This fails the requested product-level HUID display and risks misleading claims.  
**Steps to reproduce:** Fetch `/api/products`; inspect `hallmark` and description for each gold product; open a live PDP.  
**Recommended fix:** Do not invent HUIDs. Obtain supplier/item-backed HUID and hallmark records, validate formatting and provenance, show them on each applicable live PDP, label exempt/not-yet-hallmarked items accurately, and remove assurance claims where evidence is absent. Obtain BIS/legal review.

---

# 3. Functionality — end-to-end flows

## F1 — Real checkout and notifications not tested

**Severity: Not tested (Critical launch gate)**  
**Issue:** Automated controlled tests cover order math, payment status truthfulness, guest access, invoice gates and Cashfree reconciliation boundaries, but no real browse→discount→address→Cashfree payment→confirmation SMS/email→account order was executed.  
**Steps to reproduce:** Use a designated test SKU/coupon/customer and approved low-value Cashfree transaction; verify order, stock, invoice, ledger, email, SMS, account and refund.  
**Recommended fix:** Run and record a launch-day transaction matrix before accepting customers.

## F2 — Calculators/live-rate arithmetic only partially verified

**Severity: High (not fully certified)**  
**Issue:** Existing regression covers many rates/checkout/saved-snapshot cases, but every calculator (Swarna Nidhi, buyback, bullion, savings, making-charge variants) was not manually reconciled against independent calculations and provider values.  
**Steps to reproduce:** Freeze a known rate fixture and manually calculate representative boundary values, rounding, GST, less weight, wastage, discounts and zero/missing rates; compare live feed timestamp/source.  
**Recommended fix:** Publish formulas/rounding rules, add golden vectors for every calculator, and show stale/fallback state clearly.

## F3 — Search/filter/sort passed source review but not exhaustive catalogue truth test

**Severity: Medium**  
**Issue:** Search is client-side and filter combination code exists; no exhaustive oracle compared every combined result/pill/sort against all live products. Live catalogue currently exposes only rings and earrings, while navigation advertises 17 categories and empty-category messaging.  
**Steps to reproduce:** Build expected sets from `/api/products`; test each facet alone and pairwise, price boundaries, clear pills, query encoding, sort stability and back navigation.  
**Recommended fix:** Add data-driven result-set tests and avoid suggesting populated categories where inventory is absent unless clearly labelled.

## F4 — Quick View and hero slider are automated, not real-browser certified

**Severity: Medium**  
**Issue:** Prior regression explicitly covers Quick View click ownership and carousel gestures/autoplay logic, but current real Chrome/Safari/Firefox/Edge behavior was not exercised.  
**Steps to reproduce:** Open listing, activate Quick View by mouse/keyboard/touch, close and confirm URL/scroll unchanged; run hero autoplay through all slides and activate each CTA.  
**Recommended fix:** Add Playwright cross-browser tests and retain real-device smoke tests.

## F5 — OTP paste/autofill/auto-verify not tested on real devices

**Severity: High (not certified)**  
**Issue:** Source contains OTP autofill and robust failure messages; no real SMS Retriever/iOS one-time-code/paste test was performed.  
**Steps to reproduce:** Test valid, wrong, expired, replayed, resend and offline OTP on physical iOS Safari and Android Chrome using test numbers.  
**Recommended fix:** Complete device/provider matrix and monitor delivery/verification conversion without logging OTPs.

## F6 — Ring-size calibration requires physical verification

**Severity: Not tested (Medium-risk area)**  
**Issue:** The UI supports pixels-per-mm calibration and saves size, but no physical ring/card/ruler was available.  
**Steps to reproduce:** Calibrate with a standard card/ruler on representative devices, compare multiple known rings and an Indian ring mandrel.  
**Recommended fix:** Have a jeweller validate mapping and rounding; disclose screen sizing as guidance, not a manufacturing guarantee.

## F7 — B2B submission delivery not externally verified

**Severity: High (not certified)**  
**Issue:** Server validates firm/email/phone/password, OTP and GSTIN, rate-limits submission and stores pending applications. Real GST provider availability and staff notification/operational receipt were not tested.  
**Steps to reproduce:** Submit a designated test firm on staging, confirm pending admin record and notification, reject/approve, then verify portal authorization.  
**Recommended fix:** Add staff alert/queue monitoring and an automated end-to-end staging test.

## F8 — Cart/wishlist persistence is device-local, not cross-device

**Severity: Medium**  
**Issue:** Cart is stored locally; wishlist has server synchronization for authenticated use, but the requested cart persistence across devices is not implemented as a server cart.  
**Steps to reproduce:** Add items on device A, sign into the same account on device B; compare cart and wishlist.  
**Recommended fix:** Add authenticated server-side cart merge with conflict/quantity rules; clearly define guest behavior.

## F9 — Full broken-link/button crawl not completed

**Severity: Not tested (High scope item)**  
**Issue:** Sitemap and router/error handling exist, but hash-routed pages, dynamic buttons and all 83×media URLs were not crawled with a real browser. The XML rendering also appeared flattened in the fetch parser and uses fragment URLs, which crawlers do not treat as separate server resources.  
**Steps to reproduce:** Run Playwright plus a link checker over every route, sitemap URL, product, image/video, footer, modal, error and external destination; verify HTTP status and resulting route state.  
**Recommended fix:** Add this crawl to CI and produce crawl artifacts; migrate SEO-critical pages away from fragment-only URLs.

---

# 4. Performance and “always latest version”

## P1 — Always-latest release handshake passed

**Severity: Low (positive finding)**  
**Issue:** No defect found in the tested release handshake. Live `/api/version` reports release 170 with matching index/app/worker and `forceLatest:true`; shell assets use `?v=170`; HTML/API/worker are intended no-store while versioned assets are immutable.  
**Steps to reproduce:** Fetch `/api/version`; compare index stamp, `APP_REL`, SW `REL/SHELL` and asset URLs.  
**Recommended fix:** Keep release changes coherent and never deploy worker/app/index separately.

## P2 — Service-worker update passed controlled tests, not real returning-device tests

**Severity: Medium**  
**Issue:** Automated suites cover bounded/scoped caches, cache failure, private/API bypass and release movement. A physical browser with an older installed worker was not available.  
**Steps to reproduce:** Install v169 on devices, populate offline caches, deploy v170, revisit/focus/reload and verify safe upgrade without losing checkout state; test offline recovery.  
**Recommended fix:** Add Playwright persistent-context upgrade tests and preserve a manual pre-release PWA matrix.

## P3 — Image formats and catalogue delivery are not ready for 3–4 lakh designs

**Severity: High**  
**Issue:** Live `/api/products` returns the catalogue as one JSON response and filtering/search is client-side. That may work for 83 items but cannot responsibly scale to 300,000–400,000 products. Many repository/live images are JPEG; format/size optimization was not comprehensively measured.  
**Steps to reproduce:** Inspect `/api/products` and client search; generate an isolated 300k-product dataset and measure payload, parse memory, search/filter latency and initial render.  
**Recommended fix:** Implement server-side indexed search/facets, cursor pagination, incremental image loading, responsive AVIF/WebP derivatives, CDN and cache invalidation; load-test realistic cardinality before claiming it.

## P4 — Core Web Vitals not tested

**Severity: Not tested (High launch-quality item)**  
**Issue:** PageSpeed API returned quota 429; no browser Lighthouse trace or field CrUX report was obtained.  
**Steps to reproduce:** Run Lighthouse mobile/desktop on home, category, PDP, cart, checkout and B2B; gather LCP/INP/CLS and network/main-thread traces.  
**Recommended fix:** Set budgets (LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at p75), monitor RUM, and fix per trace.

## P5 — CDN/browser image headers not externally confirmed

**Severity: Not tested (Medium-risk area)**  
**Issue:** Source cache policy distinguishes no-store shell/API from immutable versioned assets; proxy/CDN response headers and image cache behavior could not be read through the sandbox TLS path.  
**Steps to reproduce:** Use `curl -I` externally for HTML, SW, API, versioned CSS/JS and uploaded/static images; repeat via CDN POPs.  
**Recommended fix:** HTML/SW/API no-store or appropriate revalidation; fingerprinted static media long immutable; mutable uploads versioned by content or ETag.

## P6 — Concurrent search/checkout load not tested

**Severity: Not tested (Critical capacity gate)**  
**Issue:** No authorization or safe target was provided for load testing. The single JSON file, full-file locking and DB-backed rate limits are material scalability risks.  
**Steps to reproduce:** Clone sanitized production-scale data to staging; run k6/Locust profiles for browse/search/checkout/payment-status and failure injection; never load-test live without written authorization.  
**Recommended fix:** Establish SLOs and capacity target, migrate transactional data/rate limits to scalable stores, then test and tune.

---

# 5. Mobile and cross-browser

## M1 — Physical device/browser matrix not tested

**Severity: Not tested (High launch gate)**  
**Issue:** No physical devices or real Safari/Firefox/Edge sessions were available. jsdom/regression coverage is not a substitute.  
**Steps to reproduce:** Execute scripted smoke matrix on current/previous iOS Safari, Android Chrome and one low-memory older Android; desktop Chrome/Safari/Firefox/Edge.  
**Recommended fix:** Make signed device/browser results a release gate; use BrowserStack/Sauce plus physical-device spot checks.

## M2 — Breakpoint/touch layout not physically certified

**Severity: Not tested (Medium-risk area)**  
**Issue:** CSS includes mobile/touch-target rules and prior mobile regressions, but 360/390/768/1024 screenshots and interaction traces were not captured.  
**Steps to reproduce:** At each width check horizontal overflow, sticky bars, drawers, modals, keyboard, safe-area insets and 44×44 targets.  
**Recommended fix:** Add Playwright screenshot/overflow/target-size assertions and manual touch checks.

---

# 6. Accessibility

## A1 — No current axe/Lighthouse certification

**Severity: High (not certified)**  
**Issue:** Existing code adds accessible names, focus handling and 44px controls, and v167 regression checks passed previously. No axe or Lighthouse run against the live rendered route set was completed.  
**Steps to reproduce:** Run axe on home, category, PDP, cart, checkout, login, account, B2B, calculators and admin; manually test keyboard and screen readers.  
**Recommended fix:** Resolve all critical/serious axe findings; manually validate focus order/traps/restoration, announcements, errors and reduced motion; publish an accessibility statement/contact.

## A2 — Alt text/contrast/keyboard coverage needs complete route audit

**Severity: Medium**  
**Issue:** Product templates generally derive alt text; decorative images sometimes use empty alt. Theme contrast and every dynamic modal/menu were not measured against WCAG 2.1 AA.  
**Steps to reproduce:** Inventory every rendered image and interactive element; calculate contrast in all states; navigate without mouse.  
**Recommended fix:** Add semantic image text policy, automated contrast checks and keyboard E2E tests; ensure visible focus and non-color status cues.

---

# 7. SEO

## E1 — Fragment/hash URLs are a major crawlability limitation

**Severity: High**  
**Issue:** Sitemap lists `/#/...` routes. URL fragments are not sent to servers and are generally not independent crawlable documents; all routes initially serve the same shell/canonical. Product JSON-LD and metadata are injected client-side.  
**Steps to reproduce:** Fetch a `/#/product/...` URL without JS; response is the common shell. Inspect sitemap fragment URLs.  
**Recommended fix:** Move public pages to History API/server-routed or prerendered URLs (`/product/slug`, `/category/rings`), return route-specific title/description/canonical/JSON-LD and 404 status server-side, then regenerate sitemap.

## E2 — Canonical strategy does not cover filtered/sorted pages correctly

**Severity: High**  
**Issue:** Shell canonical is always `https://shivaa.in/`; product route updates metadata/JSON-LD but route-specific canonical handling was not evident. Filter/sort fragment variants cannot be canonicalized meaningfully at HTTP level.  
**Steps to reproduce:** Inspect initial source/canonical on home, category, product and filtered URLs.  
**Recommended fix:** Emit self-canonical product/category URLs; canonicalize or noindex non-valuable filter combinations; use clean server paths.

## E3 — Product schema is PDP-only and must be validated

**Severity: Medium**  
**Issue:** `Product` JSON-LD with offer/image is dynamically injected on PDP. The request asked for listing markup; adding Product schema to every listing card is not always recommended, but collection/breadcrumb/item-list markup should be considered. Google Rich Results validation was not run.  
**Steps to reproduce:** Render a PDP, inspect `#ld-product`, run Rich Results Test; inspect listing source.  
**Recommended fix:** Validate PDP Product/Offer/Breadcrumb schema against actual availability/price; add server-rendered CollectionPage/ItemList where appropriate; never mark unavailable stock as available.

## E4 — Robots exists; sitemap quality requires correction

**Severity: Medium**  
**Issue:** `robots.txt` blocks data/uploads/API and names the sitemap. Sitemap includes fragment URLs and escaped-looking product IDs in parsed output.  
**Steps to reproduce:** Fetch both files and validate XML with a standard sitemap parser/Search Console.  
**Recommended fix:** Replace fragments with crawlable HTTPS URLs, ensure valid XML escaping and accurate `lastmod`, submit to Search Console and monitor coverage.

---

# 8. Monitoring/post-launch readiness

## O1 — No application error monitoring/RUM integration found

**Severity: High**  
**Issue:** PHP uses `error_log` in limited places; no Sentry-equivalent client/server exception aggregation, release health, alert routing or source maps were found.  
**Steps to reproduce:** Search repository for monitoring SDK/config; trigger a controlled staging exception and verify no central event.  
**Recommended fix:** Add privacy-scrubbed frontend/backend error monitoring, release tags, alert thresholds, correlation IDs and payment/OTP/catalogue synthetic checks. Never send PII/secrets.

## O2 — Uptime/synthetic monitoring not evidenced

**Severity: High**  
**Issue:** No uptime configuration was found.  
**Steps to reproduce:** Inspect external monitoring provider/dashboard (not available).  
**Recommended fix:** Monitor homepage, `/api/version`, products/rates and an isolated synthetic checkout read path from multiple Indian regions; alert owner/on-call.

## O3 — Automated encrypted backups and restore drill not evidenced

**Severity: Critical**  
**Issue:** There is a manual plaintext admin backup and deploy rollback copy, but no evidence of scheduled encrypted off-site DB backups, retention, immutability or tested restore.  
**Steps to reproduce:** Inspect host cron/storage and perform an isolated restore with measured RPO/RTO (not available).  
**Recommended fix:** Encrypted automated backups, separate account/bucket, retention/immutability, daily success alerts and quarterly restore drills; document RPO/RTO.

## O4 — Staging environment not evidenced

**Severity: High**  
**Issue:** Test fixtures and preview tooling exist, but no persistent production-like staging host with isolated data/provider credentials was proven.  
**Steps to reproduce:** Review DNS/hosting/deployment pipeline and staging secrets (not available).  
**Recommended fix:** Create access-controlled staging with anonymized fixtures, Cashfree sandbox, test SMS/email, identical PHP/server rules and promotion gates. Never copy live PII into staging.

---

# Prioritized remediation

## Fix before launch

1. **Stop unsupported HUID/BIS claims; populate verified item-level hallmark/HUID data or clearly mark exceptions** (C4).
2. **Complete CA/GST invoice review and golden interstate/intrastate/refund tests** (C3).
3. **Encrypt/migrate PII, KYC, orders, sessions and backups; protect keys and test restore** (S13, O3).
4. **Move KYC/private uploads outside web root with authenticated delivery and malware scanning** (S14/S15).
5. **Replace localStorage bearer sessions with HttpOnly secure cookies, add CSRF/origin protection, and require admin MFA** (S1/S3/S6).
6. **Tighten CSP to remove inline-script execution** (S2).
7. **Run authorized real Cashfree/OTP/notification checkout and refund matrix; verify PCI/merchant/webhook configuration** (S5/S12/F1/F5).
8. **Run two-account IDOR matrix and production-header/TLS/CORS scans from an unrestricted environment** (S7/S9/S10).
9. **Run physical-device/cross-browser and axe/WCAG launch gates** (M1/M2/A1/A2).
10. **Establish staging, centralized monitoring, uptime checks and alert ownership** (O1/O2/O4).
11. **Run staging load/capacity tests and replace the all-products JSON/file-database design before any 3–4 lakh catalogue claim or import** (P3/P6).
12. **Run a full browser crawl/button/link/media test and complete calculator/B2B/device verification** (F2–F9).

## Fix post-launch (only after launch gates above pass)

1. Migrate fragment routes to crawlable server/prerendered URLs and correct canonical/sitemap/schema strategy (E1–E4).
2. Add SBOM and scheduled dependency/runtime scanning (S11).
3. Add RUM/Core Web Vitals dashboards and optimize from measured traces (P4/P5).
4. Implement cross-device authenticated cart merge (F8).
5. Maintain quarterly restore, payment, authorization, accessibility and real-device regression drills.

## Required sign-offs before changing status to GO

- Security owner: auth/session, admin MFA, IDOR, uploads, headers/TLS and payment threat model.
- CA/GST practitioner: invoices, HSN, tax jurisdiction and credit/refund documents.
- BIS/jewellery compliance owner: HUID/hallmark evidence and listing wording.
- Privacy counsel/DPO: DPDP notices, consent, retention, processor geography and rights workflow.
- Operations owner: backups/restores, monitoring/on-call, staging, OTP/email and Cashfree production readiness.
