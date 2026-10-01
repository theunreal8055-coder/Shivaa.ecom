# UPDATE v183 — Responsive Homepage Hero + Four-Slide Banner System

**Built:** 1 Oct 2026 (UTC) · **Release stamps:** 183 · **Branch:** `arena/01a0f602-shivaa-ecom`

> **Status: preview package only — not staged, not deployed, and not approved for production.**
> The live Arena preview is available for owner review. Production remains blocked until visual approval, authorized staging checks, and explicit owner approval.

## What changed

- Replaced the CSS-background-only home hero with a responsive `<picture>` using an art-directed mobile crop, WebP where supported, and JPEG fallback. Desktop and mobile hero preloads are viewport-matched and high priority.
- Consolidated the main hero to its existing **“Win 10g Gold Biscuit”** action. Live rates remain discoverable in navigation and the hero copy. The separate Gold Biscuit campaign entry card, image, and behavior were not changed.
- Rebuilt the four non-campaign carousel slides from one shared, data-driven template, preserving their order: **heritage/HUID → bridal/trousseau → everyday under ₹50,000 → Swarna Nidhi**. Each slide has one action, responsive desktop/mobile artwork, descriptive image text, and lazy loading after the first slide.
- Removed the visit-reset bridal countdown and the static “from ₹2,400” price lock; both could imply time/price facts the page could not substantiate.
- Made carousel indicators keyboard buttons with labels/current state; off-slide content is hidden from assistive technology and inert where supported. Autoplay pauses for focus, mouse hover, a hidden tab, and reduced-motion preference.
- Kept the supplied navy logo artwork unchanged. Its hero card uses an opaque white backing for contrast; no logo redraw or recoloring was made.
- Bumped page, application, service-worker, API, CSS, and asset cache stamps to **183**. The media-cache generation remains unchanged.

## Before / after

| Area | Before | After |
|---|---|---|
| Main hero media | CSS background reused a wide image at phone sizes | `<picture>` selects a dedicated 640×800 mobile crop or desktop artwork, with WebP/JPEG fallback and matching preloads |
| Featured banners | Four separately authored slide blocks; mobile used the wide artwork | Four ordered data records rendered by one reusable template; responsive sources, meaningful alt text, eager first slide and lazy later slides |
| Carousel controls | Decorative dot spans and inactive slide content remained exposed | Labeled buttons with `aria-current`, inactive slides `aria-hidden`/`inert`, interaction-aware autoplay and reduced-motion pause |
| Gold Biscuit campaign | Separate entry card and campaign art | Unchanged; original card block and image hashes are verified below |
| Release/cache | v182 stamps | v183 stamps in shell, app, worker, API and asset URLs |

## Protected campaign verification

The separate Gold Biscuit home-card block and image match their recorded pre-change SHA-256 values:

- Card block (`cms/js/app.js`): `062bee45f2429f86ba34ea4678b8d71156003195e2bb1b852cb7dba64d12843b`
- `cms/images/banners/gold-biscuit-campaign.jpg`: `b979aa9adfd0f2524af465b95f1f1c89534ef5d2275cf8d223067fa86b95286e`

The campaign image is not part of the v183 update archive because it is unchanged.

## Update package

- **File:** `shivaa-update-v183.zip`
- **Size:** 2,057,861 bytes · **SHA-256:** `887d513a9ffef96a99ef0fed99377fe53f4ab759466a582cddc2bbd117fdaa82`
- **Integrity:** ZIP test passed · **Contents:** 20 files · **Layout:** paths are relative to the web root (same overlay layout as v182).

The archive includes `api.php`, `index.html`, `js/app.js`, `sw.js`, `css/v183.css`, and 15 new responsive banner derivatives. It intentionally excludes unchanged desktop JPEG originals, campaign art, private data/configuration, and test tooling. No SQL migration is included or required for this UI/cache release. Treat the archive as a review artifact; do not upload it to production before approval.

## File / component inventory

### Runtime and assets

- `cms/index.html` — v183 shell/cache stamps, v183 stylesheet, desktop/mobile hero preloads.
- `cms/js/app.js` — shared responsive-picture helper; primary hero; four-slide data/template; carousel accessibility and autoplay guards.
- `cms/css/v183.css` — responsive image framing, opaque logo backing, carousel controls/trust row, reduced-motion overrides.
- `cms/sw.js` — v183 shell and precache references; media cache generation intentionally unchanged.
- `cms/api.php` — release telemetry stamp only; no payment/business route was changed for this batch.
- `cms/images/banners/` — 15 generated derivatives: desktop WebP and mobile JPG/WebP for `hero-main`, `poster-heritage`, `poster-bridal`, `poster-everyday`, and `wedding`.
- `tools/mega/make-v183-hero-assets.sh` — repeatable derivative generator; original source artwork is left intact.

### Verification and preview tooling

- `tools/mega/smoke/v183-check.js` — nine v183 release gates; wired into the smoke `npm test` chain.
- `tools/mega/smoke/v119-check.js`, `v121-check.js`, `v156-check.js` — historical regression assertions updated to test the current responsive hero/banner behavior rather than obsolete markup/CTA wording.
- `tools/mega/smoke/v179-relay.js`, `v182-php-run.js` — future-dated relay fixtures and release-floor assertions made forward-compatible.
- `tools/mega/smoke/preview-server.js` — preview `/api/version` now derives its handshake from the source stamps.
- `tools/mega/smoke/package.json` — v183 checks included in `npm test`.

## Verification results

- `npm test` (from `tools/mega/smoke`): **PASS**; 188 active checks passed. Expected superseded-release checks skipped.
- `npm run test:regression` (from `tools/mega/smoke`): **43 suites passed, 24 retired-feature suites skipped, 0 failed**. The historical v119, v121, and v156 failures are resolved by carrying their assertions forward to the current behavior, not by skipping them.
- Release-specific `v183-check.js`: **9/9 passed**.
- PHP route sweep: **221 routes, 0 exceptions** (source-level route sweep only; not a live-system security audit).
- Preview HTTP checks: home returned 200; `/api/version` reported `rel: 183` and `matched: true`; mobile hero WebP returned 200 (93,946 bytes).
- `node --check` passed for `cms/js/app.js`, `cms/sw.js`, and the preview server; update ZIP integrity check passed.

## Visual approval, staging, and deployment

- The Arena live preview is running for owner review. **No approval screenshots were captured.** There was no browser executable in the environment; the Playwright browser download failed at the external CDN, and the bundled headless fallback could not start because system NSPR/NSS libraries are unavailable. The preview has not been visually approved by an agent or on a real device.
- **Not tested:** real phones/tablets, in-app browsers, authorized staging, production, payment-provider/CRM/ERP live integrations, or the wider security, privacy, legal, and business-system audits. Automated/JSDOM checks are not substitutes for those checks.
- No staging or production deployment occurred. Before go-live: review the running preview on desktop and mobile, capture/approve screenshots, run the package on an authorized staging site, verify the release handshake/cache behavior there, and obtain explicit owner approval. This branch/package alone is not deployment authorization.
