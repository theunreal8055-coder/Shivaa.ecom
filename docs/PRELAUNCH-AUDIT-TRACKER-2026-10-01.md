# shivaa.in Pre-launch Audit Tracker — 2 Oct 2026

## Scope and counts

This tracker separates complete requirements from the supplied prompt's truncated ending. There are **111 complete visible audit bullets** across Rounds 1–3 and Round 4 Sections A–B, plus one incomplete Round 4 Section C fragment beginning “Persistent bottom navi…”. The prompt ends during that fragment; its destinations, interaction rules, and all following requirements are unknown and are deliberately not inferred or counted as complete bullets.

- **Complete visible checklist bullets:** 111
- **Fully verified end-to-end for this broad audit:** 0 / 111
- **Checklist areas with partial local evidence:** S01–S04, S12, six earlier v183/v184-touch areas, and selected Round 4 source/fixture work recorded below; every item remains open until its full acceptance test is completed.
- **Still requiring completion/direct evidence:** 111 / 111, plus the missing Round 4 continuation.
- **Findings:** five preliminary findings are recorded below (three S01, one S02, one KYC privacy), each with provisional severity, reproduction and local retest evidence. No complete audit-wide severity ranking exists.
- **Owner severity rules:** any confirmed Round 2 business-logic/fraud or CRM/ERP issue is **Critical**; any Round 3 Section B failure reproduced inside Instagram's in-app browser is **Critical**. The corresponding checks below are currently untested, so no such failures are asserted. Other severities remain provisional until reproduced.

