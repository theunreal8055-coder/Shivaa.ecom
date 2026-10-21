# DEPLOY-v208.md — release 208 · THE MEGABRIEF · offers, motion, mobile, bug hunt

Status: **READY — owner approval required before anything is taken live.**
A push, a green test run, or a finished zip is **not** approval. Live today is
**v205** (WWW + Netlify). If anything higher than 208 is live, stop.

**Read `DEPLOY-v205.md` first — owner gotchas, bind-shell ladder, zero-config
deploy. Drop-in replace root with `cms/` (same `index.html` / `.htaccess` /
`sw.js` shape). Then `purge` before `activate`.** This package is the whole
site tree: it carries v206 (flip fix) + v207 (readability) + v208.

---

## 1 · What this release is

Everything the owner asked for in the 2026-10-12 megabrief, done "as the good
designer does", plus a full bug hunt through every page and every button.

### A · The four-box offers block (owner's layout)

1. **Box 1 — 20% off making charges** → **Shivaa Black members** badge, **no
   coupon code** shown anywhere on the card (the saving attaches to the
   membership at checkout). CTA "Get my Black Card" → `#/black-card`.
2. **Box 2 — Free home delivery** → unchanged public coupon **FREEDEL** (code
   stays visible), "Every customer" badge, CTA → `#/shop`.
3. **Box 3 — Premium card** → free delivery for life, free to claim.
4. **Box 4 — Prestigious Member Certificate** (new) → "Keepsake · for members"
   — every Shivaa Black member is welcomed with a personalised Shivaa Family
   certificate, name kept in their account. CTA → `#/black-card`.

Drawer + footer offer minis mirror the same story in two readable lines
(making mini: "Black members", delivery mini keeps FREEDEL; the long note
moved into the tooltip so nothing wraps into a squeezed third line).

> Backend coupons are untouched: `MAKING20` still exists for checkout
> validation, `FREEDEL` unchanged. This release changes **presentation only**.

### B · Rate-strip motion upgrade

A silk marquee ribbon (`.rs-ticker`) carries "MAKING · HALLMARK · CERTIFIED ·
LIFETIME EXCHANGE · BUYBACK · GST INVOICE · INSURED DELIVERY" under the live
rate cells; the numbers are bigger and bolder; every tick now flashes a gold
up-arrow / red down-arrow (`.m-flash-up/.m-flash-down`) with a value pop —
reading the rate feels like watching the market, not a static table.

### C · "More 5D, ads never flicker"

Promoted layers (campaign banner, carousel, category bar, rate strip, hero)
are painted on their own layers with `backface-visibility` + `translateZ(0)`;
a reduced-motion-aware inner-layer parallax gives the depth ("5D") **without**
touching the carousel boxes or the Ken-Burns images — no layout flicker, no
position seals broken.

### D · Search

60 ms debounce (was 90) + the suggestion panel slides open — "fast and fast,
smooth and smooth".

### E · Mobile responsiveness + usability errors (each root-caused)

| # | Owner report | Root cause | Fix |
|---|---|---|---|
| 1 | Product cards: unreadable text/names | stale card colours | v207 §2 (inside this zip) |
| 2 | Gold-biscuit banner: text = background colour; not mobile-optimised | `background-clip:text` foil **fails on mobile browsers** (title vanishes into the ground) | solid cream-gold + shadow; art/titles/CTAs stack cleanly under 860px |
| 3 | Rate strip: numbers hard to read | thin, static, small | §7 above |
| 4 | Offer minis in drawer/footer: unreadable, "2 lines become 3 lines" | cream text on light ground + cramped note | dark-context restyle, 2-line card, note in tooltip |
| 5 | Campaign banner UI broken/buggy | unpromoted layers + reveal repaint + mobile stacking | §C + banner mobile polish |
| 6 | Mobile case not turning properly | `.sv-case-stage` swallowed touch gestures | `touch-action: pan-y` (the JS radius was already screen-adaptive) |
| 7 | Desktop header messy; logo overlapping (screenshot 1) | `.shv-offer-side` offer strip leaked into the desktop nav | hidden ≥861px — one clean header row |
| 8 | Offers strip "3 cards, ugly" (screenshot 2) | old 3-mini hero slot | four-box block above |
| 9 | Search slow | debounce | 60 ms + slide panel |
| 10 | "5D effect possible?" + ads flicker | repaint on unpromoted layers | §C |
| 11 | Every page, every button | — | full walk: **50 routes render, 151 buttons click clean, 0 real errors** |
| 12 | Desktop flip broken on live | live is v205: no v206 `filter:none` neutralizer, no `-webkit-` 3D | v208 carries v206 + adds `-webkit-perspective/-webkit-transform-style/-webkit-backface-visibility` (§14) |

