# PIPELINE — AI design-to-product automation (reference)

```
raw/65rings.pdf ─► 01_ingest_pdf ─► 01b_ocr_tags (green tags → code + weight)
                        │
                        ▼
              work/designs.json  (65 designs: SKU, purity 22K, REAL grams,
                                  making %, sizes, tags, img path)
                        │
      ┌─────────────────┼──────────────────────┐
      ▼                 ▼                      ▼
02_normalize_data  03_photoshoot (4 shots)   04_render_video — RETIRED (v42)
      │                 │
      └─────────────────┴──────────────────────┐
                                   ▼
                    05_metadata (title/desc/tags/SEO per design)
                                   ▼
                    06_upload ──► POST /api/media (4 photos, images only)
                                  POST /api/products (upsert by SKU)
```

## Stage usage
```bash
python3 01_ingest_pdf.py            # 1st run only (or after new PDFs)
python3 01b_ocr_tags.py --all       # OCR tag codes+weights → suppliers/*.csv
python3 tight_crop.py               # tag-free design crops → media/designs/
python3 02_normalize_data.py        # merge OCR × supplier sheets → designs.json
python3 03_photoshoot.py --limit N  # AI shots (needs REPLICATE_API_TOKEN / OPENAI_API_KEY)
# 04_render_video.py — retired in v42: a design ships as exactly 4 images
python3 05_metadata.py --limit N    # per-design meta.json
python3 06_upload.py --all --dry-run  # review, then --all for live
```
`--only PGS5010` reruns one SKU; every stage is idempotent and keeps a
`work/ledger_*.csv` so nothing is repeated.

## Config (`demo65/config.json`)
- `paths.out_dir` = **`media`** — never name a media folder `out/`.
- `upload.base_url` → set to `https://shivaa.in` before `--live`.
- `upload.dry_run: true` by default (set `false` only after you see the payloads).
- `photoshoot.api_key_env` → `REPLICATE_API_TOKEN` or OpenAl-compatible key in a
  **env var**. Never in the repo.

## Scale-out
The same stages run for any supplier PDF (200+ suppliers, 3 lakh designs):
chunk by PDF, `--limit` per run, restart-safe ledgers, upsert-by-SKU uploads.
Watch: PyMuPDF is not thread-safe (per-thread `fitz.open()`, ≤3 workers);
OCR only ~44/65 designs complete → always run the visual-verification pass
and the contiguous-SKU check before uploading.
