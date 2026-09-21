# Shivaa deeper audit — v169

**21 September 2026 · branch `arena/01a0c31d-shivaa-ecom`**
**Baseline:** published v168, `f2b6c4467fe6fa3822b223cda73e5d513fc604ef`.
**Status:** source repairs and the new v169 update ZIP are verified in isolation; **not live-deployed**. On the owner’s follow-up, the 17-file cumulative package was built from `db525839d91800a07616b3f2ce26b17e61490503` for publication on the current branch only. See `DEPLOY-v169.md` for hash, extraction notes and archive-overlay results. The old v168 download is unchanged.

## Results and counting

**36 additional recorded defect repairs**, plus **one separately identified hardening change** (B20). The previous ledgers record 104 repairs: **140 cumulatively recorded**, not 140 new findings and not a bug-free certification.

- Executed production PHP: **28/28 checks pass**; baseline v168: **1/28 passes, 27 fail**.
- Executed production page/print bodies in isolated DOMs: **25/25 checks pass**; baseline v168: **0/25 pass**.
- Full regression runner: **38 active suites pass, 16 retired-feature suites explicitly skip, 0 fail**.
- Direct Cashfree checkout fixture: **24/24**; previous v164 PHP catalogue/payment fixture: **17/17**.
- A six-file v169 overlay onto the v168 control also passes **25/25 page**, **28/28 PHP** and **24/24 direct-checkout** checks. That was the initial source-only check; the later actual archive overlay also passes, as recorded in the deployment guide.
- Static PHP route sweep: **209 routes, 0 exceptions**. This is source analysis, **not execution of 209 endpoints**.
- PHP parser accepts production and rejects its deliberately broken control. Changed JS syntax and `git diff --check` pass.

The 53 new checks are **not 53 defects**. C01 is one navigation-race family exercised across ten page types plus a poller. Controls, repeated inputs, multiple response paths and B20 are not additional defects. B06/B07 share the same PHP reference mistake but affect distinct independently reproduced admin workflows. The counts above refer to recorded repair entries, not unique root causes.

No production API, SMS/OTP service, payment gateway, GST provider or live feed was called by these new fixtures. No repository database, supplier catalogue, customer record, credential, upload or product media was changed. Live devices, Apache, vendor accounts and real payments remain outside this evidence.

## Persistence, backend and money

Tests below are in `tools/mega/smoke/v169-php-run.js`. `php-api-fixture.js` mounts code and an isolated QA database inside PHP-WASM; it never mounts the repository database for writes. Full endpoints are exercised where feasible; selected helpers and the GST update block are extracted from the production source, with external responses explicitly stubbed.

