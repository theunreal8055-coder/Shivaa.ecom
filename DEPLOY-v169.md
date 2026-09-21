# v169 — deeper persistence, payment and order audit

**21 September 2026 · published and verified on `arena/01a0c31d-shivaa-ecom` · NOT DEPLOYED**

36 additional recorded repairs, plus one uncounted hardening change. Prior ledgers:104; cumulative recorded repairs: **140**. Evidence and limitations: [v169 defect ledger](tools/mega/audit/DEFECT-LEDGER-v169.md).

## Latest update download

The owner's follow-up requested the latest GitHub update link. The new package is **`shivaa-update-v169.zip`**, built from source commit `db525839d91800a07616b3f2ce26b17e61490503`.

- **17 files · 540,823 bytes**; cumulative v166–v169 code-file union.
- Requires an existing full **v165-or-newer CMS**, not an empty hosting folder.
- **SHA-256:** `9ff5aad3856c2efcdf52ec3eddb4b6d7bc04503436017eb39673413dbb0088fb`
- [Download v169 ZIP on GitHub](https://github.com/theunreal8055-coder/Shivaa.ecom/raw/f847d85057a112296c59ef58a35731a184b74194/shivaa-update-v169.zip)
- Publication commit: `f847d85057a112296c59ef58a35731a184b74194`. GitHub contents API matched size and Git blob `320fa3ae85b202dc2edaa209ff4d90a3a1576cb8` after push.
- Private repository: sign in with a GitHub account that has access.
- Final forward-only continuity record: `docs/SESSION-STATE-2026-09-21-v169.md`.

**Back up your website and database first.** Upload/extract into the existing website folder that contains `index.html` and `api.php` (usually `public_html`, or `public_html/cms` for that installation). The ZIP has root-relative members, **no extra `cms/` folder**. Replace the code files together; never extract only the worker.

No database, uploads, credentials, media or host-managed `.htaccess` is included. The v168 Apache-comment repair remains a separate host review, never a wholesale replacement of the live configuration. No main merge, Hostinger deployment or real payment was performed.

The older v168 ZIP/link is unchanged. This is a newly built v169 archive, not a renamed old download. The earlier six-file plan was a delta for already-installed v168 only; this published 17-file cumulative package also carries the prior required code updates.

### Package contents

```text
api.php
index.html
sw.js
css/fonts.css
css/styles.css
css/v167.css
js/app.js
js/admin.js
js/auth.js
js/hallmark.js
js/v116.js
js/v117.js
js/v125.js
js/v166.js
js/v167.js
manifest.webmanifest
manifest.json
```

Release handshake and shell asset URLs are **169**. Staff follows APP_REL. The hardened media cache deliberately remains **168** because no media changed.

### Archive verification

Each member matches the committed source byte-for-byte; ZIP integrity and the allowlist pass. Actual ZIP extracted over isolated original-v167 code: **25/25 v169 pages**, **28/28 v169 PHP**, **39/39 v168 boundaries**, **12/12 signatures**, **17/17 v164 PHP**, **24/24 direct checkout**, **36/36 v167**.

The sandbox's static Apache check used the separately copied host-comment repair; it does not imply `.htaccess` is in the ZIP. Tests never wrote to the repository/live database. Rebuild the exact archive:

```bash
python3 tools/mega/make-v169-zip.py db525839d91800a07616b3f2ce26b17e61490503
```

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
- Earlier isolated v168 + the six-file source delta: **25/25 page**, **28/28 PHP**,
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
