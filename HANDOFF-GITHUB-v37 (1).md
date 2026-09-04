# GITHUB CONNECTOR HANDOFF — v37 (paste this as your first message in the new chat)

---
**CONTEXT:** Shivaa Jewellers (shivaa.in) — v37 website + 65-ring AI automation.
The repo you have is the verified source of truth. Do not regenerate anything —
verify, then finish the job.

**REPO LAYOUT**
- `cms/` — website files (php -S 0.0.0.0:8090 inside cms/ for local test;
  demo DB 342 products, admin `admin@shivaa.in`), `uploads/` has 20 catalogue
  PDFs + 2 exemplar products (PGS5001, PGS5004: 4 photos + film).
- `pipeline/` — stages 01_ingest_pdf → 01b_ocr_tags → 02_normalize_data →
  03_photoshoot → 04_render_video → 05_metadata → 06_upload + lib_common + config.
- `demo65/` — the batch: `config.json` (out_dir=`media` — never `out/`),
  `raw/65rings.pdf`, `suppliers/`, `work/designs.json` (65 SKUs, 22K purity,
  REAL gram weights, sizes, tags, img paths — OCR-verified ground truth),
  `media/designs/*.jpg` (65 crops), `media/PGS5xxx/` (shots/video/meta),
  `status.py`.
- `qa/` qa_v36.py + smoke_media.py · `docs/` DEPLOY-v37.md · REPAIR-SITE-v37.md ·
  PIPELINE.md.

**STATE:** `cd demo65 && python3 status.py` → CROPS 65/65 ·
COMPLETE 7/65 (PGS5001–5007) · META 65/65. **58 designs remain** (232 shots).

**YOUR JOB (in order):**
1. Verify state with status.py; do NOT trust any file that a ledger says is
   done without the file existing on disk (size > 20 KB).
2. **Finish the 58 designs** the same way the previous session did:
   `generate_image` ×10 per message (reference = `demo65/media/designs/{SKU}.jpg`,
   4 prompt templates in demo65/config.json → shots: studio/worn/gift/editorial),
   then `python3 ../pipeline/04_render_video.py --only <complete>` (config renders
   720²/CRF27 ~0.7 MB, 10 s Ken-Burns), `python3 status.py`.
3. When 65/65: set demo65/config.json `upload.base_url=https://shivaa.in`,
   `dry_run=false`; login for a token (ask the user for the admin password —
   NOT in the repo; advise rotating it after); `python3 ../pipeline/06_upload.py --all`.
4. Verify live: `/api/products?q=PGS` → 65 products, each 4 images + video +
   computed price; spot-check 3 PDPs (film = first gallery slide, FILM badge) +
   1 homepage render — **screenshots required**.
5. If a product 4xx/5xx → `--only SKU` rerun (idempotent upsert).

**RULES:** never fabricate weight/purity/price · never hand-edit
`cms/data/db.json` (API only) · bump `?v=` in cms/index.html (7 refs) whenever
you touch js/css · `curl -F` to `php -S` fails >1 KB (use Python http.client,
see qa/smoke_media.py) · PyMuPDF not thread-safe (≤3 workers) · clear
`work/ledger_*.csv` when regenerating media · no `out/` dirs · large uploads via
06_upload only.

**OUT OF SCOPE this round:** new suppliers, SMS gateway go-live, scale beyond 65
(ask first). If asked for scale: reuse the pipeline per supplier PDF, never skip
OCR verification + contiguous-SKU check.

**FIRST MESSAGE TO ME:** "Repo connected. Run status.py, confirm state, finish the
65-design batch (10 shots per message), upload to shivaa.in and verify live.
Admin password: ____."
---
