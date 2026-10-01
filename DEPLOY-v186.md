# Shivaa v186 — staging-only update overlay

**Built:** 1 Oct 2026
**Release stamp:** 186
**Branch:** `arena/01a0f602-shivaa-ecom`
**Source/package commit:** `7a9b0f9`
**Live status:** owner-reported release 184; not re-probed in this turn
**Deployment status:** no staging or production upload was performed. This archive is not deployment approval.

## Package

- **Archive:** `shivaa-update-v186.zip`
- **Layout:** extract its contents into the existing `public_html` document root; it is an incremental overlay, not a full-site backup.
- **Entries:** 22
- **Size:** 2,160,234 bytes
- **SHA-256:** `9c5ec601b1a460bf9c51aa6dd2313080975c2fbc2944aa2994290f3c076339e3`
- **Builder:** `python3 tools/mega/build-v186-package.py`

### Included files

- `api.php`, `index.html`, `js/app.js`, `js/admin.js`, `sw.js`
- `css/v183.css`, `css/v186.css`
- Fifteen previously approved, non-campaign responsive banner derivatives: hero desktop/mobile WebP/JPEG, four non-campaign carousel slides' desktop/mobile WebP/JPEG, and wedding desktop/mobile WebP/JPEG.

The package intentionally excludes database/customer data, configuration and credentials, uploads, `.htaccess`, installer files, tests/docs, and `images/banners/gold-biscuit-campaign.jpg`. The campaign card source and approved campaign image are hash-checked and remain unchanged.

## v186 changes and before/after notes

| Area/file | Before | v186 candidate behavior | Local evidence |
|---|---|---|---|
| Product details — `cms/js/app.js` | A product detail request started after opening the product route. | Pointer/touch/focus intent on a product link can warm a short-lived request; the route reuses it. Failed/stale entries are discarded and the map is pruned to a 24-entry cap. | Synthetic DOM: one intent request, route reuse, no uncaught runtime errors. This is not a real-device latency measurement. |
| Catalog refresh — `cms/js/app.js`, `cms/css/v186.css` | No branded pull-to-refresh or keyboard-operable refresh control for the catalog. | Adds accessible refresh button and downward pull feedback at the top of the catalog. A valid response replaces data; an empty/invalid response does not erase a working catalog. | Synthetic DOM probes cover button refresh, pull gesture, valid response, and empty response preservation. Physical iOS/Android behavior remains untested. |
| Wishlist — `cms/js/app.js` | Signed-in wishlist interaction could wait on server state and rapid requests could race. | Paints the intended state immediately, serializes mutations, reconciles confirmed server state, and rolls back only after a confirmed rejection/read-back; guest state remains local. Announces changes through a live region. | Synthetic tests cover guest persistence, optimistic server mutation, rejection rollback, success, rapid taps, and accessible state. No live account/session was used. |
| Cart feedback — `cms/js/app.js` | Cart changes could lack a clear, non-blocking confirmation. | Add/remove/save feedback uses the existing toast region with status announcement; cart count/state updates immediately. | Synthetic tests cover add, removal, toast content, and no uncaught errors. All cart surfaces and assistive technologies are not exhaustively audited. |
| Mobile form controls — `cms/css/v186.css` | Some editable controls could remain below the iOS zoom threshold. | At viewport widths up to 767 px, editable inputs, selects, and textareas use at least 16 px text. | Source gate passes. Computed style on every form and actual iOS focus behavior remain untested. |
| Release/cache | Source had v185 stamps. | HTML, app, API, worker, and versioned asset URLs move together to release 186; cache namespace advances to `shivaa-shell-v186`; media cache remains `shivaa-media-v168`. | v186 source gate and extracted-overlay checks pass. Stale-client and CDN/browser cache behavior still require authorized staging verification. |

Theme, brand colors, layout, fonts, button styles, logo artwork, and the separate Gold Biscuit campaign card/banner were not changed. The v183 hero/carousel assets are included unchanged for a cumulative overlay.

## Verification

- `npm test`: **PASS**. Deployment-approval gate 20/20; v186 source 8/8; v186 focused synthetic DOM 15/15; v184 source 8/8 and PHP-WASM 6/6; S01 API 25/25; S01 DOM 29/29; S02 CSRF 14/14; v183 forward checks 8/8 with its v183 stamp-exact assertion skipped on release 186; retained smoke checks pass. The v185 stamp-exact test is correctly skipped on release 186.
- `npm run test:regression`: **45 suites passed, 26 retired/stamp-specific suites skipped, 0 failed** (exit 0). The v183 forward regression and v186 source gate are included.
- Extracted-overlay verification: the 22-member archive was extracted over a clean `HEAD` CMS tree (release 184) in a temporary directory. v186 source 8/8; v186 DOM 15/15; v184 source 8/8; v184 PHP 6/6; S01 API 25/25; S01 DOM 29/29; S02 14/14; v183 forward 8/8 + one stamp-exact skip. This proves the archive's contents work against that local baseline, not against the production host.
- ZIP CRC, exact allowlist/member order, source-byte equality, release/cache stamps, excluded-path check, campaign card hash, and campaign image hash are verified by the builder.

## Not verified / next required steps

- No real iOS/Android device, Safari/Chrome/Firefox/Edge, Instagram/Facebook in-app browser, screen reader, Lighthouse/axe, load test, CDN/header scan, staging host, or production host was exercised.
- No live Cashfree/OTP/CRM/ERP/payment operation or customer record was accessed. The broad pre-launch tracker remains **0/111 fully verified**, plus the incomplete Round 4 “Persistent bottom navi…” fragment. v186 supplies only partial evidence for selected R3/R4 items; it does not complete the supplied audit or legal review.
- Stage only after explicit owner authorization. Before any production run, verify the target `/api/version`, make a host backup, install and validate this candidate on staging, test returning-client/service-worker cache behavior and affected checkout/account/catalog routes, then obtain separate explicit production approval. Do not deploy the ZIP directly to production based on these local results.
