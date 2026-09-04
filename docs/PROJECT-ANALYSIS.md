# Shivaa.ecom — Project Analysis & Continuation Plan

> Source analysed: Google Drive folder **`Shivaa.v37`** (`1TKT2pJO_VG6LoWWc7r6wEAc3wOFDaGPZ`)
> Source of truth recovered from GitHub: `shivaa-FULL-fresh-install-v37.rar` → nested zip
> Date: 2026-09-04 · Repo version: **v37**

## 1. What this project is

**Shivaa Jewellers (shivaa.in)** — a production e-commerce website for a jewellery
brand, plus a **65-ring AI automation pipeline** that:

1. Ingests supplier PDFs.
2. OCRs and normalises product data into verified "ground truth" (`work/designs.json`).
3. Runs an AI **photoshoot** (4 shots/design: studio, worn, gift, editorial).
4. Renders a **Ken-Burns product film** per design.
5. Generates metadata (metal value + making charges + GST = computed price).
6. Uploads everything to the CMS via a REST API.

The repo is the **source of truth**; the codebase is versioned as **v37**.

## 2. The Google Drive folder (`Shivaa.v37`) — 7 files

| File | Type | Purpose |
|---|---|---|
| `DEPLOY-v37.md` | doc | How to go live: update an existing site, or fresh install. Hostinger steps, PHP/extensions caveat, `?v=37` cache-bump rule. |
| `GITHUB-UPLOAD-v37 (1).md` | doc | How to build the GitHub repo from the zip + honest answer about chat/image limits. |
| `HANDOFF-GITHUB-v37 (1).md` | doc | Repo layout + current state + the job. The doc to paste into a fresh chat. |
| `HANDOFF-NEXT-v37.md` | doc | Deeper state: deliverables, site audit (v35 live, v36/v37 fine), batch status, env, workflow rules. |
| `REPAIR-SITE-v37.md` | doc | Site diagnosis (live reverted to v35), proof v36/v37 isn't buggy, deterministic redeploy, 19-point security audit. |
| `shivaa-FULL-fresh-install-v37.zip` | 27.7 MB | The repo skeleton: `cms/`, `pipeline/`, `demo65/`, `qa/`, `docs/`, `README.md`. Fresh-install site (clean demo DB 342 products, 20 catalogue PDFs, 2 exemplar products PGS5001/PGS5004 with photos + film). |
| `shivaa-update-v37.zip` | 157 KB | The 4-file live update: `index.html` (`?v=37` ×7), `api.php`, `css/styles.css`, `js/app.js`. Deployed to Hostinger `public_html`. Never touches `data/`/`uploads/`. |

## 3. Repo layout (as documented in the handoffs)

```
cms/            website files (php -S 0.0.0.0:8090 inside cms/ for local test)
                · demo DB 342 products, admin@shivaa.in
                · uploads/: 20 catalogue PDFs + 2 exemplar products (PGS5001, PGS5004)
                · index.html (?v=37 ×7), api.php (POST /api/media), css/styles.css, js/app.js, .htaccess
pipeline/       stages 01_ingest_pdf → 01b_ocr_tags → 02_normalize_data → 03_photoshoot
                → 04_render_video → 05_metadata → 06_upload  +  lib_common + config
demo65/         the batch:
                · config.json (out_dir = "media" — never "out/")
                · raw/65rings.pdf
                · suppliers/
                · work/designs.json   (65 SKUs, 22K purity, REAL gram weights, sizes, tags, img paths — OCR-verified)
                · work/ledger_*.csv   (progress ledgers)
                · media/designs/*.jpg (65 crops)
                · media/PGS5xxx/      (shots / video / meta)
                · status.py
qa/             qa_v36.py · smoke_media.py
docs/           DEPLOY-v37.md · REPAIR-SITE-v37.md · PIPELINE.md
deploy/         deliverable zips (shivaa-update-v37.zip, shivaa-FULL-fresh-install-v37.zip, shivaa-batch65-media.zip)
README.md
```

## 4. Current state (per HANDOFF-NEXT-v37 / HANDOFF-GITHUB-v37)

Batch status via `cd demo65 && python3 status.py`:

- CROPS **65/65** ✓
- COMPLETE **7/65** (PGS5001–5007) — i.e. 7 designs fully shot + filmed
- SHOTS **28/260**
- VIDEOS **7/65**
- META **65/65** ✓