### F · Polishing as the good designer does

- **Login & account creation** (§10): warm gradient brand panel with gold
  crest, tighter form rhythm, readable labels, mobile-friendly field sizes.
- **B2B application form** (§11 + `bf-head`): luxury "partnership" ledger
  heading — gold crest ✦, italic serif display line, four trust chips
  (GST invoicing · rate lock-in · insured dispatch · buyback desk), steps
  cleaned. One-tone text fixed (no more text = background).
- **Home heading scale** on small screens (§13), slider snap + drag polish
  (§8), global touch-targets ≥44px (§3), iOS 3D spellings (§14).

## 2 · Files

- `cms/css/v208.css` — new design layer, loaded **after** every stylesheet
  (14 sections; ~21 KB). Pure additions/overrides; no seal broken
  (`.bc-card` filter stays `filter:none`).
- `cms/js/app.js` — `bannerOfferCard` / `bannerOfferMini` /
  `certificateCardHTML` / `fillBannerOffer` (4-box hero), `renderRateStrip`
  ticker, `initV208Polish()` (drag-scroll, parallax), B2B `bf-head`, search
  debounce 60 ms. `APP_REL = 208`.
- `cms/index.html` — v208.css link + all `?v=208` + `__SHIVAA_REL=208`.
- `cms/sw.js` — SHELL `shivaa-shell-v208`, REL 208, SHELL_FILES includes
  `/css/v208.css?v=208`.
- `cms/api.php` — `'rel' => 208`.
- QA tooling (not deployed-needed): `qa/preview_shim.py` offers/banner
  mirror, `qa/browser/t7-audit.mjs` environment-noise filter fix.

## 3 · Verification (all run before packaging)

| Check | Result |
|---|---|
| `node --check cms/js/app.js` (+ sw.js, v125.js) | OK |
| v208.css braces | balanced |
| Flip regression `t-v206-flip.mjs` | **ALL PASS** |
| Button/route/error walk `t7-audit.mjs` | **PASS 4/4** — 50 routes render, 151 buttons clicked without throwing, product page 30 controls, 0 uncaught errors (jsdom-internal noise filtered) |
| Contrast audit desktop + mobile (45 routes ×2) | same accepted gold-on-cream design landscape as v207; every E-item colour is explicitly fixed (cream-on-dark minis, solid gold banner title, bigger rate numbers) |
| Assets referenced from index.html | all present |
| Offer block DOM (jsdom, shim `offers/banner`) | 4 boxes with correct badges: "Shivaa Black members" (no code) · "Every customer" + FREEDEL · "Premium card · for everyone" · "Keepsake · for members" |
| Rate ticker + 4 rate cells | render |
| Version stamps | 208 in index.html / sw.js / app.js / api.php (80× `?v=208`) |

## 4 · Deploy steps (when — and only when — the owner says yes)

1. Confirm live is < 208 (`api.php` → `rel`, or the bottom-of-source stamp).
2. `cms/` tree (from `shivaa-update-v208.zip`) → domain root, same
   drop-in shape as v205/v206/v207.
3. `purge` then `activate` (the v205 bind-shell ladder).
4. Hard-refresh / SW update: visitors pick up `shivaa-shell-v208`.
5. Smoke: home offers block shows **4** boxes; drawer minis readable;
   rate strip ticks; `#/black-card` flips on desktop AND iPhone; mobile case
   spins with a finger; `#/partners` heading block clean.

## 5 · Rollback

If anything is live newer than 208, stop — do not overwrite forward work.
Otherwise the previous good zip is `shivaa-update-v207.zip`
(sha256 `af75aa854e25e6ceeb06334b880d5700016a17e88984c280263353cfe0ed9b84`)
and the live baseline remains v205. Never renumber; fix forward as v209.

---

Built from `arena/09f3c79f-shivaa-ecom` on 2026-10-12.

**Package:** `shivaa-update-v208.zip` — 315 files, 24,958,352 bytes
(23.8 MB — the biggest update file yet: code + every product/banner/review
graphic for a true drop-in). sha256:
`cafb3f6e721373c40a348028519e90ed9abec2e949adb4eff0d1a565a51066d5`.
Media not repeated inside the zip (unchanged, already on the host, and
GitHub caps single files at 100 MB): `images/films/*` (85 MB), `images/designs/*`
(129 MB admin design uploads), `uploads/*` content. Upload & merge into the
root as with v205–v207.

Owner download link:
`https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/09f3c79f-shivaa-ecom/shivaa-update-v208.zip`
