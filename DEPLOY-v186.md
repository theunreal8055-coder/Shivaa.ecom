# DEPLOY v186 — Shivaa Black Signature Customer Journey

**Release:** 186 · **Built:** 6 Oct 2026  
**Live before this package was built:** **183**, publicly verified on 6 Oct 2026 (`stamp.matched:true`, MySQL active, `mirrorBehind:false`)  
**Status:** built, packaged and gated; **not deployed by this work**  
**Source commit:** `0dfd1bb8537db64b3645d33070b9c84ad85fc141`  
**Prerequisite:** live **v183, v184 or v185**. This is a cumulative v184+v185+v186 package. If live reports **186**, do not extract it twice; if live reports **187 or newer**, stop—never install an older package.

v186 makes Shivaa Black visibly richer while shortening and protecting the
entire retail-customer path:

- cinematic obsidian-and-gold campaign artwork, a tactile light-reactive card,
  holographic seal, journey timeline, reveal treatment and premium mobile/laptop
  composition;
- a deliberate Black action continues through OTP without a second claim tap;
  a new customer supplies only the card name, while DOB, city, gender, email,
  anniversary and password remain optional;
- one guarded, idempotent claim request with clear checking/recovery feedback,
  safe return to the originating product or bag, and cancellation that clears
  intent and restores keyboard focus;
- exact active-member saving previews on the product page and bag, updated for
  quantity, followed by visible card → mobile verification → saving-applied
  progress at checkout;
- permanent card/certificate retrieval, six-month benefit progress, remaining
  days and an honest expired archive state;
- route-owned hero observers, animation frames and product-gallery timers are
  released when their page detaches; reduced-motion, touch/narrow-device and
  bounded-DPR paths retain the complete static experience without costly motion;
- fixed legacy four-box OTP bounds/paste behavior, modal focus containment,
  route-race guards and below-fold image priority;
- a richer native card/certificate image export and a share-ready Black hero.

All standing product law is unchanged: retail customers only; one unique
grouped 16-digit identity; strict account plus registered-mobile binding; an
exact calendar-six-month benefit; permanent documents; and exactly **20% of
server-recomputed `Σ(makingCharge × quantity)` only**. Metal, stones, GST,
shipping and whole-order value remain outside the discount.

---

## Package

