# DEPLOY v183 — Catalogue & billing safety follow-up

**Built:** 27 Sep 2026 · **Source:** `2c2fde7c95496a3943ed2e94e9779fbed0babe71`
**Status:** packaged and QA-gated; **NOT deployed**. Last independently verified live release: **181 on 25 Sep** (check live `/api/version` again before installing). **Do not extract without the owner's explicit approval.**

**Package:** `shivaa-update-v183.zip` · 456,022 bytes · SHA-256 `fe2a0c114586933ecd94a127e1b240b6850c568d40aa2d36e96f79df62453e27`.

v183 is **cumulative**: it contains v182's staging/review queue, billing stock bridge, SQL reconciliation script and settlement-key fix. If the site is still on v181, **use v183 instead of v182**; do not install both. If the owner has already installed v182, v183 is a forward-only fix. Never overwrite a newer live release with this package.

## What v183 corrects

1. The billing HMAC sync key was labelled write-only, but v182 admin `GET/PUT /api/settings` returned the plaintext. Admin settings responses now contain only `billingSyncConfigured: true/false`, never `billingSyncSecret`. Blank PUT still preserves the saved key and signed calls keep working. The admin indicator reads the boolean.
2. The catalogue intake form used an importable-looking example with invented weight, purity, charges, stock and a fake photo path. The editable JSON shape now has **empty factual fields and no invented media path**; the existing importer continues to reject missing owner weight/purity/source. Missing inventory now defaults to **zero**, not an invented in-stock unit. The owner must supply real stock before selling.
3. Approve/Skip now act only on **pending items in known batches**. An ordinary live product cannot be skipped accidentally; a skipped piece cannot later be approved by sending its ID. Non-finite weights are rejected.

No real catalogue, supplier data, orders, uploads, config, payment settings, or database contents were edited. The ZIP contains precisely six root-layout files: `api.php`, `index.html`, `js/app.js`, `js/admin.js`, `sw.js`, `upgrade-sql.php`. It does **not** contain `data/`, `uploads/`, `config.php`, `.htaccess`, or any `/billing/` app files. Media cache remains v168. No new schema was introduced beyond the v182 reconciler.

## Owner-controlled install (only after explicit yes)

1. Confirm `https://shivaa.in/api/version` and **stop** if live is newer than 183. Take a full hPanel `public_html` backup.
2. Extract `shivaa-update-v183.zip` into `public_html/`, allowing overwrite of the six named files.
3. If moving from **v181**, open `https://shivaa.in/upgrade-sql.php`, enter the **CMS admin password locally**, run once and check every green count/spot-check tick. This adds the v182 catalogue schema and reconciles all collections before MySQL mode is considered healthy. If v182 was already reconciled, re-running is idempotent but still check its output. Do not send passwords in chat.
4. Check `/api/version`: `rel:183`, `stamp.matched:true` with index/app/sw all 183, `db.driver/mode:"mysql"` and `mirrorBehind:false` (if configured). Admin → Catalogue Intake should load; ordinary products must remain untouched.
5. **Do not enable the billing sync key** until the owner's separate billing app ZIP has been inspected and installed under `/billing/`; the bridge stays dark by default. Any first batch needs real owner-tag/sheet weights, purity, stock and photo references, followed by manual review and approval.

**Fallback:** if the SQL upgrade is not healthy, the built-in JSON safety net applies; check `/api/version.db.reason` and the installer output before any further write. To revert DB mode set `db_driver => 'json'` in the private host config. For a code rollback use the backup created in step 1 under owner supervision; never blindly extract an older ZIP over a newer live release.

## Evidence / limits

- `npm test`: green (v183 static 4/4 + executed PHP 4/4; v182 PHP 9/9; older executed gates green; deploy approval 20/20). Same v183 gates also passed against the extracted ZIP overlay. ZIP bytes matched six source files; no protected paths.
- No live Hostinger access, real multipart HTTP or real MySQL round trip was run in this session. The owner must verify the installer and live endpoint after installation. Billing software ZIP is not in this repository; integration is not end-to-end live.
