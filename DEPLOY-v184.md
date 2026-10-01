# UPDATE v184 — Read-only Cashfree Settlement Reconciliation

**Built:** 1 Oct 2026 · **Release stamps:** 184 · **Branch:** `arena/01a0f602-shivaa-ecom`

> **Status: review package only — not staged, not deployed, and not approved for production.**
> No merchant credentials or live Cashfree response were available. This package is not authorization to deploy.

## What changed

- Added an admin-only, read-only **Admin → Reports → Cashfree settlement reconciliation** report. It calls Cashfree `POST /pg/settlement/recon` with `x-api-version: 2026-01-01`; ordinary checkout/order calls retain `2023-08-01`.
- Reconciles only successful `PAYMENT` events, requiring both provider event and payment statuses to be `SUCCESS`. It uses nested `payment_details.cf_payment_id`, `order_details.order_id`, and gross `payment_details.payment_amount` (falling back to the successful payment event's `event_amount` if necessary) against approved local Cashfree payments and recorded overpayments. Event settlement amount is shown separately.
- Refunds, disputes, adjustments, pending events, ambiguous identifiers, amount mismatches, and uncertain matches are surfaced for manual review. The report does not infer that a local payment is wrong just because it is absent from a settlement page.
- Uses manual cursor paging at 10 records per request. No reconciliation output is persisted; no order, payment, refund, loyalty, or audit-log mutation is made. Raw provider rows and customer details are not returned to the browser.
- Uses the Cashfree processed-on date filters with India-local calendar bounds (`00:00:00`–`23:59:59`, `+05:30`). The public reference documents the filter names and timestamp format, but does **not** specify whether exact time bounds are inclusive. Authorized staging must confirm date-edge behavior before financial-close reliance.
- Confirmed in the current docs that `POST /pg/settlements` is Get All Settlements, but its v2026 response is settlement-summary shaped rather than the payment-event rows needed for safe payment-ID matching. The event-level recon endpoint is used instead.
- Bumped the page, app, service-worker, API and asset cache release stamps to 184. No CSS, campaign artwork, campaign copy, logo, or campaign behavior was changed; the media cache generation remains unchanged.

## Before / after

| Area | Before | After |
|---|---|---|
| Cashfree reconciliation | No provider-backed settlement detail report in Admin → Reports | Admin-gated, on-demand event-level recon report with an allowlisted browser projection |
| Match basis | Local report only; no provider comparison | Successful event + payment status, Cashfree payment ID, Cashfree order ID, and gross amount; net/event settlement stays separate |
| Pagination | No provider cursor flow | Explicit 10-row pages; user must load every returned page |
| Side effects | Not applicable | No local writes, automated refunds, or scheduled reconciliation |
| Date filter | Not applicable | Processed-on date range in IST; inclusive/exclusive provider edge semantics remain unverified |
| Release/cache | v183 stamps | v184 stamps across shell, app, worker, API and asset URLs |

## Package

- **File:** `shivaa-update-v184.zip`
- **Size:** 450,455 bytes · **SHA-256:** `4853395e2b25326debf8ceb06a3101224ac4b9ce2ecab7bcf4a6c351b18da1c4`
- **Integrity:** `unzip -t` passed · **Contents:** 5 runtime files · **Layout:** paths are relative to the web root.
- Includes `api.php`, `index.html`, `js/app.js`, `js/admin.js`, and `sw.js`. It excludes test tooling, docs, protected server state, customer data, credentials and unchanged assets.

## File / component inventory

### Runtime

- `cms/api.php` — v184 release stamp; admin-only route, processed-date validation, report-scoped API version, cursor page validation, nested event comparator and allowlisted output projection.
- `cms/js/admin.js` — read-only report panel, comparison table, status explanations and explicit next-page action.
- `cms/index.html` — asset URL cache stamps moved to v184.
- `cms/js/app.js` — `APP_REL` moved to v184; no campaign surface changed.
- `cms/sw.js` — release/shell/cache asset stamps moved to v184; media cache generation unchanged.

### Documentation and verification

- `CASHFREE-INTEGRATION.md` — current endpoint choice, public contract, filter caveat and account-compatibility limitation.
- `docs/PAYMENT-EXPERIENCE-NEXT.md` — updated finding #14 and historical #13 status; #27 remains owner-blocked.
- `AGENTS.md` — current session/release/deployment controls.
- `tools/mega/smoke/v184-check.js` — eight static/runtime-source release assertions, including unchanged Gold Biscuit campaign markup.
- `tools/mega/smoke/v184-php-run.js` — six isolated PHP-WASM fixtures covering authorization, validation, fail-closed behavior, payload/response contract, safe comparison and page-size rejection.
- `tools/mega/smoke/pay-audit-check.js` — #14 source inventory updated; reports #27 as the remaining owner-policy decision.
- `tools/mega/smoke/package.json` — adds v184 checks to the full smoke chain.

## Verification results

- `node tools/mega/smoke/v184-check.js`: **8/8 passed**.
- `node tools/mega/smoke/v184-php-run.js`: **6/6 passed** using isolated PHP-WASM fixtures; no merchant/provider call.
- `node tools/mega/smoke/pay-audit-check.js`: **17/18 findings marked FIXED, #27 PRESENT; 10/10 invariants intact** (source inventory only).
- `npm test` from `tools/mega/smoke`: **PASS on final rerun**; current and retained smoke chain completed with expected superseded-release checks skipped. One earlier attempt transiently timed out in the unrelated v179 relay T05/T06 timing checks; the isolated relay suite and the final full rerun both passed all 7/7.
- `npm run test:regression` from `tools/mega/smoke`: **44 suites passed, 25 retired-feature suites skipped, 0 failed**.
- `node tools/mega/php-sweep/sweep.mjs`: **222 routes, 0 exceptions**.
- `node --check` passed for `cms/js/admin.js`, `cms/js/app.js`, `cms/sw.js`, and the updated v184/audit JavaScript checks.
- `git diff --check`: **PASS**.
- ZIP archive integrity check: **PASS**, 5 entries as listed above.
- Native PHP CLI was unavailable; PHP syntax/behavior coverage came from the repository's PHP-WASM suites and route sweep.

## Provider contract reviewed

- Cashfree [Settlement Reconciliation](https://www.cashfree.com/docs/api-reference/payments/latest/settlement-reconciliation/settlement-reconciliation): endpoint/version, required pagination and filters, null initial cursor, next-page cursor, processed-on date-filter names and `+05:30` examples; nested event/order/payment/settlement response sample.
- Cashfree [Get All Settlements](https://www.cashfree.com/docs/api-reference/payments/latest/settlements/get-settlements): reviewed when selecting the event-level endpoint.
- Cashfree [v2026 overview](https://www.cashfree.com/docs/api-reference/payments/latest/overview).

The public reference does not document exact inclusive/exclusive date-bound behavior. Merchant entitlement, live response compatibility and the provider's range edges are not established by these source tests.

## Staging, visual review, and deployment

- **Not tested:** authorized merchant staging, a real Cashfree response, production, real phones/tablets, in-app browsers, or live financial-close behavior. No screenshots or visual approval were recorded; automated source checks are not visual approval.
- No staging or production deployment occurred. #27 still needs the owner's commercial policy for order expiry/points release.
- Before any deployment: inspect the report on desktop and mobile; confirm the exact processed-date edge behavior and account access on authorized staging; verify every cursor page and the v184 live release/cache handshake; record before/after evidence; then obtain explicit owner approval. Never deploy without that approval, and do not treat this package or a merge as deployment authorization.