**File:** `shivaa-update-v186.zip`  
**Size:** **711,835 bytes**  
**SHA-256:** `8dbb0dbd9a418c71ba79eb40079f060e78bcbe4e9ddd43c811a5e72d660145ff`  
**Verified GitHub download:** [shivaa-update-v186.zip](https://github.com/theunreal8055-coder/Shivaa.ecom/raw/PENDING_PUBLICATION_COMMIT/shivaa-update-v186.zip)

**Publication commit:** `PENDING_PUBLICATION_COMMIT` · **Git blob:** `dc290e61c467eaab575ffc5364271c8589dc1dd6`

**Layout:** ZIP root extracts directly into `public_html/`, allowing overwrite.  
**Exactly 11 files:**

| File | Bytes | Purpose |
|---|---:|---|
| `api.php` | 523,171 | Existing card/mobile/order authority plus release 186 handshake |
| `index.html` | 32,652 | Release-186 asset handshake, hero preload/share metadata and final CSS link |
| `js/app.js` | 706,286 | Guided claim continuation, card motion, exact commerce previews, checkout progress, lifecycle cleanup and exports |
| `js/auth.js` | 45,433 | Black-aware OTP context, name-only required registration, optional profile fields and focus safety |
| `js/admin.js` | 324,101 | Cumulative v184/v185 Black making-charge-only staff/order/invoice wording |
| `css/v184.css` | 38,595 | Complete base Black desktop/mobile/card/certificate layer for direct v183 upgrades |
| `css/v185.css` | 11,258 | Locker resilience, narrow-phone, checkout, export and print hardening |
| `css/v186.css` | 21,166 | Signature artwork, tactile card, journey, commerce/auth continuity, mobile and calm-motion finish |
| `images/black/hero-v186.jpg` | 204,174 | Public 1376×768 obsidian-and-gold opening/share artwork |
| `sw.js` | 13,875 | `shivaa-shell-v186`, REL 186 and stamped CSS/hero precache; media generation remains v168 |
| `upgrade-sql.php` | 32,849 | Existing idempotent backup-first MySQL reconciler; no new v186 table is required |

The archive was rebuilt twice from committed Git bytes with byte-identical
output. Every entry passed CRC, safe-path, fixed-timestamp, mode, inventory and
source-byte comparison. The package was independently overlaid onto both the
pre-membership **v183** baseline and the final **v185** baseline; the complete
v186 browser/static and PHP-WASM acceptance suites passed on both extracted
overlays.

**Never packaged:** `config.php`, `.htaccess`, `data/`, customer records, tokens,
credentials, backups, uploads, product/customer media, billing files or test
fixtures. The single listed Black campaign JPEG is intentional public artwork.

---

## Before installation

1. Take a full hPanel backup of `public_html/` and the current database.
2. Open `https://shivaa.in/api/version`.
3. Proceed only when the live release is **183, 184 or 185** and
   `stamp.matched:true`. If it is already **186**, do not extract twice. If it
   is **187+**, this ZIP is obsolete and must not be installed.
4. Keep the CMS admin password ready for the backup-first reconciliation page.

## Install

1. Upload `shivaa-update-v186.zip` into `public_html/`.
2. Extract it there and allow all eleven listed files to overwrite.
3. Open `https://shivaa.in/upgrade-sql.php` and run the reconciler with the CMS
   admin password. v186 adds no SQL column; this creates a fresh pre-write JSON
   backup and verifies the existing MySQL/JSON mirrors.
4. Hard-refresh once. Returning devices then move to `shivaa-shell-v186`
   through the existing silent update handshake.

Extraction and reconciliation do not create memberships. A permanent record is
created only after an authenticated retail customer deliberately chooses to
create Shivaa Black.

---

## Verify after installation

### Release and data source

Open `https://shivaa.in/api/version` and expect:

```json
{
  "rel": 186,
  "shell": "shivaa-shell-v186",
  "stamp": { "index": 186, "app": 186, "sw": 186, "matched": true },
  "db": { "driver": "mysql", "mode": "mysql", "mirrorBehind": false }
}
```

### Seamless customer journey

1. On a signed-out phone, open the Black homepage and `#/black-card`. Confirm
   the new artwork loads sharply with no horizontal overflow; reduced-motion
   mode keeps the graphics but removes drifting/tilt/reveal motion.
2. Tap **Verify mobile & create my card**. Confirm the sheet explains Black,
   focus stays inside it, the four-digit OTP accepts typing/paste, and a new
   number asks only for **Full name**. Leave the collapsed optional profile
   section empty and continue.
3. Confirm one automatic post-auth request creates the card—there must be no
   second claim tap and no duplicate request. The card shows the supplied name,
   a grouped 16-digit code, the registered mobile on its reverse, an issue date
   and benefit date exactly six calendar months apart. The permanent **Shivaa
   Family Prestigious Member** certificate appears below it.
4. Reload, sign out, and sign in again by OTP with the same mobile. The exact
   card number, issue/expiry dates and certificate must return. A repeat claim
   must not renew or renumber anything.
5. On a jewellery PDP, confirm the active banner names the making-charge basis
   and exact 20% saving. Increase quantity: both basis and saving must update.
   Add to bag and change quantity again; the bag preview must stay exact.
6. Continue to checkout. Confirm **Card found → Mobile verified → ₹… applied**,
   and that the discount row says **“Shivaa Black · 20% off making charges.”**
   The saving must be exactly 20% of the displayed making-charge subtotal.
   Metal, stones, GST and shipping must remain undiscounted.
7. Edit the coupon field after application: the old application must clear and
   require Apply again. Keep checkout open through a rate refresh: an active
   rate lock must not silently reprice. Loyalty points must not exceed the
   post-coupon remainder.
8. In My Account → Membership, verify flip, Copy, native Share/save PNG,
   certificate Share/save and Print/save PDF. On an expired test fixture, the
   saving must disappear while card and certificate remain permanently visible.
9. Repeat on laptop: pointer lighting must remain subtle and bounded, keyboard
   focus must return to the claim button when verification is cancelled, and
   all existing shop/category/product/checkout behavior must remain intact.

### Privacy and authorization acceptance

- A signed-out request cannot read or claim a card.
- Admin and partner accounts cannot claim the retail product.
- Empty/invalid or changed registered mobile values fail closed.
- Another account/mobile cannot list, validate, view or order with a member
  number, whether grouped or entered without spaces.
- A cancelled OTP sheet never leaves a latent auto-claim behind.
- Repeat claim is idempotent and account-throttled; archive GET remains
  available after the write throttle.
- Expiry follows the immutable card even if a mutable coupon mirror drifts.

---

## Verification evidence

- Main active belt: **233/233 assertions passed**.
- Dedicated v186 suites: browser/static **11/11**; executed PHP 8.3 **8/8**.
- Preserved v185 suites: **10/10 + 9/9**; preserved v184 suites:
  **8/8 + 8/8**.
- Full historical runner: **48 suites passed, 24 intentionally retired-feature
  suites skipped, 0 failed**, executed serially to avoid PHP-WASM fixture races.
- Extracted package on v183 baseline: **11/11 + 8/8**; extracted package on
  v185 baseline: **11/11 + 8/8**.
- PHP parser with a failing negative control, JavaScript syntax, CSS structure,
  diff whitespace, image/JPEG checks, release/cache declarations, deterministic
  ZIP rebuild, archive integrity and committed-byte comparison all passed.

Browser assertions use jsdom and server assertions use PHP 8.3 WASM. No
compatible native browser was available locally because prior Chromium mirror
downloads failed with external TLS resets; physical iPhone/Android/laptop and
live Hostinger acceptance therefore remain post-install checks. No production,
payment, OTP, customer record or live data was mutated during this build.

---

## Forward-only recovery

Do **not** extract v185, v184, v183 or any older update over v186. If an issue is
found, preserve the backup and ship the correction as **v187 or newer**. Do not
manually delete, renew, renumber or rebind a customer’s permanent membership
record during recovery.
