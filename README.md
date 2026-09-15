# Shivaa — Jewellery CMS + AI Design Pipeline (v37)

**shivaa.in** — gold & silver jewellery CMS with Jaipur-rate pricing.
This repository packages the website (v37) and the end-to-end automation that
photographs, describes, prices and uploads jewellery designs.

## What's here
```
cms/        the website (PHP 8 + vanilla JS SPA). Deploy to public_html.
            api.php = all /api/* routes   ·   data/db.json = demo DB
            uploads/ = catalogue PDFs + exemplar product media
pipeline/   7-stage automation: PDF → OCR tags → normalize → AI photoshoot
            → video → metadata → upload to the live site
demo65/     the 65-ring batch (razor-thin demo of the pipeline, real data):
            raw/65rings.pdf, suppliers/, work/designs.json (verified codes+weights),
            media/designs/*.jpg (65 crops), media/PGS5xxx/ (4 AI shots + film +
            meta.json per design), status.py
qa/         qa_v36.py (API regression) · smoke_media.py (upload smoke test)
            preview_shim.py (PHP-shaped API for headless tests) ·
            browser/ (jsdom suites: t7 route+button audit, t8 v106 features,
            t9 mobile viewport)
```

## Fresh install (new host, no history)

`shivaa-FRESH-INSTALL-v115.zip` + `shivaa-FRESH-MEDIA-v115.zip` — the whole store (all of
v1 → v115, audited) on an empty host, seeded by `install.php`. Everything about it, incl.
what is deliberately *not* seeded, is in [`FRESH-INSTALL-v115.md`](FRESH-INSTALL-v115.md).

## Quick start
```bash
# local demo of the site
cd cms && php -S 0.0.0.0:8090        # v37 UI, clean demo DB (admin@shivaa.in)

# batch status
cd demo65 && python3 status.py       # crops/shots/videos/meta counts

# upload a finished batch to production
cd demo65 && python3 ../pipeline/06_upload.py --all --dry-run   # review first
python3 ../pipeline/06_upload.py --all                          # then live
```

## Feature roadmap

- **Feature 13 — Compare + Shareable Shortlist:** preserved and regression-tested.
- **Feature 1 — HUID workflow:** released through PR #5; public live deployment
  confirmed. **Automatic BIS verification is not connected**. The guide at
  `#/hallmark` hands off to official BIS Care; recorded references stay unverified.
- **Feature 2 — Why Trust Shivaa:** implemented at `#/trust`, using the existing
  owner-confirmed CIN, UDYAM and address — plus, since **v105**, the GSTIN the
  owner supplied. **Certificate files remain empty.** Its business profile is not a government-verification result.
  Released through PR #6; the live profile and v40 JS/CSS assets are confirmed.

See [`docs/FEATURE-ROADMAP.md`](docs/FEATURE-ROADMAP.md),
[`docs/FEATURE-01-HUID.md`](docs/FEATURE-01-HUID.md) and
[`docs/FEATURE-02-TRUST.md`](docs/FEATURE-02-TRUST.md). UI assets are now v40;
no catalogue, supplier, registration or certificate data was generated or seeded
by these features. Work stops after Feature 2 until the next original spec.

## UI releases

- **v105** — the 12-item UI/UX pass (search redesign, Quick View, hero slider,
  advanced filters, OTP paste/auto-verify, footer motion, Why Trust Shivaa +
  GSTIN, B2B tilt cards, calculator fix, ring-size scale, rates-tab glow,
  auto-verify badge). Deploy notes: [`DEPLOY-v105.md`](DEPLOY-v105.md).
- **v106** — the operability pass: every v105 defect fixed (Quick View
  scroll/click, filter bottom sheet + drag-to-dismiss, footer/header rate parity
  with a stated basis, tap-reactive glow), plus 4-digit OTP everywhere with
  auto-send/auto-verify, fly-to-cart and a mini-cart sheet with a Checkout
  button, `#/size-guide` as a page, the partner portal opening on the Bullion
  Desk, B2B purchasing in every category, manufacturer photo sliders with a
  full detail sheet, a 20-minute checkout rate lock (validated server-side),
  and a repo-wide route/button audit. Deploy notes:
  [`DEPLOY-v106.md`](DEPLOY-v106.md); package: `shivaa-update-v106.zip`
  (public_html-relative, excludes `data/` + `uploads/` + `images/`).

Headless coverage for v106 (jsdom against `qa/preview_shim.py`, no browser):
`t7-audit` **PASS 4/4** (46 routes, 151 buttons, 0 uncaught errors) ·
`t8-v106` **PASS 78/78** (13 feature groups) ·
`t9-mobile` **PASS 49/49** (390×780 touch viewport).

```bash
cd qa && python3 preview_shim.py &                 # :8090
cd browser && npm i jsdom && node t7-audit.mjs && node t8-v106.mjs && node t9-mobile.mjs
```

## Docs
`docs/DEPLOY-v37.md` (update + fresh-install steps) ·
`docs/REPAIR-SITE-v37.md` (site diagnosis + security audit) ·
`docs/PIPELINE.md` (stage reference) · `cms/docs/OTP-SETUP-GUIDE.md` (SMS).

## Rules
Never fabricate weight/purity/price (`work/designs.json` is OCR-verified ground
truth). Never commit API keys — the pipeline reads them from env vars. Generated
media lives in `demo65/media/` (never a folder named `out/`).

## New chat? Start here
Read [`ARENA-STATE.md`](ARENA-STATE.md) first (the continuity contract — current
version on `main`, forward-only rules), then [`HANDOFF.md`](HANDOFF.md) (the work
log), then [`docs/AGENT-HANDOFF.md`](docs/AGENT-HANDOFF.md) (architecture,
automation, rules, first-message template). Current: **v109-consolidated on `main`**.
