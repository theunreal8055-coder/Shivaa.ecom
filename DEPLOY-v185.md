# UPDATE v185 — Single `public_html` Overlay (Staging Candidate)

**Built:** 1 Oct 2026 · **Release stamp:** 185 · **Branch:** `arena/01a0f602-shivaa-ecom`

> **Status: staging-only review artifact. Not staged, not uploaded, and not approved for production.**
> The owner-reported live release is v184. This archive is a cumulative root-layout overlay containing the v183 responsive banner assets, v184 read-only Cashfree reconciliation feature, and the local S01/S02 fixes, with all release/cache stamps moved to v185. No production or staging deployment was performed by this agent.

## The one-file package

- **Archive:** `shivaa-update-v185.zip`
- **Layout:** paths are relative to the existing `public_html` root; extract as an overlay into an authorized **staging** `public_html` folder, not an empty folder.
- **Files:** 21 (5 runtime files, the v183 CSS layer, and 15 responsive banner derivatives).
- **Compressed size:** 2,155,090 bytes.
- **SHA-256:** `00bc84c3acd35d36f3ebb40ac7a2569759ac67888b2ca37e78b6ac32101f9d56`
- `unzip -t` passed; every archive member was byte-compared with its intended source. A staging-like temporary copy with `data/`, credentials/configuration, and uploads excluded was overlaid from the ZIP; the release, hero, Cashfree source, S01 and S02 gates all passed against that extracted copy.

The package contains `api.php`, `index.html`, `js/app.js`, `js/admin.js`, `sw.js`, `css/v183.css`, and responsive WebP/JPEG derivatives for the hero, four non-campaign slides, and wedding banner. It intentionally excludes `data/db.json`, configuration, credentials, uploads, tests/docs, and the unchanged Gold Biscuit campaign image. The existing campaign card markup/image hashes are checked and unchanged. There is no database migration in this UI/API/cache update.

## Change summary / before → after

- **S01 — input/output handling:** malformed array-valued product filters formerly raised HTTP 500; they now return 400. Tested poisoned stored product/media values that created active-looking SVG/event-handler nodes in jsdom remain inert/encoded in the targeted shop, PDP, cart, review, account, service and admin render paths. This is a local fix, not a full XSS/SQLi clearance.
- **S02 — CSRF-shaped requests:** before the local guard, foreign-origin/simple-content-type requests reached contact, service, guest-checkout and login routes in PHP-WASM. The API now checks Origin against the request host/scheme/port for unsafe methods and requires JSON media type for JSON-body routes. No-Origin server-to-server requests and the independently signed Cashfree webhook remain supported. Real-browser, proxy and provider behavior remain untested.
- **v184 — Cashfree reconciliation:** the archive retains the admin-only, read-only, cursor-paged settlement report. It compares successful provider payment IDs, order IDs and gross amounts; it does not mutate orders or payments. It has not been tested against merchant credentials or a live Cashfree response.
- **v183 — home hero/banner:** the archive includes the responsive hero and the four non-campaign carousel slides with keyboard/reduced-motion behavior and responsive assets. The separate Gold Biscuit campaign entry card, image, copy, order and behavior were not changed.
- **Release/cache:** page, app, service-worker shell/assets and API telemetry now use 185; the media-cache generation stays at v168. Stale-client behavior still requires staging verification.

## Verification on the v185 working tree

- `npm test`: **PASS**; deployment approval gate 20/20, v185 source gate 4/4, v184 source gate 8/8, v184 PHP-WASM 6/6, S01 API 25/25, S01 DOM 29/29, S02 14/14, v183 forward regression 9/9, and the retained active smoke checks completed. Expected superseded-release checks were reported as skips. The relay suite passed 7/7 after the stale local process was stopped.
- `npm run test:regression`: **PASS** — 46 suites passed, 24 retired-feature suites skipped, 0 failed (exit 0). The first attempt exposed two legacy PHP fixtures that omitted `Content-Type`; their requests now send `application/json` and correct `Content-Length`. This historical regression belt still contains legacy tests that read the local CMS database (including catalogue-specific checks); it is separate from the new S01/S02 fixtures, which are fully synthetic.
- Extracted-overlay gates: v185 4/4; v184 static 8/8 and PHP 6/6; v183 9/9; S01 API 25/25; S01 DOM 29/29; S02 14/14.
- ZIP CRC/integrity and explicit allowlist checks passed. `cms/api.php` was parsed/executed by PHP-WASM; native PHP CLI and MySQL mode were not tested.

These automated local results do not complete the requested four-round pre-launch audit. The tracker remains **0/115 fully verified**, with S01 and S02 partial only; the Round 4 prompt itself was truncated. No real device/in-app-browser, visual approval, staging, production, Cashfree, CRM/ERP or live hosting-layer test is claimed.

## Required next step: authorized staging only

1. Obtain the owner-authorized staging destination and backup/rollback procedure. Do not use the production `public_html` for this candidate.
2. Verify the archive checksum, then extract its root-layout contents over the existing staging site. It does not contain private data/configuration and is not a full site backup.
3. On staging, verify `/api/version` reports release 185 with matched index/app/worker stamps; inspect cache refresh and the service-worker behavior on a previously loaded client.
4. Exercise the affected S01/S02 flows in real browsers, verify Hostinger/proxy host/scheme behavior and checkout/login/form/admin writes, then retest the visible Cashfree report only with authorized test credentials.
5. Review the hero/banner visuals on actual desktop/mobile devices and in Instagram's in-app browser. Keep the Gold Biscuit campaign surfaces untouched.
6. Record staging evidence, resolve/mark every audit checklist item, then obtain explicit owner approval before any production rollout.

No staging or production changes have been made by this agent. This archive alone is not deployment authorization.
