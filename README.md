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
```

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
  owner-confirmed CIN, UDYAM and address. **GSTIN and certificate files remain
  empty.** Its business profile is not a government-verification result.
  Publication/live confirmation is tracked in the roadmap ledger.

See [`docs/FEATURE-ROADMAP.md`](docs/FEATURE-ROADMAP.md),
[`docs/FEATURE-01-HUID.md`](docs/FEATURE-01-HUID.md) and
[`docs/FEATURE-02-TRUST.md`](docs/FEATURE-02-TRUST.md). UI assets are now v40;
no catalogue, supplier, registration or certificate data was generated or seeded
by these features. Work stops after Feature 2 until the next original spec.

## Docs
`docs/DEPLOY-v37.md` (update + fresh-install steps) ·
`docs/REPAIR-SITE-v37.md` (site diagnosis + security audit) ·
`docs/PIPELINE.md` (stage reference) · `cms/docs/OTP-SETUP-GUIDE.md` (SMS).

## Rules
Never fabricate weight/purity/price (`work/designs.json` is OCR-verified ground
truth). Never commit API keys — the pipeline reads them from env vars. Generated
media lives in `demo65/media/` (never a folder named `out/`).

## New chat? Start here
Read [`docs/AGENT-HANDOFF.md`](docs/AGENT-HANDOFF.md) — architecture, automation, rules, first-message template.