**Remaining: 58 designs (232 shots)** at ~10 shots/message ≈ 24 "continue" messages.

Site audit: **live shivaa.in is on v35**. The v36 deploy did not stick; the v36/v37
code itself is provably fine (Chrome-verified: hero, 4 posters, bestsellers, PDP
film gallery, 0 console errors). Fix = extract `shivaa-update-v37.zip`.

## 5. The job remaining (in order)

1. `cd demo65 && python3 status.py` → **verify, don't trust.** Any file a ledger says
   is done must exist on disk (>20 KB). Do not regenerate what the ledgers say is done.
2. **Finish the 58 designs** the same way as the previous session:
   `generate_image` ×10 per message with reference `demo65/media/designs/{SKU}.jpg`
   (4 prompt templates in `demo65/config.json`: studio / worn / gift / editorial),
   then `python3 ../pipeline/04_render_video.py --only <SKU>`, then `status.py`.
3. When 65/65: set `demo65/config.json` → `upload.base_url = "https://shivaa.in"`,
   `dry_run = false`; get a login token (ask user for the admin password — **not**
   in repo; advise rotating it after); `python3 ../pipeline/06_upload.py --all`.
4. **Verify live** (never declare done otherwise): `/api/products?q=PGS` → 65 items,
   each 4 images + video + computed price; spot-check 3 PDPs (film = first gallery
   slide, FILM badge) + 1 homepage render — screenshots required.
5. On any 4xx/5xx → rerun `--only SKU` (idempotent upsert).

## 6. Rules (must never be violated)

- **Never fabricate** weight / purity / price — `work/designs.json` is ground truth.
- **Never hand-edit** `cms/data/db.json` — API only.
- Bump `?v=` in `cms/index.html` (7 refs) whenever JS/CSS changes.
- `curl -F` >1 KB to `php -S` fails (http=000) — use Python `http.client` (see `qa/smoke_media.py`).
- PyMuPDF is not thread-safe (≤3 workers).
- Clear stale `work/ledger_*.csv` when regenerating media.
- No `out/`-named dirs — media lives in `demo65/media/`.
- Large uploads via `06_upload.py` only.
- Out of scope this round: new suppliers, SMS gateway go-live, scaling beyond 65 (ask first).

## 7. Environment needed

pip: `pymupdf pytesseract opencv-python-headless openpyxl pillow numpy requests`
apt: `ffmpeg php-cli php-curl tesseract-ocr`
php dev server: `php -S 0.0.0.0:8090 -t cms cms/router-dev.php`
Site runtime: PHP 8.1+ (tested 8.4), extensions `finfo json curl mbstring` (all default on Hostinger). Hostinger PHP limit 64 MB; upload cap 25 MB/file.

## 8. Security audit summary (from REPAIR-SITE-v37)

Strong (verified live): `data/db.json`, `data/sms-config.json`, `samples-payload.json`,
`migrate-repair.php`, `router-dev.php` all 403; no directory listings; `sms.php` no-op
without config; 6 security headers (CSP `default-src 'self'`, X-Frame-Options DENY,
nosniff, HSTS, Referrer-Policy, Permissions-Policy); no secrets in package (env-var only).

Action items:
1. **Rotate the live admin password** (top item — shared with this project).
2. CSP keeps `script-src 'unsafe-inline'` (legacy inline handlers) — acceptable; escape user input with `esc()`.
3. SMS gateway: keep `sms-config.json` absent until go-live, then add a shared-secret check.
4. Login brute-force: `loginFails` tracking exists; add IP throttle before public launch.
5. Dev-only: `php -S` doesn't serve HTTP Range → `ERR_ABORTED` in logs is harmless.

## ⚠ Network note

This sandbox's egress proxy blocks **Google Drive** but allowlists **GitHub**. The
zips could not be pulled from the Drive links directly in bash. The user instead
uploaded `shivaa-FULL-fresh-install-v37.rar` (24.3 MB) to the GitHub repo. I pulled
it via git, compiled a RAR5-capable `unrar` (7.23) from the `pmachapman/unrar`
mirror (the bundled `7za` was too old and `apt` was blocked), and extracted the
nested zip. Recovery complete — see §9.

## 9. ACCOUNTING — what the recovered zip actually contains (2026-09-04)