| ID | Demonstrated before | Repair / evidence |
|---|---|---|
| B01 | An unlocked request could load an old database, wait, then overwrite an order written by another request. | Compare the loaded snapshot hash under the save lock; reject a stale save with HTTP 409 `DATA_CONFLICT`. Deterministic interleaving preserves the intervening order. Sequential saves remain writable. |
| B02 | Failure to create a staging file fell back to overwriting the live database directly. | Return a save error and keep the old file. A failing stream fixture proves the destructive fallback is never attempted. |
| B03 | Failure to open/acquire the mutation lock did not stop the request. | Fail closed with 503 instead of proceeding unlocked. Missing-lock-directory fixture executes the actual lock helper. |
| B04 | OTP consumption iterated a temporary `($db['otps'] ?? [])` array by reference; the original verified code stayed unconsumed. | Mutate the original array, retaining a missing-collection guard and the separate reset-purpose behavior. No real OTP sent. |
| B05 | Cashfree attempt `lastState`/session/check time updates changed a temporary array; non-PAID reconciliation also returned without saving. | Mutate the stored attempts and save pending/failed metadata. ACTIVE-state helper execution verifies persisted attempt data. |
| B06 | Metal-exchange admin PUT returned the new status, but the next read still showed the old status. | Iterate the original metal-orders array. Full PUT followed by persisted database read. |
| B07 | Bullion-order admin PUT had the same false-success persistence behavior in its separate collection. | Iterate the original bullion-orders array. Full PUT followed by persisted read. |
| B08 | GST re-verification incremented its updated count while partner KYC/postal fields were changed only in a temporary array. | Mutate the original partner rows. Execute the real update block with a labelled provider-result fixture; no registry claim or paid lookup. |
| B09 | Approving a partner created five random weeks of sales/orders and fictitious `Paid` settlements. | Approval grants access/join date only. Existing settlement rows are preserved, never automatically deleted. Full approval endpoint checks no invented financial rows. |
| B10 | Updating an absent partner returned HTTP 200 with an error-shaped body. | Return 404; no false-success save. |
| B11 | All guest checkouts shared one account-rate bucket; payment-session creation shared another anonymous bucket. One guest could exhaust capacity for everyone. | Keep guest limits per client IP while preserving member limits. Full order and payment-setup fixtures bypass exhausted *other-guest* buckets. This is not unlimited guest checkout. |
| B12 | Checkout accepted inactive designs, and silently skipped unknown/malformed lines, potentially ordering only part of the submitted bag. | Reject the whole invalid selection with 400 rather than creating a partial order. Known stock-zero designs remain orderable. |
| B13 | Delivery phone normalization updated a local address variable but the unnormalized body was persisted. | Save the normalized address back to the order input. Full checkout with a `+91`/spaced QA number. |
| B14 | A future client timestamp passed the rate-lock age test and could extend the lock far beyond its window. | Require a nonfuture timestamp as well as the existing age, drift and member checks. A tomorrow-dated lock falls back to current pricing. |
| B15 | A payment-only admin order update passed null status into `preg_match` under strict PHP and failed. | Only validate a supplied nonempty status. Full payment-only PUT now updates the ledger. |
| B16 | Review reminders read nonexistent timeline `status/at` fields instead of stored `s/t`, using order creation as delivery age. | Read both supported timeline shapes / explicit deliveredAt; skip unknown delivery dates. An old order delivered today produces no early reminder. |
| B17 | Missing referral code matched ordinary users whose `referredBy` was also empty, including the member. | Empty code has no referred users; exclude self-referrals. |
| B18 | An unpaid referred order was counted as a completed reward-earning purchase. | Require Paid and noncancelled orders for this summary. This does not add or certify a separate referral-credit ledger. |
| B19 | Made-to-order quantity exceeding available stock debited only available units, but cancellation restored the entire ordered quantity, inventing inventory. | Store actual `stockReserved` per new line and restore only that debit. Repeated cancellation remains idempotent; old orders retain their legacy fallback. |
| B21 | Feed failure randomly jittered/clamped quotes, even distorting a healthy gold leg when silver failed. | Retain each available live leg; otherwise hold known values without random changes. Label cached/partial/unavailable and preserve known quote time. Execute outage and one-live-leg fixtures. Existing historical cached values are not retrospectively certified. |
| B22 | OCC capture retained `address_line_one`, `address_line_two`, `pin_code`, but dispatch promotion looked for different keys; the paid guest could retain placeholder address/PIN. | Map the captured schema, retain compatible aliases, and use captured shipping name when needed. Real capture→payment→save helpers execute together. Typed addresses remain unchanged; duplicate confirmation produces one payment. |
| B23 | Manual `PAID` created money in the ledger but then stored noncanonical casing, bypassing exact-Paid invoice/loyalty logic. | Canonicalize the accepted Paid spelling before downstream issuance. Repeated full PUT creates one invoice/payment/points grant. |
| B24 | A zero metal rate could still create a positive subtotal from making/stone charges; a missing anchor could become a premium-only quote. | Reject checkout for a missing selected-metal rate. Zero anchors remain zero, bootstrap no longer invents rates, healthy premiums and explicit overrides remain intact. |

### Separate hardening — not counted as another exploit/fix

**B20:** Customer order responses included the private `tail` used to derive a guest access pin. These were already owner/admin/pin-authorized responses; this audit does **not** establish unauthenticated cross-customer access. Return a public order projection without `tail`, keep private entropy in storage, and continue returning the buyer's derived access pin where required. Tests verify rightful access still works and a wrong pin remains denied.

## Storefront, returns and printable documents

Tests are in `tools/mega/smoke/v169-check.js`, using the actual page and print bodies with controlled response timing. These are executed DOM fixtures, not native browser screenshots or end-to-end gateway purchases.