The five v183 partials are: hero-slider operation (F05), banner image optimization (PERF05), banner alt text/keyboard controls (ACC02), responsive banner behavior at mobile widths (MOB02), and responsive/WebP image strategy (R3C02). The v184 partial is asset/cache versioning (PERF01): stamps and the public release handshake were checked, but stale-client behavior was not fully tested. The v184 Cashfree reconciliation feature (#14) is an additional money-audit item, not one of the 111 complete visible bullets.

A safe GET of `https://shivaa.in/api/version` on 2 Oct 2026 independently confirmed production release **v186**: shell `shivaa-shell-v186`, `builtAt: 2026-10-02T08:02:12+05:30`, matched index/app/service-worker stamps, MySQL mode, 78 SQL/JSON rows and `mirrorBehind:false`. This checks the public release handshake only—not private KYC-file access, live authentication/IDOR, settlement reconciliation, or all site behavior.

This turn built and tested a local v187 candidate for a source-confirmed KYC upload privacy risk. `shivaa-update-v187.zip` is an incremental `public_html` overlay based on the confirmed v186 live release. It was **not** uploaded to staging or production; no cache purge or live KYC file probe occurred. These local results do not substitute for the remaining direct audit tests. The owner said earlier v184 report checks are complete, but their specific results were not provided; they remain owner-reported, not independently reproduced.

Separate from this broad checklist: the prior money-audit source inventory reports **17/18 findings marked FIXED; #27 remains blocked on owner policy**. The Cashfree settlement report has not been run against Cashfree by this agent.

## S01 results — partial local QA only (1 Oct 2026)

The working-tree `cms/api.php` was executed through PHP-WASM against the isolated synthetic database from `tools/mega/smoke/php-api-fixture.js`; the current app shell is release 187. The earlier S01 API/DOM suite was executed against a v186 tree; the v187 copied storefront DOM regression also runs with controlled fake API responses. `seed()` constructs QA-only users, products, settings and rates without reading `cms/data/db.json`; the S01 DOM fixture also uses wholly synthetic baseline data and does not read the repository DB. No customer records were used or transmitted, and no production requests, merchant credentials, real browser, MySQL server, or staging host were used.

- `node tools/mega/smoke/s01-api-check.js`: **25 passed, 0 failed**. Covers SQL-shaped product search/category/metal/tag values and login credentials, reflected markup, product-path matching, unsafe-media-write rejection, unauthenticated product/review write denial, an admin-only poisoned product fixture, profile/review/contact/service/custom-page storage and reads, and scalar/type handling for the four product filters.
- `node tools/mega/smoke/s01-dom-check.js`: **29 passed, 0 failed**. Covers search and shop URL query values, browser-stored recent searches, poisoned product fields and media URLs, profile/address/review text through shop cards, PDP, account, cart/mini-cart, custom pages, care-request tracking and contact-form handling, plus static admin product/service-rendering sink assertions. The contact UI uses a mock response while its API write is tested separately in PHP-WASM; the harnesses are not a full integrated form-to-server run. In pre-fix jsdom runs, the injected SVG was parsed but its handler did not execute; the poisoned-media fixture caused 13 DOM assertions to fail before hardening, and current assertions confirm the targeted nodes are absent (29/29 pass). Actual browser execution remains untested.
- Before the fixes, `?q[]=ring` produced HTTP 500, poisoned product metadata created event-bearing SVG nodes, and a quote-bearing legacy media URL such as `/"><svg/onload=x=1>` broke out of an image `src` and created an SVG node. After the fixes, arrays receive HTTP 400, unsafe media is rejected at product write and `safeUrl` blocks attribute delimiters, and the poisoned values remain inert text. Additional service-request, review, profile/address, contact, and custom-page checks found no separate XSS failure in the tested customer rendering paths; these are still limited local checks, not a broad clearance.
- **Still not tested for S01:** complete contact/review/checkout/auth form workflows integrated with a real API session, exhaustive stored-field/source combinations, MySQL-mode runtime, an actual browser's script execution, or authorized staging/live behavior. No SQL or NoSQL database injection was demonstrated by this local slice; this is not a complete SQLi/NoSQLi clearance.

### Preliminary S01 findings

| Issue | Provisional severity | Reproduction and outcome | Fix and retest |
|---|---|---|---|
| Stored product metadata could create HTML/SVG nodes and event-handler attributes in shopper renders; source review also found related admin product/label sinks. A malformed product created through the admin-only product API could inject `"><svg/onload=x=1>` through fields such as metal, purity, category, or SKU. | **Medium (provisional):** public-page impact if poisoned catalogue data is present, but the tested write route requires an admin token; no public write path was found. | In the isolated fixture, POST a product with the payload as `metal`/`purity` and open `#/shop`; the pre-fix `#filterDrawer` contained an `svg[onload]`. Repeat with category/SKU/purity on the PDP. DOM injection reproduced; real-browser execution was not tested. | Escaped untrusted product values at the shop, PDP, cart/mini-cart, and admin product/label output sinks; encoded the category URL value. Re-tested with the poisoned legacy object: S01-D03–D11 pass. **Local source fix only; not deployed to staging or production.** |
| A quote-bearing legacy media URL could escape an HTML attribute and create an event-bearing SVG in product/review media renders. | **Low (provisional):** current product API write validation rejects such media; exploitation would require legacy, imported, or otherwise corrupted stored data. No public media-write path or JavaScript execution was confirmed. | In the isolated DOM fixture, set a product image/review photo to `/"><svg/onload=x=1>` and render shop/PDP/cart surfaces. Pre-fix jsdom created `svg[onload]`; the handler did not execute. The API write probe rejects this media URL with HTTP 400. | Hardened client `safeUrl` to reject quote/angle/backtick/space/control characters as defense in depth. Poisoned-media DOM assertions and API W03 pass. **Local source fix only; not deployed to staging or production.** |
| Array-valued product filter query caused an exception/HTTP 500 (`strtolower()` received an array). | **Low (provisional):** malformed unauthenticated GET returns a server error; no data exposure or write was seen. | Before fix, call `/api/products?q[]=ring` in the isolated PHP fixture; it returned generic HTTP 500. | Validate `category`, `q`, `metal`, and `tag` as strings before filtering; malformed arrays return HTTP 400. Re-tested all four filter arrays: S01-T tests pass. **Local source fix only; not deployed to staging or production.** |

## S02 results — partial local QA only (1 Oct 2026)

A pre-fix, cross-origin-shaped PHP-WASM probe reached the local JSON write routes: contact, service, guest-checkout, and login requests returned 200; OTP returned 502 because provider credentials were not configured. The isolated in-memory fixture recorded one contact, one service request, one provisional order, one OTP record, and three QA tokens. No SMS was sent, no merchant credentials were used, and no live browser, MySQL server, staging site, or production API was involved. This demonstrates local route reachability and fixture-side effects only; it is not a live CSRF exploit confirmation. That earlier run used the then-current shared seed, which read `cms/data/db.json` before replacing some fixture collections; the post-fix S01/S02 harness now uses wholly synthetic fixtures, and no local database records are sent externally.

The local fix in `cms/api.php` rejects state-changing requests whose supplied Origin does not match the request host/scheme/port, rejects opaque `Origin: null`, and requires JSON media type for JSON-body routes. Requests with no Origin remain supported for server-to-server clients; GET/HEAD/OPTIONS are not subject to the write-Origin check, and the signed Cashfree webhook retains its independent verifier path. `node tools/mega/smoke/s02-csrf-check.js`: **14 passed, 0 failed** on the v186 working tree and extracted overlay. The probes cover foreign/opaque origins, `text/plain` cross-site writes, cross-origin JSON with bearer auth, cookie-only admin auth, same-origin writes, and no-Origin server-to-server JSON.

**Severity: High (provisional).** The pre-fix local fixture accepted cross-site-shaped contact, service, guest-checkout, and login requests; OTP did not reach a provider because it was unconfigured. Potential abuse depends on the production origin, proxy/host configuration, provider credentials, and downstream side effects, none of which was validated. The local fix is not deployed.

**Still not tested for S02:** real browser CORS/preflight and cookie behavior; deployed Hostinger/proxy scheme and alias handling; actual OTP/SMS effects; MySQL-mode behavior; integration from checkout/auth/contact/service/admin screens; authorized staging or production. The S01/S02 fixtures are now fully synthetic and do not read `cms/data/db.json`. The historical regression belt still has legacy checks that read the local CMS database (including catalogue-specific checks); those are distinct from the S01/S02 QA fixtures, are not sent externally, and do not establish live-system behavior.

### Preliminary S02 finding

| Issue | Provisional severity | Reproduction and outcome | Fix and retest |
|---|---|---|---|
| Before the local guard, browser-simple/cross-origin-shaped JSON requests could reach state-changing routes in the isolated fixture, including contact/service submissions, guest checkout, and login token issuance. | **High (provisional):** cross-site actions could create records or tokens; exact production impact is unverified. OTP returned 502 with `configured:false`; no SMS was sent. | PHP-WASM fixture requests supplied a foreign Origin and `text/plain` JSON body. Before fix: contact/service/guest checkout/login returned 200, OTP returned 502, and fixture counters showed the listed side effects. This was not a real-browser test. | Added exact host/origin checks for unsafe methods and JSON media-type enforcement in `cms/api.php`; retained no-Origin server calls and signed-webhook verification. After fix: S02-C01–C14 pass. **Local source fix only; not staging/production verified.** |

### S01 batch inventory and before/after notes

| File/component | Change in this batch | Before → after evidence |
|---|---|---|
| `cms/api.php` — product-list filters, CSRF boundary, release telemetry | Reject non-string `category`, `q`, `metal`, and `tag`; reject cross-origin unsafe methods and non-JSON JSON-route bodies; stamp release 186. | `q[]=ring` produced HTTP 500 before; all four arrays now return 400. S02 baseline cross-origin-shaped writes reached routes; 14/14 post-fix probes reject them. Source/package are pushed; neither is staged or deployed. |
| `cms/js/app.js` — shop facets, PDP, saved items, cart, mini-cart and shared `safeUrl` media validator | Escape product-derived filter values and metadata; URL-encode the PDP category query; reject HTML-attribute delimiters/control characters in URLs. | Poisoned metadata and a quote-bearing legacy media URL produced active-looking SVG/event-handler nodes pre-fix; current jsdom checks see no targeted nodes and keep values inert across shop/PDP/cart/mini-cart/review media. |
| `cms/js/admin.js` — product table, ring-weight list, print label title | Escape product SKU/category/purity values at identified sinks. | Source-level assertions pass; an actual admin browser render was not exercised in this local DOM harness. |
| `tools/mega/smoke/s01-api-check.js`, `s01-dom-check.js` | Add isolated PHP-WASM and jsdom S01 probes. | 25 API probes and 29 DOM assertions pass with synthetic QA data; the S01 DOM harness does not read `cms/data/db.json`. |
| `tools/mega/smoke/php-api-fixture.js` | Replace the shared DB-reading `seed()` with two synthetic QA products, QA identities, settings, rates and empty collections; default fixture requests carry JSON headers/length. | Current S01/S02 and v179–v184 PHP fixture checks pass without loading repository data into their fixture. |
| `tools/mega/smoke/s02-csrf-check.js` | Add foreign-origin, simple-content-type, opaque-origin, cookie-only and same-origin/no-Origin controls. | 14/14 isolated PHP-WASM probes pass; no provider request/SMS sent. |
| `tools/mega/smoke/v183-check.js`, `v184-check.js`, `v185-check.js`, `v186-check.js`, `v186-dom-check.js` | Keep hero/carousel and v184 settlement assertions active on current releases; add forward-aware v183 behavior checks and v186 source/DOM gates. | v183 forward behavior 8/8 with one stamp-exact skip; v184 8/8; v185 stamp-exact check skips on 186; v186 8/8 source and 15/15 synthetic DOM pass on the working tree and extracted overlay. |
| `tools/mega/smoke/v154-php-run.js`, `v164-php-run.js` | Update legacy PHP request harnesses for required JSON media type and byte length. | Initial regression failures were traced to missing headers; after harness correction v154 passes 11/11 and v164 passes 17/17. |
| `tools/mega/smoke/package.json` | Include v187 source/PHP/admin-DOM gates, forward-compatible v186 checks, S01/S02, and retained release regressions. | Full smoke chain exits 0; expected retired/stamp-exact checks are explicitly reported as skips. |
| `docs/PRELAUNCH-AUDIT-TRACKER-2026-10-01.md` | Record partial evidence, provisional findings, limitations, and file inventory. | Checklist remains 0/111 fully verified; selected S01–S04, S12, and R3/R4 items have partial local evidence only. |

## 1. Security — 12 items

| ID | Required direct test | Status |
|---|---|---|
| S01 | Probe forms, search, filters, and URL parameters for SQL/NoSQL injection and reflected, stored, and DOM XSS. | Partial: 25 isolated PHP API checks + 29 jsdom assertions pass after three local fixes; integrated form flows, MySQL runtime, real-browser execution, staging/live remain untested |
| S02 | Attempt CSRF against checkout, login, forms, and admin state changes. | Partial: baseline cross-origin-shaped PHP-WASM probes reached contact/service/guest-checkout/login routes; after local Origin + JSON media-type guards, 14/14 isolated probes pass. Fixtures are synthetic. Real browser, provider, MySQL, staging/live remain untested. |
| S03 | Test Cashfree Secure ID/KYC login for bypass, replay, session fixation, expiry, cookie flags, and logout token invalidation. | Partial local only: v187 PHP-WASM tests expired bearer rejection, logout token invalidation/replay rejection, server-generated random token shape, and source confirms bearer-header rather than cookie auth. Cashfree Secure ID/KYC login flow, bypass/replay/session-fixation end-to-end, cookie/header behavior on the host, in-app browser and staging/live remain untested. |
| S04 | Attempt IDOR by changing user/order/address IDs in API calls. | Partial local only: synthetic PHP-WASM verifies a member sees only their order list/address book, cannot GET another member’s order, and cannot delete another member’s address. Other user-/order-/address-ID routes, admin-vs-member policy, staging/live remain untested. |
| S05 | Verify separate strong admin authentication, non-guessable access, login rate limits, and absence of default credentials. | Not tested |
| S06 | Probe API auth, CORS, rate limits, and bot protection for login, OTP, search, and checkout. | Not tested |
| S07 | Run SSL Labs; verify certificate chain, HTTPS enforcement, and HSTS. | Not tested |
| S08 | Test CSP, X-Frame-Options/frame-ancestors, X-Content-Type-Options, and Referrer-Policy with a header scanner. | Not tested |
| S09 | Scan dependencies for known CVEs. | Not tested |
| S10 | Verify PCI scope, that card data never reaches Shivaa servers, and webhook signatures server-side. | Not tested end-to-end |
| S11 | Verify encryption of customer/KYC/order data and backups at rest. | Not tested |
| S12 | Test upload type/size validation, storage outside web root, and malware scanning. | Partial local only: v187 source + 11 PHP-WASM checks cover 8 MB cap, magic bytes, proof-before-store, fail-closed private path, 0700/0600 permissions, admin-only streaming and legacy migration. Apache/LiteSpeed enforcement, real filesystem/production records, antivirus/malware scanning and staging/live remain untested. |

### S12 preliminary KYC document privacy finding — v187 local remediation, not live-verified

| Issue | Provisional severity | Reproduction steps / evidence | Recommended fix and retest |
|---|---|---|---|
| Business-card uploads were stored under `cms/uploads/kyc/` and recorded as `/uploads/kyc/card_<10 hex>.<ext>`. The KYC `.htaccess` denied active/executable formats but did not deny JPEG/PNG/WEBP/GIF/PDF; the root `.htaccess` serves existing files, and the admin UI rendered the stored reference as a direct link/image. This is source/config evidence that a document could be fetched directly if its URL were known; **no live document URL was probed or fetched**. | **Medium (provisional):** KYC/business contact details may be sensitive, but exploitation requires a URL disclosure/knowledge; no enumeration, leak or live access was demonstrated. | Before fix, source review showed the upload destination, allowed passive extensions, direct-file root routing, and admin raw `href`/`img` sinks. A Node baseline assertion confirmed all four source/config conditions. This was not an HTTP/browser/production reproduction. | Store new files in a private sibling of the document root with restrictive permissions; persist only opaque internal refs; deny all direct requests to `/uploads/kyc/`; stream by partner ID only after `need_admin`; migrate legacy files by verified copy → DB save → public copy removal; remove direct links from admin UI. After fix: v187 source 9/9, PHP-WASM 11/11, admin jsdom 6/6, storefront regression 15/15, extracted-overlay checks pass. Still unverified on the actual Apache/LiteSpeed host; no malware scanner is included. |

## 2. Data Privacy & India Compliance — 4 items

| ID | Required direct test | Status |
|---|---|---|
| P01 | Verify consent before personal-data collection, privacy-policy clarity, and access/deletion request handling under DPDP. | Not tested |
| P02 | Verify company/seller details, grievance contact, cancellation, returns, and refunds are clearly displayed under E-Commerce Rules. | Not tested |
| P03 | Verify generated invoices against GST format requirements and jewellery HSN codes. | Not tested by tax/legal review |
| P04 | Verify live gold listings display accurate BIS hallmark/HUID information to shoppers. | Not tested live |

## 3. Functionality — 11 items

| ID | Required direct test | Status |
|---|---|---|
| F01 | Complete browse → cart → discount → address → payment → email/SMS confirmation → account-order flow. | Not tested end-to-end |
| F02 | Manually verify every calculator's arithmetic and live-rate refresh. | Not tested in full |
| F03 | Test search, price slider, facets, sorting, active-filter pills, and combined filters. | Not tested at catalog scale |
| F04 | Verify Quick View opens as a modal without navigation. | Not tested |
| F05 | Verify all hero slides autoplay and every link resolves correctly. | Not tested on live site |
| F06 | Test OTP paste/autofill, auto-verification, and failure states on real devices. | Not tested on real devices |
| F07 | Validate ring-size mapping against a physical ring sizer. | Not tested |
| F08 | Submit B2B/jeweller forms and verify delivery and validation. | Not tested end-to-end |
| F09 | Verify cart/wishlist persist across sessions and devices. | Not tested |
| F10 | Crawl all routes/catalog items for 404s and broken links. | Not tested across full catalog |
| F11 | Exercise every button, navigation link, and footer link for dead clicks. | Not tested site-wide |

## 4. Performance & Always-Latest-Version — 7 items

| ID | Required direct test | Status |
|---|---|---|
| PERF01 | Verify all static assets are versioned/hashed and returning users receive the deployed build. | Partial: v187 source/cache stamps are gated and a safe live `/api/version` GET confirmed v186 with matched stamps; stale-client and real service-worker/CDN behavior remain untested |
| PERF02 | Test service-worker update-on-reload and confirm old caches cannot trap users. | Not tested on returning clients |
| PERF03 | Verify CDN and browser caching headers separately for images and HTML. | Not tested |
| PERF04 | Run PageSpeed/Lighthouse Core Web Vitals on mobile and desktop. | Not tested |
| PERF05 | Audit catalog-wide lazy loading, compression/WebP, and correctly sized images. | Not tested across catalog |
| PERF06 | Measure database/catalog query performance at large result-set scale. | Not tested at scale |
| PERF07 | Load-test checkout and search with concurrent users. | Not tested |

## 5. Mobile & Cross-Browser — 3 items

| ID | Required direct test | Status |
|---|---|---|
| MOB01 | Test on real iOS Safari, Android Chrome, and an older device. | Not tested on real devices |
| MOB02 | Check touch targets, horizontal scrolling, and overlap at 360, 390, 768, and 1024 px. | Not tested at all requested breakpoints on devices |
| MOB03 | Compare functionality/layout in Chrome, Safari, Firefox, and Edge. | Not tested across browsers |

## 6. Accessibility — 2 items

| ID | Required direct test | Status |
|---|---|---|
| ACC01 | Run axe DevTools/Lighthouse accessibility audit against WCAG 2.1 AA. | Not tested with axe/Lighthouse |
| ACC02 | Audit product-image alt text, keyboard navigation, and color contrast in the gold/maroon theme. | Not tested site-wide |

## 7. SEO — 3 items

| ID | Required direct test | Status |
|---|---|---|
| SEO01 | Verify titles/descriptions on every page, XML sitemap, and robots.txt. | Not tested site-wide |
| SEO02 | Validate Product schema for price, availability, and images on listings. | Not tested |
| SEO03 | Verify canonical URLs prevent duplicate content for filtered/sorted catalog views. | Not tested |

## 8. Monitoring — 3 items

| ID | Required direct test | Status |
|---|---|---|
| MON01 | Verify uptime monitoring and production error logging (e.g. Sentry) are wired up. | Not tested |
| MON02 | Verify automated daily backups and perform a restore test. | Not tested |
| MON03 | Verify a staging environment exists and is used before future production changes. | Not verified; staging was skipped before the v184 production extraction |

## Round 2 — A. Business Logic & Fraud — 8 items

| ID | Required direct test | Status |
|---|---|---|
| R2A01 | Tamper with price/quantity via browser/API and verify server-side live-rate recalculation. | Not tested as an exploit attempt |
| R2A02 | Test coupon reuse, stacking, and reuse after consumption. | Not tested |
| R2A03 | Simulate simultaneous purchases of the final inventory unit. | Not tested |
| R2A04 | Test repeat Gold Biscuit entries via multiple accounts/phone numbers. | Not tested |
| R2A05 | Test quiz endpoint rate limits and scripted/fake qualifying-purchase abuse. | Not tested |
| R2A06 | Cancel/refund a qualifying purchase and verify draw-entry revocation. | Not tested |
| R2A07 | Audit draw-entry PII storage and draw-selection logs/auditability. | Not tested |
| R2A08 | Test refund/non-receipt claims after delivery confirmation. | Not tested |

## Round 2 — B. Website ↔ CRM/ERP — 5 items

| ID | Required direct test | Status |
|---|---|---|
| R2B01 | Run a real order end-to-end and verify reliable CRM persistence with no silent drop. | Not tested; live CRM access not exercised |
| R2B02 | Compare ERP MCX controls to the live site calculator rate in real time. | Not tested |
| R2B03 | Sell on the site and verify ERP inventory decrements without drift. | Not tested |
| R2B04 | Cause a sync failure and verify an alert is raised. | Not tested |
| R2B05 | Verify every website order produces a GST-compliant ERP invoice without manual steps. | Not tested |

## Round 2 — C. Deeper Security — 7 items

| ID | Required direct test | Status |
|---|---|---|
| R2C01 | Inspect client source/network traffic for Cashfree, rate API, or admin secrets. | Not tested live; source-only secret-projection checks are not a network audit |
| R2C02 | Probe common paths for exposed `.env`, `.git`, SQL, ZIP, and backup files. | Not tested |
| R2C03 | Verify SPF, DKIM, and DMARC for the sending domain. | Not tested |
| R2C04 | Replay a payment-success webhook and confirm no duplicate payment/order/charge. | Not tested as a live replay |
| R2C05 | Probe post-login/payment redirect parameters for open redirects. | Not tested |
| R2C06 | Test catalog bot/scraper protections at the stated catalog scale. | Not tested |
| R2C07 | Test clickjacking protection in deployed response headers/frame ancestors. | Not tested live |

## Round 2 — D. Failure & Fallback — 3 items

| ID | Required direct test | Status |
|---|---|---|
| R2D01 | Force live gold-rate API outage/timeout and check timestamped fallback/error behavior. | Partial: fallback logic has repository regression coverage; no live outage test |
| R2D02 | Force payment timeout and verify pending state/reconciliation without duplicates. | Not tested live |
| R2D03 | Trigger 500 responses and verify no stack traces leak. | Not tested on deployed failure paths |

## Round 2 — E. Campaign Load Readiness — 2 items

| ID | Required direct test | Status |
|---|---|---|
| R2E01 | Load-test checkout, calculator, and OTP at expected campaign-peak concurrency. | Not tested |
| R2E02 | Verify SMS/OTP provider throughput headroom for a signup spike. | Not tested with provider |

## Round 2 — F. Accessibility/UX Edge Cases — 3 items

| ID | Required direct test | Status |
|---|---|---|
| R2F01 | Verify Quick View focus trap, Escape close, and focus restoration. | Not tested end-to-end |
| R2F02 | Verify ARIA labels on icon-only cart, wishlist, and search buttons. | Partial repository accessibility checks exist; no full deployed audit |
| R2F03 | Verify numeric keyboard on phone/OTP fields on actual devices. | Not tested on real devices |

## Round 3 — A. Usability — 11 items

| ID | Required direct test | Status |
|---|---|---|
| R3A01 | Count checkout taps/fields, remove unnecessary fields, and confirm guest checkout. | Not tested with a real purchase |
| R3A02 | Search common misspellings/partial terms at catalog scale and judge relevance. | Not tested at scale |
| R3A03 | Verify facet counts, Clear All, and sticky-filter overlap. | Not tested |
| R3A04 | Verify persistent form labels and inline field validation. | Partial accessibility/source regression checks exist; not a whole-site form audit |
| R3A05 | Verify explanations/tooltips for wastage, making charges, tunch, and purity. | Not tested across calculators |
| R3A06 | Verify skeleton/spinner loading states on every data fetch. | Partial source/UI regression coverage only |
| R3A07 | Verify empty cart/wishlist/search states have useful next actions. | Not tested comprehensively |
| R3A08 | Verify Add to Cart and Buy Now behaviors are distinct and consistent. | Not tested site-wide |
| R3A09 | Verify breadcrumbs on deep catalog navigation. | Not tested |
| R3A10 | Test browser/mobile Back through checkout without lost state. | Not tested on devices |
| R3A11 | Verify mobile sticky Add to Cart/price bar and no content overlap. | Not tested |

## Round 3 — B. Mobile Compatibility — 7 items

| ID | Required direct test | Status |
|---|---|---|
| R3B01 | Test UPI app-switch/return inside Instagram's in-app browser without lost cart/order state. | Not tested in Instagram WebView |
| R3B02 | Test SMS OTP autofill on Samsung, Xiaomi/MIUI, and stock Android. | Not tested on those devices |
| R3B03 | Test real screen widths from 320 px through large phones/phablets and likely foldables. | Not tested on real devices |
| R3B04 | Check notch/punch-hole/gesture-bar safe areas. | Not tested on devices |
| R3B05 | Test Samsung Internet browser. | Not tested |
| R3B06 | Test native address/payment autofill. | Not tested on devices |
| R3B07 | Verify Add to Home Screen icon and splash screen. | Not tested on devices |

## Round 3 — C. Mobile Smoothness/Performance — 11 items

| ID | Required direct test | Status |
|---|---|---|
| R3C01 | Verify catalog grid virtualization/windowing and frame drops during fast scrolling. | Not tested on a large catalog/device |
| R3C02 | Verify progressive image loading, WebP fallback, and mobile-sized image delivery. | Partial v183 responsive-image checks exist; not catalog-wide or device-tested |
| R3C03 | Measure hero/modal/slider animation frame rate near 60 fps on devices. | Not tested on devices |
| R3C04 | Measure tap responsiveness and verify `touch-action` behavior/double-tap zoom. | Not tested on devices |
| R3C05 | Test keyboard viewport behavior and Next-field navigation. | Not tested on devices |
| R3C06 | Test sticky header/footer behavior as browser bars hide/show. | Not tested on devices |
| R3C07 | Crawl every page for unintended horizontal scroll. | Not tested site-wide on devices |
| R3C08 | Test homepage/product/checkout under slow 3G/4G throttling and record usable load time. | Not tested |
| R3C09 | Observe memory/slowdown/crashes during long catalog browsing on lower-end Android. | Not tested on devices |
| R3C10 | Verify live-rate ticker polling interval and mobile battery/data impact. | Not tested in production observation |
| R3C11 | Verify all form inputs are at least 16 px and avoid iOS zoom-on-focus. | Partial source fix: v186 adds a ≤767 px 16 px rule for editable inputs/selects/textareas; site-wide computed styles and actual iOS focus behavior remain untested. |

## Round 4 — A. Instant Feedback — 5 visible items

| ID | Required direct test | Status |
|---|---|---|
| R4A01 | Verify every tap receives visible feedback within 100 ms. | Partial source evidence: active/tap styling and haptic hooks exist; no site-wide timing measurement or real-device test. |
| R4A02 | Verify Add to Cart flying-image animation and cart-badge bounce. | Partial: source has fly-to-bag and badge-bump effects; v186 synthetic DOM confirms immediate cart state/toast, but reduced-motion fixture suppresses animation and visual/device behavior is untested. |
| R4A03 | Verify wishlist heart fill/burst interaction. | Partial: heart animation exists; v186 synthetic DOM confirms optimistic state/ARIA and rollback, not visual burst timing on devices. |
| R4A04 | Verify add/remove/save actions show non-blocking, auto-dismissing confirmation. | Partial: v186 DOM checks add/remove and source retains save/move-back toasts; every surface and real assistive-technology announcement are not fully exercised. |
| R4A05 | Verify optimistic cart/wishlist/quantity updates and rollback only on real sync failure. | Partial: local cart changes immediately; synthetic member-wishlist success, failure/read-back rollback, and rapid-tap serialization pass; quantity and live session failure behavior remain untested. |

## Round 4 — B. Loading — 4 visible items

| ID | Required direct test | Status |
|---|---|---|
| R4B01 | Verify content-shaped skeleton/shimmer replaces blank screens/generic spinners. | Partial source/UI checks exist; first-paint and PDP skeletons are present, but every network state is not covered. |
| R4B02 | Verify blurred low-resolution image placeholder resolves sharply without layout shift. | **Not complete:** current shimmer/blur-to-sharp reveal is not a product-specific low-resolution placeholder; no thumbnail pipeline or layout-shift measurement was added. |
| R4B03 | Verify likely next product detail is prefetched on card touch. | Partial: v186 synthetic DOM confirms pointerdown prefetch and route reuse (V186-D01/D02); real touch/in-app-browser cache timing remains untested. |
| R4B04 | Verify branded pull-to-refresh on catalog/listing pages. | Partial: v186 synthetic touch events and accessible refresh button pass (V186-D11–D13); physical iOS/Android/browser behavior remains untested. |

## Round 4 — C. Native-feeling Navigation — incomplete prompt fragment (not counted)

| Visible fragment | Status |
|---|---|
| “Persistent bottom navi…” | Prompt ends mid-item. The shell currently contains a fixed mobile navigation with Home, Shop, Rates, Wishlist, and Account plus safe-area CSS, but the requested destinations/visibility/interaction acceptance is incomplete. Do not mark this fragment passed or infer additional Round 4 items; owner must provide the omitted text. |

## Process requirements from the prompt (not counted in the 111 complete bullets)

| Requirement | Status |
|---|---|
| Rank actual findings by severity and include reproduction steps and fixes. | Five preliminary findings (three S01, one S02, one S12 KYC privacy) include provisional severities, reproductions and local retests above; no complete audit-wide ranking yet. Apply the owner's Critical-severity rules to any future confirmed R2 business-logic/fraud, CRM/ERP, or Instagram in-app-browser R3B failure. |
| Fix Critical security, then High, Medium, Low; handle one issue at a time. | Three S01 issues and the S02 CSRF-shaped write issue were fixed in source with targeted tests; broad audit remediation remains. |
| Re-test each fix and adjacent flows; re-attempt security exploits after fixes. | S01 API/DOM, S02 request probes, v183 hero regression, v184 reconciliation fixtures and adjacent smoke checks pass locally; production/staging retests are not done. |
| Do not hide errors or hardcode around root causes. | Two legacy fixture failures were traced to missing request headers, corrected at the harness, then retested (v154 11/11; v164 17/17). Current-release suites remain active. |
| Stage before production and confirm cache/version behavior. | v187 is a local, extracted-overlay-tested candidate based on the 2 Oct confirmed v186 live release. No staging or production upload/cache purge was performed. Explicit owner approval is required; the KYC legacy migration is a separate data-changing admin action that must not be run on production without explicit approval. |
| Provide final pass/fail table and deployment date. | This tracker records partial pass/fail evidence; a complete audit-wide table and deployment date are unavailable because most checks remain untested and no deployment occurred. |

## v185 predecessor-package evidence (separate from the 111-item audit)

- Historical v185 source gate: **4/4 passed**; the v185 package is retained on the session branch. It was not staged or deployed.
- Historical v185 checks: v184 static **8/8**, v184 PHP-WASM **6/6**, S01 API **25/25**, S01 DOM **29/29**, S02 **14/14**, v183 stamp-specific **9/9** on that v185 source.
- Historical `shivaa-update-v185.zip`: **21 entries, 2,155,090 bytes, SHA-256 `00bc84c3acd35d36f3ebb40ac7a2569759ac67888b2ca37e78b6ac32101f9d56`**. It is a cumulative overlay, not a full-site backup. Do not deploy an older overlay over a newer release.

## v186 candidate evidence (separate from the 111-item audit)

- `node tools/mega/smoke/v186-check.js`: **8 passed, 0 failed**. Covers release/cache stamps, product-detail prefetch/reuse source shape, catalog refresh, wishlist synchronization/rollback/accessibility, cart feedback, mobile form font size, and campaign hash protection.
- `node tools/mega/smoke/v186-dom-check.js`: **15 passed, 0 failed** using synthetic data. Covers prefetch and route reuse; guest/signed-in wishlist optimistic success, rejection, and rapid-tap reconciliation; cart add/remove feedback; valid/empty catalog refresh and pull gesture; and uncaught-error monitoring.
- Full `npm test`: **exit 0**. Deployment-approval gate **20/20**; relay **7/7**; v186 source **8/8** and DOM **15/15**; v184 source **8/8** and PHP **6/6**; S01 API **25/25**, S01 DOM **29/29**, S02 **14/14**; v183 forward behavior **8/8 with one stamp-exact skip**; v167 **36/36**; retained smoke/PHP suites pass. v185 stamp-exact test is skipped on release 186; retired release checks explicitly report SKIP.
- `npm run test:regression`: **45 suites passed, 26 retired/stamp-specific suites skipped, 0 failed** (exit 0).
- `shivaa-update-v186.zip`: **22 entries, 2,160,234 bytes, SHA-256 `9c5ec601b1a460bf9c51aa6dd2313080975c2fbc2944aa2994290f3c076339e3`**. Builder verifies the exact allowlist, CRC, source-byte equality, release/cache stamps, excluded paths, and protected campaign hashes.
- Extracted-overlay retest: package applied to a clean local `HEAD` CMS tree (release 184) in a temporary directory; v186 source **8/8**, DOM **15/15**, v184 source **8/8**, v184 PHP **6/6**, S01 API **25/25**, S01 DOM **29/29**, S02 **14/14**, and v183 forward behavior **8/8 with one stamp-exact skip**. This is not staging/production behavior.
- Partial Round 4 evidence only: the v186 synthetic suite supports prefetch, refresh, optimistic wishlist/cart feedback and selected mobile control behavior. No item is fully verified against real users/devices; the audit-wide count remains **0/111 fully verified**. Round 4's persistent-bottom-navigation prompt is still incomplete.
- At v186 package build time there was no deployment. A later safe GET on 2 Oct 2026 independently confirmed v186 live with matched stamps and MySQL 78/78; this does not prove how the package reached production or verify its features. No v187 upload/cache purge occurred.
- Prior payment audit inventory: 17/18 marked FIXED; #27 remains the owner-policy decision. The settlement report has not been run against Cashfree by this agent.
- PHP-WASM and jsdom are not native PHP/MySQL, real-browser, in-app-browser, device, hosting-proxy, load, CRM/ERP, legal or live financial-close tests. No such behavior is claimed.


## v187 candidate evidence — private KYC business-card handling (2 Oct 2026)

- Production baseline before local work: safe GET `https://shivaa.in/api/version` returned v186, shell `shivaa-shell-v186`, release stamps matched, MySQL mode, 78 SQL/JSON rows, `mirrorBehind:false`. No KYC file request was made.
- Finding selected: provisional Medium KYC upload privacy risk (S12); see the reproduction/fix table above. The source/config evidence is not a claim that a real production file was accessed.
- `tools/mega/smoke/v187-check.js`: **9/9**. `v187-php-run.js`: **11/11** isolated PHP-WASM tests (unverified upload not persisted; size/type rejection; private path fail-closed; verified upload stored outside synthetic docroot with 0700/0600 modes; admin stream allow/deny; legacy migration/copy/delete/idempotence/path traversal; plus partial S03/S04 expiry/logout/random-token/order/address ownership checks). `v187-admin-check.js`: **6/6** synthetic jsdom checks. `v187-dom-check.js`: **15/15** carried forward. `v186-check.js`: **8/8**, made forward-compatible.
- `npm test --prefix tools/mega/smoke`: **exit 0** (full retained smoke chain). `npm run test:regression --prefix tools/mega/smoke`: **47 suites passed, 26 retired-feature suites skipped, 0 failed**.
- Extracted-overlay retest: applied the 6-file v187 ZIP over a clean local CMS archive of v186 source commit `7a9b0f9`; v187 source 9/9, v186 forward source 8/8, v187 storefront DOM 15/15, admin KYC DOM 6/6, PHP-WASM 11/11.
- `shivaa-update-v187.zip`: **6 entries, 459,919 bytes, SHA-256 `50a1df1247006c71b51c523d41037c9e12f0abd665773041e9b49668359054ab`** at build time; deterministic allowlist includes only API, index, app/admin JS, service worker and `uploads/kyc/.htaccess`. Database, config/credentials, KYC/customer uploads, campaign media, docs/tests are excluded. Re-run `python3 tools/mega/build-v187-package.py` after source changes.
- **Not tested:** real PHP/FPM, Hostinger open_basedir/permissions, Apache/LiteSpeed honoring the KYC `.htaccess`, actual legacy production files, live authenticated stream, antivirus/malware scanning, real browser/in-app browser, staging or production. S03/S04/S12 remain partial; total remains **0/111**. Round 4 persistent-navigation text remains truncated and unguessed.
- Deployment state: package is a staging-only overlay on confirmed v186. No staging/production installation, cache purge, or live v187 check; owner approval remains required. Do not click the admin legacy-migration action against real records without separate explicit consent to migrate those files.