Extracted from `shivaa-FULL-fresh-install-v37.zip` (33 MB, 202 files):

**Present ✅**
- `cms/` (164 files) — full site: `index.html` (?v=37), `api.php`, `css/`, `js/`,
  `data/db.json` (**342 products**, verified demo DB), `.htaccess`, `sms.php`,
  `migrate-repair.php`, `samples-payload.json`, `images/` (banners, product samples,
  reviews), `uploads/catalogs/` (**20 catalogue PDFs**), `uploads/designs/rings/`
  (8 exemplar jpgs), `uploads/videos/rings/` (2 exemplar films), `docs/`.
- `pipeline/` (11 .py, all compile clean) — full 7-stage automation.
- `qa/` (2 scripts, compile clean).
- `docs/` — `DEPLOY-v37.md`, `PIPELINE.md`, `REPAIR-SITE-v37.md`.
- `README.md` (project).
- `deploy/shivaa-update-v37.zip` — the 4-file live fix (index.html, api.php,
  css/styles.css, js/app.js), verified contents.

**Missing ❌ (critical)**
- **`demo65/` directory is absent** from the FULL zip. There is no `status.py`,
  no `raw/65rings.pdf`, no `suppliers/`, no `work/designs.json` (the 65-SKU
  OCR-verified ground truth), and no `demo65/media/` (65 crops + generated
  shots/films/meta). The README and `GITHUB-UPLOAD-v37.md` explicitly state
  `demo65/` is part of the FULL skeleton — so this archive is **incomplete** and
  does **not** match what the handoffs describe.

**Implication:** the primary job — "finish the 58 remaining designs" — cannot start
until `demo65/` is in the repo, because:
- `work/designs.json` is the ground-truth source for SKU codes, weights, purities,
  sizes, tags, and image paths. Without it, generating designs would risk
  **fabricating weight/purity/price (a hard rule we must never break)**.
- `media/designs/{SKU}.jpg` crops are the exact reference images the AI photoshoot
  (`03_photoshoot.py`) needs as `img2img` input.
- `demo65/config.json` (with the 4 prompt templates + upload settings) is the batch
  config; only `pipeline/config.example.json` is present, and it is an example.

I need the **`demo65/` folder** (or a fresh archive containing it) uploaded to the
repo to proceed with the batch. Everything else needed (site, pipeline, QA) is in.

## 10. CHANGELOG — 2026-09-04 site audit, bug-fixes, security hardening & banner refresh

Cache version bumped **`?v=37 → ?v=38`** across `cms/index.html` (7 refs) after JS/CSS changed.

### Security hardening (`cms/api.php`)
- **Fixed a real data leak:** `GET /api/settings` (unauthenticated) returned the entire
  settings object. If an admin ever saved a GST-verification API key under
  `settings.gstApi`, it was exposed to the public storefront. Now strips `gstApi`,
  `sms`, `paymentKeys`, `payment`, `secrets` from the public GET; admin PUT response
  is unchanged. (Mirrored in the Node preview shim.)
- **OTP SMS-spam protection:** added `otp_throttle()` (per-IP: max 3 sends / 30 s then
  a 15-min cooldown) to both `auth/send-otp` and `kyc/send-otp`. Guards the SMS
  gateway against an attacker blasting thousands of codes (bill + spam).
- **Non-spoofable login throttle:** `auth/login` now uses `client_ip()` which trusts
  only the last hop of `X-Forwarded-For` when `REMOTE_ADDR` is private/loopback. The
  old code trusted `X-Forwarded-For` directly, so a client could set it to rotate
  identities and walk past the brute-force lockout.
- **Stronger partner authorization:** added `is_approved_partner()` / `need_approved_partner()`.
  Partner-only endpoints (`catalogs`, `metalexchange/*`, `bullion/*`) now require a
  partner whose application is **approved**, not merely a `partner` role. Partners
  are created with `partnerStatus: pending`; admin approval flips it to `approved`.
  Legacy partners auto-heal to `approved`. `pub_user` now exposes `partnerStatus`.
- **Password policy parity:** `partners/apply` now enforces the same ≥8-char password
  rule as retail registration (the UI already said min 8).