| ID | Demonstrated before | Repair / evidence |
|---|---|---|
| C01 | Successful old page requests, payment polls and campaign timers could repaint or redirect a newer navigation. v168 guarded route errors, not these successful continuations. | Capture view identity, hash and route generation; stop obsolete continuations before DOM/global-order writes or redirects. Exercise product, checkout, order, account, wishlist, invoice, certificates, CMS page, scheme and late paid poll. |
| C02 | `cf=success` and substring `/paid/i` treated URL claims, `Unpaid` and `Partially paid` as fully paid; celebration/quiz behavior could follow. | Require authoritative exact Paid status. URL success only requests verification; partial payment remains balance-due. A real Paid fixture still shows confirmation. |
| C03 | Scheme poller tested nonexistent top-level `res.paid`, although the endpoint returns `res.order.paymentStatus`. | Read the actual response contract; confirmed payment opens the quiz once without unnecessary retries. |
| C04 | Exhausted pending/error scheme checks eventually announced payment or opened the quiz anyway. | Never invent success. Keep a not-confirmed message and a status-check link; no automatic quiz on exhaustion/error. |
| C05 | Order poller stopped while telling the buyer it would keep checking. | State that automatic checks paused and provide reload/contact guidance. |
| C06 | Customer invoice view and admin invoice printing could present an unissued unpaid order as an invoice. | Require the saved issued invoice number; offer order/payment status or an order receipt instead. Existing historical issued invoices are not renumbered. |
| C07 | Customer invoice omitted prepaid/shipping/COD adjustments and displayed the order ID instead of its issued invoice number; labelled every total paid. | Render the saved invoice number and adjustments, keep the saved grand total, and label it invoice total. This is a different renderer from the admin invoice fixed in v168. |
| C08 | Thermal receipt printed unit price as the line amount for multiple quantities. | Print unit price × quantity. |
| C09 | Thermal receipt interpolated identifiers/GST metadata into HTML without escaping. | Escape these values before writing the print window. |
| C10 | Blocked thermal-receipt popup crashed on null.document. | Stop safely and ask the operator to allow popups. |
| C11 | Thermal receipt omitted coupon/points discount and COD fee despite including them in its total. | Show the saved adjustments without recalculating the grand total. |
| C12 | Every guest order claimed its delivery details had already been verified on Cashfree, including unpaid orders. | Describe collection/dispatch verification without claiming completed verification. |
| C13 | Order summary crashed without a rate snapshot and otherwise showed the gold rate for silver items. | Prefer saved per-item metal rates, use a matching saved snapshot only as fallback, and say Not recorded instead of fabricating a zero quote. |

## Regression integrity

- Two old source-shape tests were maintained, not counted as product fixes: v155 now permits the navigation-ownership guard around its existing login fallback; v156 permits zero-feed guards while requiring identical healthy premium expressions. Executed PHP checks verify both zero and healthy paths; v156 also passes on the unchanged v168 baseline.
- The v161/v162 verification toast remains because the payment check really runs. Their lightweight historical checks are supplemented by v169's real pending/paid/error-response tests.
- Both new harnesses have an overall deadline so an unresolved promise cannot silently exit successfully. The regression runner retains its explicit SKIP distinction; logs default to ignored `work/audit169/regression/` (override with `SMOKE_LOG_DIR`).

## Safety boundaries and remaining work

1. **No native/live proof:** Hostinger PHP/filesystem/Apache, Cashfree production credentials/MID limits, real UPI settlement, native PWA/WebView, physical printers and GST/CA compliance need separate approved checks.
2. **Concurrency:** Deterministic stale-save and staging/lock failures were reproduced. This is not a multi-process load test. `db_load` tracks a request-level snapshot; future nested-load changes must not refresh that snapshot then save an older array. Current nested callers were reviewed: GST paths reload after a cache merge; Cashfree reconciliation locks and reloads before applying. Do not automatically retry money-changing POSTs on 409. Inspect latest state first.
3. **Gateway reconciliation:** Isolated capture/ledger/idempotency paths pass; webhook/provider delivery behavior and slow calls under the reconciliation lock still need native operational checks.
4. **Historical data:** No existing settlement, invoice, stock or quote record was rewritten. Owner review is required for historical approval-generated settlements; do not assume every existing settlement is fictitious. Legacy orders without `stockReserved` preserve prior restoration semantics because their actual past debit cannot be inferred safely.
5. **Broader coverage:** The audit is not every possible workflow or input. Other async admin/form continuations, referral summary versus actual credited rewards, certificate issuance/content and supplier-backed net/gross/HUID evidence remain follow-up areas. Nothing here certifies weights, legal claims or supplier facts.
6. **Release:** source handshake and shell assets are **169**. The already-hardened image cache deliberately remains **168** because no media changed. Ship the coherent code set, never the worker alone. Host-managed `.htaccess`, data, uploads and credentials remain excluded from any future update package.

## Reproduce

```bash
cd tools/mega/smoke
npm ci --no-audit --no-fund
npm test
npm run test:regression
cd ../../..
node tools/mega/php-sweep/sweep.mjs
```

To reproduce the negative control, export the **v168 CMS from the baseline commit** into an ignored workspace directory and run the new tests with `SMOKE_CMS=/absolute/path/to/baseline/cms`. Never point a test harness at a production endpoint. Fixtures select code from SMOKE_CMS but construct their own writable in-memory database.
