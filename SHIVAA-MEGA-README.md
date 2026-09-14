# SHIVAA — v108-MEGA (Cinematic Edition) · Deliverable Notes

## The zip
**`shivaa-mega-v45.zip` (built on the true-latest v107.4 codebase) — ≈297 MB · 948 files**

Extract it **directly inside `public_html`** — site files sit at the zip root
(no wrapper folder): `index.html`, `api.php`, `.htaccess`, `css/`, `js/`,
`images/`, `data/`, `media/`, `uploads/`… then open your domain. Done.

## What's new in v45-MEGA (on top of the full existing store)
Everything below is real working code in `cms/`, verified by an automated
browser-level smoke test against the extracted zip (18/18 checks green).

| Layer | Details |
|---|---|
| Page art | 10 AI page-hero banners (rates, buyback, savings, services, catalogues, b2b, about, contact, hallmark, trust/metal/track) + 7 original banners |
| Motion | Cinematic hero film (real banners, ken-burns), 4 craft films from real PGS photography (hover-to-play), gold marquee band, flash-sale countdown, scroll reveals, 3D card tilt, add-to-cart confetti, cursor sparkles, page transitions, count-up stats, live-dot pulse |
| 2030 features | **ShivAI concierge** (product-aware chat), **voice search** (mic in header + drawer), **Try-On Mirror** (`#/tryon`, camera overlay, drag/scale/rotate, snapshot, 100% on-device), **3D ring carousel**, **live market-pulse chart** (real rate history), **recently viewed + recommendations**, **gallery lightbox with wheel-zoom**, **light/noir/gold themes**, **PWA** (installable, offline core), cross-tab cart sync, back-to-top |
| Graphics pack | `media/ultra/` 17 banners @ 4K · `media/walls/` 65 PGS rings @ 2.5K · `media/walls2/` 291 real shots @ 2K — 373 bonus images |
| SEO/deploy | `sitemap.xml`, `robots.txt`, `manifest.json`, `sw.js`, `README-MEGA.txt` + `INSTALL.txt` inside the zip |

## Files & scripts (committed to branch `arena/01a09dc4-shivaa-ecom`)
- `cms/css/boost.css` — enhancement stylesheet
- `cms/js/boost.js` — 2030 engine (loaded after app.js, idempotent)
- `cms/js/boost-data.json` — film/lookbook/insta content manifest
- `tools/mega/make_films.py` — rebuild the films (ffmpeg)
- `tools/mega/make_ultra.py` — rebuild 4K/2.5K/2K graphics packs
- `tools/mega/make_zip.py` — rebuild the deploy zip in ~1 min
- `tools/mega/smoke/smoke.js` — automated regression (jsdom)

## Notes
- Product data is untouched: all 405 real products, 767 reviews, real PGS
  ring photography and 65 ring videos ship exactly as before.
- Camera try-on / voice search / service worker activate on `https://`
  (as with any site) — they degrade gracefully elsewhere.
- Zip > GitHub's 100 MB limit, so it's delivered as a workspace artifact +
  regenerable with `python3 tools/mega/make_zip.py`.

## v108 cinematic upgrade (this build)
* **Live video backgrounds everywhere**: home hero film · all 4 carousel
  posters are now films (text floats on the moving footage) · 14 page-hero
  banners play background films with headlines over them · bridal CTA panel
  plays its own film · 8 hover-to-play craft films.
* Films: hero, rings-studio, rings-worn, rings-editorial, bridal,
  gold-flow, heritage, bridal-lux, b2b-dark (rendered from real banners +
  real PGS photography).
* Codebase = v107.4 line (true-live rates, mobile-first Couture Touch,
  staff bundle, v107.js/aurum/motion/bot layers) merged into this branch,
  boost layer adapted on top (v46 assets).
