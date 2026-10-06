# DEPLOY v184 — Shivaa Black Retail Membership

**Release:** 184 · **Built:** 6 Oct 2026  
**Live before this package was built:** **183**, publicly verified on 6 Oct 2026 (`stamp.matched:true`, MySQL active, `mirrorBehind:false`)  
**Status:** built and gated; **not deployed by this work**  
**Source commit:** `481a1b27d889aba854b9d9a2eae5dd307287f5a8`  
**Prerequisite:** live **v183**. If live reports **185 or newer**, stop—never install this older package.

v184 launches **Shivaa Black**, a retail-customer-only digital membership:

- one personalised 16-digit member/coupon number per retail account;
- exactly **20% off the making-charge component × quantity** for six calendar months;
- no discount on metal, stones, GST, shipping, or the whole order;
- server binding to both the issuing account ID and its registered mobile;
- a permanent card archive and **Shivaa Family Prestigious Member** certificate in My Account;
- an exclusive Shivaa Black homepage campaign and responsive member experience.

---

## Package

**File:** `shivaa-update-v184.zip`  
**Size:** **475,512 bytes**  
**SHA-256:** `10ddcca58f6bb15e04b7a5e481585123943efa6b87265dd67fcfaa20045ea704`  
**Layout:** ZIP root extracts directly into `public_html/`, allowing overwrite.  
**Exactly 7 files:**

| File | Bytes | Purpose |
|---|---:|---|
| `api.php` | 517,579 | Retail-only claim/read APIs, permanent issue record, account+mobile binding, six-calendar-month expiry, personal coupon, authoritative making-charge discount, rel 184 |
| `index.html` | 32,108 | Shivaa Black metadata/navigation and 57 release-184 asset stamps |
| `js/app.js` | 673,703 | Exclusive homepage campaign, member route, card reverse/save/print controls, account locker, checkout auto-apply, order/invoice labels |
| `js/admin.js` | 324,101 | Making-charge-only coupon and order/invoice wording for staff |
| `css/v184.css` | 38,595 | Premium responsive desktop/mobile, card, certificate, account, checkout, reduced-motion and print layer |
| `sw.js` | 13,320 | Shell/REL 184 and 52 release-184 precache stamps; media cache intentionally remains v168 |
| `upgrade-sql.php` | 32,849 | Existing idempotent backup-first MySQL reconciler; no new v184 table is required |

**Never packaged:** `config.php`, `.htaccess`, `data/`, customer records, tokens,
credentials, backups, uploads, or billing files.

---

## Before installation

1. Take a full hPanel backup of `public_html/`.
2. Open `https://shivaa.in/api/version`.
3. Proceed only when the live release is **183** with `stamp.matched:true`.
   If it is already **184**, do not extract twice. If it is **185+**, this ZIP
   is obsolete and must not be installed.
4. Keep the CMS admin password ready for the backup-first reconciliation page.

## Install

1. Upload `shivaa-update-v184.zip` into `public_html/`.
2. Extract it there and allow the seven code files to overwrite.
3. Open `https://shivaa.in/upgrade-sql.php` and run the reconciler with the CMS
   admin password. v184 adds no new SQL column: this step creates a fresh
   pre-write JSON backup and verifies that the existing users/coupons/orders
   `data_json` mirrors remain healthy.
4. Hard-refresh once. Returning devices then move to the release-184 shell
   automatically through the existing silent update handshake.

No membership is pre-created during extraction or reconciliation. A retail
customer’s record is created only when that authenticated customer explicitly
claims Shivaa Black.

---

## Verify after installation

### Release and data source

Open `https://shivaa.in/api/version` and expect:

```json
{
  "rel": 184,
  "shell": "shivaa-shell-v184",
  "stamp": { "index": 184, "app": 184, "sw": 184, "matched": true },
  "db": { "driver": "mysql", "mode": "mysql", "mirrorBehind": false }
}
```

### Customer experience

1. Homepage hero and all four campaign slides market **Shivaa Black only**.
2. `#/black-card` shows the private sign-in state when signed out.
3. Sign in through OTP with a retail test account, then claim once:
   - the front shows the customer name and grouped 16-digit number;
   - the reverse shows the bound mobile and precise terms;
   - issue and benefit-until dates are exactly six calendar months apart;
   - the prestigious-member certificate appears below it.
4. Reload, sign out, then sign in again with the same mobile. The same number,
   issue date and certificate must return; a repeat claim must not renew it.
5. Add jewellery to the bag and open checkout. The active code should be
   offered automatically, with a row labelled **“Shivaa Black · 20% off making
   charges”**. The saving must equal 20% of the displayed making-charge basis.
6. On both laptop and phone, check card flip, copy, PNG save, print/PDF,
   account Membership tab and checkout summary.

### Privacy/authorization acceptance

- A signed-out request cannot read or claim the card.
- Admin/partner accounts cannot claim it.
- A different retail mobile/account cannot list, validate, view, or order with
  another member’s code.
- After expiry, the coupon is rejected while the card and certificate remain
  visible in the issuing account as an archive.

---

## Forward-only recovery

Do **not** extract v183 or any older update over v184. If an issue is found,
preserve the backup and ship the correction as **v185 or newer**. The v184
records are additive fields inside existing user/coupon `data_json`; no
customer record should be manually deleted or edited during recovery.
