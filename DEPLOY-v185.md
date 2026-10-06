# DEPLOY v185 — Shivaa Black Resilience & Premium Mobile Finish

**Release:** 185 · **Built:** 6 Oct 2026  
**Live before this package was built:** **183**, publicly verified on 6 Oct 2026 (`stamp.matched:true`, MySQL active, `mirrorBehind:false`)  
**Status:** built, packaged and gated; **not deployed by this work**  
**Source commit:** `637dc6d0ab276d4a7497068ed9231d86635e8638`  
**Prerequisite:** live **v183 or v184**. This is a cumulative v184+v185 package. If live reports **185**, do not extract it twice; if live reports **186 or newer**, stop—never install an older package.

v185 preserves the retail-only **Shivaa Black** product and gives it a deeper
security, checkout, export and mobile-quality pass:

- one permanent personalised 16-digit member/coupon number per retail account;
- exactly **20% off the making-charge component × quantity** for six calendar months;
- no discount on metal, stones, GST, shipping, or the whole order;
- access and coupon use bound to both the issuing account and its non-empty registered mobile;
- card-authoritative coupon repair: missing/drifted safe mirrors are recovered, while foreign conflicts fail closed;
- account-scoped claim throttling without throttling permanent card/certificate retrieval;
- race-safe coupon validation, honest applied-code submission, loyalty-points parity, per-line quantities and rate-lock preservation;
- accessible front/back card state, explicit recovery messages, native mobile file sharing with download fallback, complete two-face printing, and a polished narrow-phone layout;
- the card and **Shivaa Family Prestigious Member** certificate remain archived in My Account forever, including after benefit expiry.

---

## Package

