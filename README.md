# Shivaa — Jewellery CMS + AI Design Pipeline (v37)

**shivaa.in** — BIS-hallmarked gold & silver at live Jaipur rates.
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

## Docs
`docs/DEPLOY-v37.md` (update + fresh-install steps) ·
`docs/REPAIR-SITE-v37.md` (site diagnosis + security audit) ·
`docs/PIPELINE.md` (stage reference) · `cms/docs/OTP-SETUP-GUIDE.md` (SMS).

## Rules
Never fabricate weight/purity/price (`work/designs.json` is OCR-verified ground
truth). Never commit API keys — the pipeline reads them from env vars. Generated
media lives in `demo65/media/` (never a folder named `out/`).