### B2B / KYC form fixes (`cms/js/app.js`)
- **Added the missing `pages.partner` portal page.** The app redirected partners
  (and post-application users) to `#/partner`, but no such page existed → a 404
  "slipped its clasp" dead end. New page shows application status (Pending vs
  Approved), live settlements (`/api/partners/me`), and link tiles for approved
  partners.
- **`isPartner()` now reflects approval state** (admin or a non-pending partner), so
  pending applicants see the correct gate and don't get a silent 403.
- **OTP flow made reliable & WYSIWYG:**
  - "Send OTP" now disables the button and shows a live **30 s resend countdown**
    (mirrors the server's cooldown, so users aren't told to "wait" with no feedback).
  - Editing the **mobile** after OTP verification resets the verification flag (the
    submit button re-locks), preventing the confusing "verification first" errors.
  - Editing the **GSTIN** after verification also resets it and un-read-only's the firm
    name.
  - `kycOtpVerify` rejects a code if the phone number changed since sending.
  - Submit button gets a busy state and the success modal now says "unlocks once
    approved" and links to the tracker (not a broken portal promise).
- **Password field** changed to `minlength="8"` (matches the backend).

### Home-page flicker / robustness fixes
- **Root cause found & fixed:** `heroDust()` called `canvas.getContext('2d')` with no
  null guard — if the context is ever unavailable (headless/print/old webview) the whole
  `#view` was replaced with "Something slipped". Hero dust now degrades gracefully.
- `bindReveal()` now bails out and shows content if `IntersectionObserver` is missing
  (older webviews) instead of leaving everything at `opacity:0` (blank "flicker").
- Reveal animation softened from 30 px / .8 s to **14 px / .5 s** — subtler, reads as
  an ease-in rather than a jump that users perceive as flicker.
- Carousel poster `<img>`s now eager (`fetchpriority="high"` on the first, no `loading="lazy"`
  on the others) + explicit `width`/`height` + `decoding="async"` — no blank-frame pop
  between slides.