**File:** `shivaa-update-v185.zip`  
**Size:** **485,031 bytes**  
**SHA-256:** `67dc0243ebbb6fcf675484d0abe62f94045be8b562d6adc31e433b499e682600`  
**Verified GitHub download:** [shivaa-update-v185.zip](https://github.com/theunreal8055-coder/Shivaa.ecom/raw/8a3d30f72d30543075e456469986ac89e58ad64d/shivaa-update-v185.zip)

**Publication commit:** `8a3d30f72d30543075e456469986ac89e58ad64d` · **Git blob:** `0d3dbdb0a19e2c750d122a8e2ecd8d0794058442`

**Layout:** ZIP root extracts directly into `public_html/`, allowing overwrite.  
**Exactly 8 files:**

| File | Bytes | Purpose |
|---|---:|---|
| `api.php` | 523,171 | Retail-only card authority, strict account/mobile binding, safe coupon repair, claim throttle, exact making-charge discount and rel 185 |
| `index.html` | 32,270 | Release-185 asset handshake and final premium stylesheet link |
| `js/app.js` | 689,392 | Race-safe checkout, locked-rate/quantity fixes, accessible locker, native card/certificate export and printing |
| `js/admin.js` | 324,101 | Existing Shivaa Black making-charge-only staff/order/invoice wording |
| `css/v184.css` | 38,595 | Complete base Shivaa Black desktop/mobile/card/certificate layer for direct upgrades from v183 |
| `css/v185.css` | 11,258 | Final mobile safety, touch, readability, checkout, recovery, export and print polish |
| `sw.js` | 13,549 | `shivaa-shell-v185`, REL 185 and the v185 CSS/asset precache; media cache intentionally remains v168 |
| `upgrade-sql.php` | 32,849 | Existing idempotent backup-first MySQL reconciler; no new v185 table is required |

The archive was rebuilt twice from committed Git bytes with identical output,
passed ZIP integrity/path/timestamp inspection, and was overlaid onto an isolated
pre-membership CMS baseline for executable v184/v185 acceptance.

**Never packaged:** `config.php`, `.htaccess`, `data/`, customer records, tokens,
credentials, backups, uploads, media, or billing files.

---

## Before installation

1. Take a full hPanel backup of `public_html/` and the current database.
2. Open `https://shivaa.in/api/version`.
3. Proceed only when the live release is **183 or 184** and
   `stamp.matched:true`. If it is already **185**, do not extract twice. If it
   is **186+**, this ZIP is obsolete and must not be installed.
4. Keep the CMS admin password ready for the backup-first reconciliation page.

## Install

1. Upload `shivaa-update-v185.zip` into `public_html/`.
2. Extract it there and allow all eight code files to overwrite.
3. Open `https://shivaa.in/upgrade-sql.php` and run the reconciler with the CMS
   admin password. v185 adds no SQL column; this creates a fresh pre-write JSON
   backup and verifies that existing MySQL/JSON mirrors are healthy.
4. Hard-refresh once. Returning devices then move to the release-185 shell via
   the existing silent update handshake.

No membership is pre-created during extraction or reconciliation. An
authenticated retail customer creates the permanent record only by claiming
Shivaa Black.

---

## Verify after installation

### Release and data source

Open `https://shivaa.in/api/version` and expect:

```json
{
  "rel": 185,
  "shell": "shivaa-shell-v185",
  "stamp": { "index": 185, "app": 185, "sw": 185, "matched": true },
  "db": { "driver": "mysql", "mode": "mysql", "mirrorBehind": false }
}
```

### Customer experience

1. The homepage hero and campaign slides market **Shivaa Black only**.
2. At `#/black-card`, sign in by OTP with a retail test account and claim once:
   - the front shows the customer name and grouped 16-digit number;
   - the reverse shows the bound registered mobile and precise terms;
   - benefit expiry is exactly six calendar months after issue, including
     month-end/leap-year clamping;
   - the prestigious-member certificate appears below it.
3. Reload, sign out, and sign in again with the same registered mobile. The
   same card number, issue date and certificate must return. Repeat claim must
   not renew the expiry or mint another coupon.
4. On a phone, verify front/back controls, Copy, Share/save PNG, certificate
   Share/save, Print/save PDF, 48 px touch targets, readable checkout totals,
   and no horizontal overflow at narrow widths. On a laptop, verify the same
   controls and the established card/checkout layout.
5. Add two different jewellery lines, change their quantities, and open
   checkout. Shivaa Black should auto-apply only after successful validation.
   The row must say **“Shivaa Black · 20% off making charges”**, and its saving
   must equal 20% of the displayed making-charge basis. Changing the typed code
   must clear the prior application and require **Apply** again.
6. Keep checkout open through a rates refresh. An active saved rate lock must
   not silently reprice. Check loyalty points with a large coupon: points may
   reduce only the remaining eligible amount and must not create a negative
   total.
7. In My Account → Membership, confirm card and certificate retrieval. Expiring
   the test benefit must disable only the coupon; the permanent documents must
   remain visible.

### Privacy and authorization acceptance

- A signed-out request cannot read or claim the card.
- Admin/partner accounts cannot claim it.
- Empty/invalid registered mobile values fail closed.
- A different account or mobile cannot list, validate, view, or order with the
  member number.
- Repeated scripted claim writes return HTTP 429 after the account limit, while
  the authenticated read/archive endpoint remains available.
- A foreign coupon collision is never overwritten or deleted automatically.

---

## Verification evidence

- Main release belt: **214/214 assertions passed**.
- Dedicated v185 suites: browser/static **10/10**; executed PHP 8.3 **9/9**.
- Preserved v184 suites: browser/static **8/8**; executed PHP **8/8**.
- Historical regression: **46 suites passed, 24 intentionally retired-feature
  suites skipped, 0 failed**, executed serially to avoid PHP-WASM fixture races.
- PHP parser with a failing negative control, JavaScript syntax, CSS braces,
  whitespace, deterministic ZIP rebuild, archive integrity and committed-byte
  comparison all passed.
- Isolated extracted package: v185 **10/10 + 9/9** and v184 **8/8 + 8/8**.

Browser assertions use jsdom and PHP assertions use PHP 8.3 WASM. A local real
browser was unavailable because the Chromium download failed at the external
mirror; final physical iPhone/Android and Hostinger acceptance therefore remain
post-install checks. No production, payment, OTP, customer record, or live data
was mutated during this build.

---

## Forward-only recovery

Do **not** extract v184, v183, or any older update over v185. If an issue is
found, preserve the backup and ship the correction as **v186 or newer**. The
membership records are additive fields in existing user/coupon data; do not
manually delete, renumber, renew, or rebind a customer record during recovery.
