# v169 — deeper persistence, payment and order audit

**21 September 2026 · source verified · NOT DEPLOYED / NO v169 ZIP YET**

36 additional recorded repairs, plus one uncounted hardening change. Prior ledgers: 104; cumulative recorded repairs: **140**. Evidence and limitations: [v169 defect ledger](tools/mega/audit/DEFECT-LEDGER-v169.md).

The previously published **`shivaa-update-v168.zip` remains v168**. Its download URL and hash have not changed. It does **not** include this continuation. No new commit, push, merge, Hostinger update or real payment was performed for v169.

## Future update boundary

Back up the complete current website and database before any owner-approved installation. For a **fully installed v168 CMS**, the v169 source delta is six code files, listed using website-root paths:

```text
api.php
index.html
sw.js
js/app.js
js/admin.js
js/v117.js
```

This is **not an archive or an instruction to upload now**. If a v169 package is requested, build it from the verified source revision, match every member byte-for-byte, test an isolated v168-plus-package overlay, and publish only from `arena/01a0c31d-shivaa-ecom`. Do not rename the old v168 ZIP or reuse its hash.

- Require full v168 for this six-file delta. Supporting earlier installations requires an explicitly cumulative package with the prior required files.
- Root-layout package: extract beside existing `index.html` and `api.php`, not inside another `cms/` directory.
- Exclude `data/`, uploads, secrets, credentials, media and host-managed `.htaccess`.
- Never replace `sw.js` alone. Index/app/API/worker release is **169**, staff follows APP_REL, every shell asset URL carries `v=169`.
- Media cache remains **`shivaa-media-v168`**, intentionally: its safety rules already shipped, and this release changes no pictures or films.
- The v168 Apache-comment source repair is unchanged. Live `.htaccess` review remains separate; do not overwrite the host configuration wholesale.

## What changes operationally

- Stale whole-database saves fail with **409 DATA_CONFLICT** instead of discarding concurrent writes. The operator/customer should inspect current status before retrying. Do **not** add automatic retry of money-changing POSTs.
- Lock failure returns 503; staging failure returns 500 while keeping old data. Native Hostinger permissions, locking and storage still need deployment verification.
- OTP consumption and admin status/KYC changes persist correctly. Approval no longer generates random paid settlement history. Existing financial rows are not deleted.
- Checkout rejects missing/inactive lines and unavailable selected-metal pricing. Stock remains advisory/made-to-order; zero stock does not disable purchases. New orders track actual debited inventory for safe cancellation.
- Cached rates are held without random jitter, missing feed legs no longer distort healthy ones, and missing anchors do not become premium-only quotes. Existing historic rates are not retrospectively validated.
- Cashfree capture maps its saved address fields into placeholder dispatch rows without overwriting typed addresses. Payment return URLs are not proof of payment; scheme timeouts no longer open a quiz or invent success.
- Printable invoice eligibility, stored adjustments, thermal line totals and popup/escaping handling are repaired. This is not CA/GST legal certification.

## Verification recorded

- v169 PHP **28/28**; v169 page/print cases **25/25**.
- Same new tests on published v168: **1/28 PHP**, **0/25 page cases**.
- Regression belt: **38 PASS / 16 retired SKIP / 0 FAIL**.
- Direct Cashfree fixture **24/24**; existing v164 PHP fixture **17/17**.
- Isolated v168 + the six code files above: **25/25 page**, **28/28 PHP**,
  **24/24 direct-checkout** checks pass. This is a source overlay, not a ZIP.
- Static sweep **209 routes / 0 exceptions**; PHP parser, changed JS syntax and whitespace checks pass.

Tests use isolated QA data and controlled external-response fixtures. No live OTP, payment, registry lookup or customer update. Read the ledger's coverage limits before describing this as a complete website audit.

## Owner-approved live acceptance, still pending

1. Confirm `/api/version` reports 169 with matched index/app/worker stamps; verify browser shell and staff bundle agree.
2. Check catalogue/category films, mobile navigation, cart and the unchanged direct Cashfree opening flow on real phones.
3. With approved gateway test credentials, verify pending, paid, declined and interrupted returns; guest access must remain private, and one confirmation must create only one payment/invoice/points grant.
4. Confirm OCC-collected and typed delivery addresses separately. Do not dispatch placeholder addresses.
5. Inspect saved quantity × price and all adjustments in member invoice, admin invoice and a physical thermal print. Review GST/place-of-supply treatment with the shop's adviser.
6. Verify lock/staging behavior on a nonproduction copy of the actual host, never by damaging the live data directory.
7. Review historical settlement/inventory anomalies with the owner. Their correct replacement values cannot safely be invented.