### Banner quality refresh (`cms/images/banners/*`)
All six home banners regenerated at a **uniform 16:9 (1376×768)** — previously they
were mismatched aspect ratios (1584×672, 1075×672, 1228×768, 500×750) that caused
cross-fade jump/layout shift. New versions are on-brand luxury jewellery imagery with
a clean left third for the headline, and are web-optimized (71–199 KB each):
`hero-main` (moody maroon + gold dust), `poster-heritage` (goldsmith's hands),
`poster-bridal` (bridal set on crimson silk), `poster-everyday` (light, airy), `wedding`
(gold savings/coins), `b2b-bullion` (gold bullion).

### Accessibility & polish (`cms/index.html` + `cms/css/styles.css`)
- Visible keyboard **focus ring** (`:focus-visible`) and a **Skip to content** link
  (`<a class="skip-link" href="#view">`) with `<main id="view" tabindex="-1">`.
- `.sr-only` utility class.

### Verified (headless render via jsdom against the real `index.html` + `app.js`)
- Home page renders **all** sections (hero, carousel, hero-stage, category mini,
  bestsellers, rate strip, UGC wall, pillars, B2B banner, newsletter) — 59,129 chars,
  **0 errors**.
- B2B KYC form renders (kyc-form, GSTIN, phone, OTP, min-8 password).
- All boot() API endpoints (settings, making-charges, products, catalogs, rates,
  pages, auth/me) return correct shapes and `?v=38` refs resolve.

### Preview tooling
- `cms/preview-server.js` (Node HTTP server + read-only API shim) keeps the live
  preview working in this sandbox (no PHP available), and now mirrors the settings
  redaction and banner dimensions. Kept as a dev tool; harmless to commit.

## 12. CHANGELOG — v40 · Razorpay online payments (UPI, cards, netbanking)

**"Just add the API key" — no code changes needed.** Enter your Razorpay **Key ID** and
**Key Secret** in Admin → Settings → *Online payments — Razorpay*, hit Save, and online
checkout goes live. The key secret is stored server-side and never exposed to the
browser.

### How it works (and why it's safe)
The flow follows Razorpay's recommended security model — the secret never reaches the
client, so the amount can't be tampered with:
1. `POST /api/orders` creates the order. For online methods it now sets
   `paymentStatus: 'Pending payment'` (was `'Paid'`) so nothing is marked paid until
   the gateway confirms.
2. `POST /api/payment/create-order` — server calls Razorpay **Orders API** with the
   total (converted to paise server-side), stores the returned `razorpayOrderId`, and
   returns only the **public** `key_id` + order id + amount to the frontend.
3. Frontend opens Razorpay's hosted checkout for that order.
4. `POST /api/payment/verify` — server recomputes
   `hash_hmac('sha256', order_id + '|' + payment_id, key_secret)` and confirms it matches
   the Razorpay signature, then (optionally) re-fetches the payment to confirm it's not
   `failed`/`refunded`. On success it flips the order to `paymentStatus: 'Paid'`.
5. Order page shows a **Pay Now** (resume) button if a payment is still pending, so a
   cancelled/reloaded checkout isn't lost.

### Config stored in `settings.razorpay = { key_id, key_secret, mode }`
- Admin Settings form has **Key ID**, **Key Secret**, and a **Test/Live** mode select,
  plus a live/off status badge.
- **redaction:** `GET /api/settings` (public) strips `razorpay` and `gstApi`/`sms`/
  `paymentKeys`/`payment`/`secrets`. It exposes only a safe `razorpay = { enabled,
  keyId, mode }`. The admin `PUT` preserves an existing secret if a blank is saved.
- `GET /api/payment/config` is the public "is it on?" signal the storefront reads.

### Security headers (.htaccess CSP)
Relaxed the Content-Security-Policy to allow Razorpay's hosted checkout while keeping
`frame-ancestors 'none'` (so the site can't be framed) and `object-src 'none'`:
`script-src`, `connect-src`, `frame-src`, and `img-src` now add the Razorpay domains
(`checkout.razorpay.com`, `api.razorpay.com`, `*.razorpay.com`). `form-action 'self'`
and `base-uri 'self'` are unchanged.

### Verified
- `GET /api/payment/config` returns `enabled:false` (no key) / the safe config.
- Public settings never include `key_secret` (confirmed).
- Checkout page renders both states: **ON** shows "Secure online payment by Razorpay",
  **OFF** shows the demo notice — zero JS errors.
- Admin Settings tab renders the Razorpay card + both fields + mode select +
  `saveRazorpay` handler (zero errors).
- JS syntax: `app.js`, `admin.js`, `preview-server.js`, `index.html` (`?v=40`) all pass
  `node --check`. PHP reviewed by line (no `php -l` in sandbox).

## 13. CHANGELOG — v41 · six-feature batch (SEO, abandon-cart, compare, Hindi, loyalty/referral, review moderation)

Began on top of the Razorpay commit `329154a`. `?v=40 → ?v=42` across CSS/fonts/JS.

### 13.1 SEO structure
- `index.html` head: canonical `https://shivaa.in/`, `robots`, `keywords`, geo meta, full
  Open Graph + Twitter cards, `JewelryStore` JSON-LD (name, Jayal/Nagaur address,
  geo 27.2433/74.0583, priceRange ₹₹, INR).
- `js/app.js`: `setSeo()` helper; a per-page default meta map inside `route()`; Product +
  BreadcrumbList JSON-LD at the end of `pages.product` (uses `price(p).total`, `aggregateRating`
  only when `p.reviews > 0`).
- Generated `cms/sitemap.xml` (351 URLs from `data/db.json`) and `cms/robots.txt`
  (Disallow `/api/ /data/ /uploads/ /admin`, Sitemap `https://shivaa.in/sitemap.xml`).

### 13.2 Abandoned-cart recovery
- Backend: `POST /api/cart-abandon` (register cart with contact — computes subtotal from live
  rates, reuses an open record for the same phone); `GET /api/cart-abandon` (admin list);
  `POST /api/cart-abandon/:id` (admin nudge → advances `nudgeLevel` 1 (≈1h) then 2 (≈24h),
  returns `nextDueAt`, or `action:'converted'`).
- Frontend: `state.cart` age tracked in `shv_cart_at`; cart page calls `regAbandoned()` and shows
  a dismissible banner after ~1h with a "Complete order" + "WhatsApp reminder" (pre-filled
  saved-cart nudge) + dismiss. `cartQty/cartRemove/placeOrder` maintain the timestamp.
- Admin: **Cart Recovery** tab shows open/abandoned carts, recoverable value, nudge level and
  a "Send nudge" button (opens a pre-filled WhatsApp chat to the cart's number) + "Converted".
- Production automation: point a cron at `POST /api/cart-abandon/:id` (admin token) at 1h and
  24h; the WhatsApp/email send itself is your messaging gateway (BSP / WhatsApp Business API).

### 13.3 Compare products
- `state.compare` (localStorage `shv_compare`, max 4) + `toggleCompare`, a fixed bottom
  `#compareBar` with thumbnails/remove/clear, and a side-by-side modal (`openCompare`) showing
  metal, purity, weight, rate/g, metal value, making charge, stone, GST, total.
- `⇄` button on every product card and on the PDP; header `#compareBtn` + `#compareCount` badge;
  persists across reloads.

### 13.4 Hindi / regional language toggle
- Small, unobtrusive side-fixed toggle (`#langToggle`, right edge, two tiny pills EN / हिं).
  One tap switches; choice persisted (`shv_lang`).
- Translates key CTAs & nav labels (Shop, Rates, Wishlist, Account, Add to Cart, Chat to Order,
  Make It Yours) via `t()` + `applyLang()`. New text-string window can be extended in `LANG`.

### 13.5 Customer loyalty / referral tie-in
- Cart summary shows "You'll earn ~X royalty points (1 pt per ₹100)" ('earn points on every gram').
- Register form: optional "Referral code" input (prefilled from `?ref=CODE`, which is captured
  in `REF_CODE`); sends `referral` to `auth/register`.
- Backend: register credits the referrer +200 pts, logs a `referrals` row, backfills
  `referralCode` for legacy users, adds `GET /api/referral` (`{code, earned, pointsAwarded, count}`).
- Account → Loyalty tab shows the referral card (code, copy code / copy invite link, pts earned
  from `loadReferral()`).

### 13.6 Review moderation + photo reviews
- New reviews enter as `status:'pending'` and only `approved` ones appear on the product page.
  Legacy 767 reviews are backfilled to `approved` (so nothing disappears).
- Reviews carry `verified` (auto-true for customers with a completed order) + `photos` (up to 4,
  client-shrunk to ≤1200px JPEG data-URLs, saved to `cms/uploads/reviews/`).
- Product page shows a `✓ Verified buyer` badge, clickable photo gallery, and an optional photo
  upload in the review form + a "awaiting moderation" note.
- Admin → **Reviews** tab: filter by status, Approve / Reject / toggle-verified / Delete.

### Verified
- `node --check` passes for `app.js`, `auth.js`, `admin.js`, `preview-server.js`.
- Preview shim (`preview-server.js`) mirrors `/api/referral`, `/api/reviews` (GET/PUT/DELETE),
  and `/api/cart-abandon` (POST/GET/nudge) so the sandbox preview behaves; smoke-tested the
  endpoints + `?v=42` references. PHP reviewed by line (no `php -l` in sandbox).

### 13.7 UI/UX audit fixes (v41.1)
- **Category slider circles restored:** the compare-bar CSS used the same `.cb-item` / `.cb-item img`
  class names as the homepage category circle slider, and being later in the sheet it
  overrode them — turning the circular category images into 38px rounded rectangles.
  Renamed the compare-bar classes to `.cpb-*` so the two no longer collide. The category
  images are 1000×1000 squares in an `84px` `border-radius:50%` `overflow:hidden` frame.
- **Compare modal showed `₹NaN`:** the price rows referenced `p.ratePerGram` / `p.metalValue` /
  `p.makingCharge` / `p.gst` / `p.total` on the *product* instead of the computed *price*
  object, so every price column rendered `₹NaN`. Now reads `pr[i].*`.
- **Compare state not refreshing:** `refreshCompareBadge()` + `renderCompareBar()` are now called
  at the end of every `route()` so the per-card ⇄ highlight and the bottom bar stay in sync
  after navigation.
- **Compare bar overlapped the mobile bottom nav & hid content:** toggles a `body.cmp-open`
  class that pads the page and lifts the bar above the mobile nav (`bottom:calc(56px + safe-area)`).
- **Mobile product-card action buttons** (wishlist + compare) shrank from 38px to 32px on
  ≤680px so they cover less of the product photo.
- **Home "Shop by category" labels** bumped from 9px to 11px for readability.

All four JS files still pass `node --check`; `?v=42` refs unchanged.
