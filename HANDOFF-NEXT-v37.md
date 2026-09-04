# NEXT-CHAT HANDOFF — v37 (paste this as your first message)

---
**CONTEXT:** Continuing the Shivaa Jewellers automation (shivaa.in). Everything
below is verified state from the previous session. Trust the workspace; verify
with the scripts; never re-do work the ledgers say is done.

**THE 3 DELIVERABLE ZIPS (in `deploy/`):**
- `shivaa-update-v37.zip` (645 KB, md5 `c9fce3ef6b097427f894679d39b3adb1`) — 4 files:
  index.html (`?v=37` ×7), api.php (POST /api/media), css/styles.css, js/app.js.
  Deployed to Hostinger public_html. **Never touches data/uploads.**
- `shivaa-FULL-fresh-install-v37.zip` — cms/ (site v37, clean demo DB 342 products,
  20 catalogue PDFs, 2 exemplar products with photos+film), pipeline/, demo65/
  (scripts, 65 crops, exemplars, 65 meta.json), qa/, docs/.
- `shivaa-batch65-media.zip` — **status: COMING** — built once at batch completion
  (all 65 × 4 shots + 65 films + meta). Until then, batch media lives in
  `demo65/media/`.

**SITE STATUS (just audited):** live shivaa.in is on **v35** — the earlier v36
deploy did NOT stick (its files are not on disk; `/api/media` 404s; catalogs empty).
The v36/v37 code itself is provably fine (Chrome-verified on live + local:
hero, 4 posters, bestsellers, PDP film gallery — 0 console errors). Fix deployed =
extract `shivaa-update-v37.zip`. Full audit in `docs/REPAIR-SITE-v37.md`.

**BATCH STATUS:** `cd demo65 && python3 status.py`
→ CROPS 65/65 · SHOTS 28/260 · COMPLETE 7/65 (PGS5001-5007) · VIDEOS 7/65 ·
META 65/65. Remaining: **58 designs (232 shots)** at 10 shots/message ≈ 24 "continue"s.

**ENV:** pip: pymupdf pytesseract opencv-python-headless openpyxl pillow numpy requests
· apt: ffmpeg php-cli php-curl tesseract-ocr · php -S 0.0.0.0:4011 -t site-v2 site-v2/router-dev.php
(wiped between sessions: pip packages, ffmpeg, php, running servers; **files persist**;
note `out/`-named folders do NOT persist — media lives in `demo65/media/`).

**WORKFLOW FOR THE REMAINING 58 DESIGNS** (each "continue" → 10 shots):
1. `generate_image` ×10 with reference `demo65/media/designs/{SKU}.jpg` (4 prompts:
   studio / worn / gift / editorial — see `demo65/config.json` "shots" for the
   exact prompts or copy from the last batch).
2. `python3 ../shivaa-ai-pipeline/pipeline/04_render_video.py --only <newly complete>`.
3. `python3 status.py` → report counts.

**THEN (final steps, after user confirms):**
1. `demo65/config.json` → `upload.base_url: "https://shivaa.in"`, `dry_run: false`.
2. Login token: `curl -X POST https://shivaa.in/api/auth/login -d '{"email":"admin@shivaa.in","password":"<USER PROVIDES>"}'`
   Password is NOT in the repo/workspace — ask; advise rotating it after.
3. `python3 ../pipeline/06_upload.py --all` (upsert-by-SKU, 0.6 s pause).
4. Verify live (never declare done otherwise): `/api/products?q=PGS` → all 65,
   each 4 images + video + computed price; spot-check 3 PDPs (film first slide)
   → **screenshots**; homepage still fine.
5. Build `shivaa-batch65-media.zip` + refresh FULL zip to 100% (media included),
   then prune heavy workspace trees (site-v2, demo65) to stay under the 128 MB
   snapshot cap — zips remain in `deploy/`.

**RULES:** no fabricated weight/purity/price (designs.json = ground truth) ·
never edit `cms/data/db.json` by hand · bump `?v=` whenever JS/CSS changes ·
clear stale `work/ledger_*.csv` after regenerating media · `curl -F` >1 KB to
php -S can http=000 (use Python http.client) · PyMuPDF not thread-safe (≤3 workers) ·
screenshots before declaring UI done · never name media dirs `out/`.

**HELPERS:** status.py (counts + next batch) · qa/qa_v36.py · qa/smoke_media.py.

**FIRST MESSAGE TO ME:** "Run `demo65/status.py`, confirm the batch state, then
continue the remaining designs at 10 shots per message. Admin password for
shivaa.in: ____ (or I'll give it when we upload)."
---
