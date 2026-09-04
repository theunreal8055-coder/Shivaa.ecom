# Shivaa.ecom

**Shivaa Jewellers (shivaa.in)** — production e-commerce site + 65-ring AI automation pipeline (v37).

Live site: `shivaa.in` · Repo = source of truth.

## What's in the Drive (analysis)
The project was originally delivered in a Google Drive folder `Shivaa.v37` (deploy
docs + `shivaa-FULL-fresh-install-v37.zip` + `shivaa-update-v37.zip`). Full breakdown
and continuation plan: **[docs/PROJECT-ANALYSIS.md](docs/PROJECT-ANALYSIS.md)**.

## Repo layout (as documented)
```
cms/       website (php -S 0.0.0.0:8090 inside cms/) · demo DB 342 products · uploads/: 20 PDFs + exemplars
pipeline/  ingest_pdf → ocr_tags → normalize → photoshoot → render_video → metadata → upload
demo65/    the 65-ring batch: config.json · raw/65rings.pdf · work/designs.json (ground truth) · media/ · status.py
qa/        qa_v36.py · smoke_media.py
docs/      DEPLOY-v37.md · REPAIR-SITE-v37.md · PIPELINE.md
deploy/    deliverable zips
```

## Current state
CROPS **65/65** · COMPLETE **7/65** (PGS5001–5007) · SHOTS **28/260** ·
VIDEOS **7/65** · META **65/65**. **58 designs remain (232 shots).**

Live shivaa.in is on **v35**; the v36/v37 code is verified fine — extract
`shivaa-update-v37.zip` to fix (the 4-file update never touches `data/`/`uploads/`).

## ⚠ To continue here
The repo is a fresh checkout. The CMS / pipeline / 65-ring dataset live in the Drive
zips, which this sandbox currently can't download (Google Drive is blocked by the
egress proxy; GitHub works). **Upload the repo contents of
`shivaa-FULL-fresh-install-v37.zip` into this repo**, then I'll pull, run `status.py`,
and finish the remaining 58 designs → upload → verify live.

See **[docs/PROJECT-ANALYSIS.md](docs/PROJECT-ANALYSIS.md)** for the full plan and
rules (never fabricate weight/purity/price; never hand-edit `db.json`; etc.).
