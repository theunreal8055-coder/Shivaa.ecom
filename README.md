# Shivaa.ecom

**Shivaa Jewellers (shivaa.in)** — production e-commerce website (v37) + 65-ring AI design pipeline.

This repo is the **source of truth**. Site code lives in `cms/`, the 7-stage
automation in `pipeline/`, QA in `qa/`, and the batch in `demo65/`.

> The vendor handoff docs run from the previous session: see `docs/HANDOFF-*.md`
> if present, plus `docs/DEPLOY-v37.md`, `docs/REPAIR-SITE-v37.md`, `docs/PIPELINE.md`.

## What's here
- `cms/` — PHP 8 + vanilla-JS SPA. `api.php` = all `/api/*` routes · `data/db.json` = demo DB (342 products) · `uploads/` = 20 catalogue PDFs + exemplar product media. Serve with `php -S 0.0.0.0:8090` inside `cms/`.
- `pipeline/` — 7-stage automation: `01_ingest_pdf → 01b_ocr_tags → 02_normalize_data → 03_photoshoot → 04_render_video → 05_metadata → 06_upload`.
- `demo65/` — the 65-ring batch (`status.py`, `raw/65rings.pdf`, `work/designs.json` ground truth, `media/`). **State: see below.**
- `qa/` — `qa_v36.py` · `smoke_media.py`.
- `deploy/` — `shivaa-update-v37.zip` (4-file live fix: `index.html`, `api.php`, `css/styles.css`, `js/app.js`).
- `docs/` — deploy/repair/pipeline docs + project analysis.

## ⚠ CURRENT STATE — 2026-09-04
The extraction of `shivaa-FULL-fresh-install-v37.zip` (recovered from the `.rar`)
contains **`cms/`, `pipeline/`, `qa/`, `docs/`**, but **the `demo65/` batch folder is
MISSING** from that archive — so `status.py`, `raw/65rings.pdf`,
`work/designs.json` (the 65-SKU ground truth), and `demo65/media/` are **not** in the
repo yet.

The live site is on **v35**; the v36/v37 code is verified fine — extracting
`deploy/shivaa-update-v37.zip` fixes it (never touches `data/` or `uploads/`).

See **[docs/PROJECT-ANALYSIS.md](docs/PROJECT-ANALYSIS.md)** for the full continuation plan.
