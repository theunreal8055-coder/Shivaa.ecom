# DEPLOY v185 — Mobile canvas, footer spacing and narrow-page repair

**Built:** 28 Sep 2026 · **Source:** `bd73a7f581d9f723ae1b7684ce4da23eabcf61fa`
**Status:** ZIP prepared, **not deployed**. Last verified live in the handoff was v181 on 25 Sep; this sandbox cannot establish HTTPS to Hostinger, so check `/api/version` yourself before installing. Never overwrite a live release newer than 185.

**Update file:** `shivaa-update-v185.zip` · 459,414 bytes · SHA-256 `59559a2e9e099dedacd94bc149c6b7a6ad368fa297929f262224d9ea1a931ce3`.

## What caused the extra red / narrow layout

1. `mobile.css` explicitly set the **root HTML canvas** to dark maroon (`#1d0509`) on every phone, even though the page itself is cream. The red showed through during short pages/rubber-band scroll. `index.html` also set the default browser toolbar to maroon; both app manifests set installed-app chrome/splash to maroon. v185 gives those *surrounding surfaces* the cream colour. The deliberate maroon hero, banners, cards and footer artwork stay unchanged.
2. `v117.css` reserved **860px** for an off-screen mobile footer and deferred `aurum.css` reserved **900px**, even though `mobile.css` previously documented that fabricated footer heights caused gaps. The new final stylesheet renders the phone footer at its real height; its selector wins even if the deferred CSS finishes loading later.
3. The privacy table was made its own horizontal scroll area but the scroll area itself still had `min-width:460px`. On a 320px phone this can widen the page instead of scrolling the table. v185 lets the table container shrink to the phone and scroll its rows internally; the privacy hero also wraps on narrow screens.

This is a **targeted mobile fix**, not a claim that every page/device has been visually audited. It is **cumulative from v181+**, including v182 SQL/catalogue, v183 billing safety and v184 product-gallery repairs. Do not extract v182–v184 afterward.

## Package / installation (owner-controlled)

10 root-layout files: `api.php`, `css/v184.css`, `css/v185.css`, `index.html`, `js/app.js`, `js/admin.js`, `sw.js`, `upgrade-sql.php`, `manifest.webmanifest`, `manifest.json`. No `data/`, `uploads/`, billing app, `config.php`, credentials, `.htaccess`, or customer records.

1. Check `https://shivaa.in/api/version` first. **Stop if `rel` is greater than 185 or the version is unreadable.** Make a full `public_html` backup in hPanel.
2. Upload this ZIP to `public_html/`, extract there and overwrite only the listed files. No live deployment has been initiated by this agent.
3. If the site is **still v181**, run the included `https://shivaa.in/upgrade-sql.php` using your CMS admin password locally on Hostinger. It applies the cumulative v182 catalogue schema; check its reconciliation ticks. If v182+ already ran it, rerunning is idempotent. Never share passwords in chat.
4. Confirm `/api/version`: `rel:185`, matching index/app/SW stamp 185; if MySQL mode is configured, `db.mode:"mysql"` and `mirrorBehind:false`. Reopen the mobile browser/PWA once for the new shell and versioned manifest.
5. On a **320–390px phone**, check Home, Shop, a ring product, Privacy, and the footer. A cream page should no longer show dark red around its edges, the footer should not reserve a dark empty band, Privacy should scroll its table *inside* the card, and vertical page scroll must still work. Maroon brand sections should still be maroon. If any specific red area remains, send a screenshot and page URL so it can be distinguished from intended artwork.

## Verification and limits

- `npm test` green (deploy gate 20/20, v185 mobile assertions 4/4, v184 gallery 8/8, v183 PHP 4/4, v182 PHP 9/9 and older suites). v117 UI check 27/27. New checks also passed against the extracted ZIP layered over the v182 repository baseline; all 10 ZIP entries matched source bytes and contained no protected paths.
- This sandbox has no live Hostinger access; a Chromium download was blocked by TLS. The colour and responsiveness verification is based on CSS/code and isolated tests, **not a physical-phone screenshot**. Owner phone acceptance is required before claiming the live visual issue is gone.
