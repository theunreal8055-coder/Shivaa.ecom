# ₹0 FREE CATALOGUE PIPELINE — nightly, zero employees (from 18 Sep 2026)

**The loop:** you drop supplier PDFs into a folder on your own Hostinger hosting
(from your phone) → every night GitHub Actions pulls them in, cuts designs, makes
studio-clean photos + product films, writes honest template copy, and — if you
flipped `SHIVAA_AUTO_LIVE=YES` — pushes products LIVE on shivaa.in. Photos and
films travel straight to the site; **Git never holds the media**, so the repo
stays light forever. Cost of the whole pipeline: **₹0** (only GitHub's free
minutes + your existing hosting).

```
phone: upload rings-xxx.pdf to Hostinger freeops-inbox/
   ↓  (nightly, automatic)
Actions: fetch PDFs (FTPS, secrets already saved) → catalogue-inbox/
   1  ingest      PDF → one crop per design          (pymupdf, free)
   1b ocr tags    green supplier tags → weights      (tesseract, free)
   2b normalise   inventory + manual-weights.csv → designs.json
   3f free studio white-balance, background flatten, square hero   (numpy, free)
   4  films       Ken-Burns product video per design (ffmpeg, free)
   5f metadata    honest template title/desc/tags    (no AI, no invention)
   6  upload      photos + products → shivaa.in API  (only when enabled)
   ↓
report-free.md committed back + nightly report shows done/quarantined/failed
```

## One-time setup (5 min)

Nothing new is needed if the Hostinger Deploy secrets already exist
(`HOSTINGER_FTP_SERVER` / `HOSTINGER_FTP_USERNAME` / `HOSTINGER_FTP_PASSWORD`).
Optional extras:

| Secret | Meaning |
|---|---|
| `FTP_INBOX_DIR` | Server folder you drop PDFs into. Default `freeops-inbox` (create it once in hPanel → File Manager, next to `public_html`). |
| `SHIVAA_ADMIN_EMAIL` / `SHIVAA_ADMIN_PASSWORD` | Admin login for the upload stage. |
| `SHIVAA_AUTO_LIVE` | `YES` = nightly runs really publish. Anything else = dry-run only (report shows what WOULD go live). |

## Daily use (from your phone)

1. hPanel → File Manager → `freeops-inbox` → Upload `bangles-june.pdf`.
   **Name files with the category first** — `rings-…`, `bangles-…`, `chains-…`,
   `earrings-…` etc. (no category in the name → filed as rings).
2. Next morning check the report: `freeops/work/report-free.md` in the repo
   (also attached to each Actions run as an artifact).
3. Quarantined designs (missing weight/metal) never go live with guessed data.
   Fill `freeops/suppliers/manual-weights.csv` — one row per SKU:
   `sku,weightG,metal,purity,name` — and commit; the next night they flow.

## Honest limits (what ₹0 does and doesn't do)

- **Photos:** deterministic studio cleanup (white-balance, background flatten,
  square hero). NOT generative AI model shots — those need a paid API key
  (`pipeline/03_photoshoot.py` is ready whenever you are; ledgers make the
  upgrade per-design, nothing redone).
- **Weights:** never invented. Sources: tesseract OCR of green tags
  (automatic), `manual-weights.csv` (owner, wins over OCR), and the
  experimental LED reader (`--led-ocr` — hints only; a wrong weight misprices
  gold, so it is OFF by default and never auto-applied).
- **Throughput:** Actions free minutes are generous but not infinite; the
  nightly run is capped (~100 min) and fully resumable (ledgers), so big
  batches simply progress night after night.
- **Films:** 12 newest designs per night (config `free_tier.videos_per_run`).

## Running by hand

```bash
python3 pipeline/run_free.py --config pipeline/config.free.json            # process + report
python3 pipeline/run_free.py ... --dry-run                                 # plan the upload
python3 pipeline/run_free.py ... --upload --dry-run                        # needs admin email env
SHIVAA_ADMIN_PASSWORD=*** python3 pipeline/run_free.py ... --upload        # live
```

## Files

| Path | What |
|---|---|
| `.github/workflows/free-catalogue-nightly.yml` | the nightly automation |
| `pipeline/run_free.py` | orchestrator (stages 1 → 6f) |
| `pipeline/03_free_studio.py` | ₹0 studio hero generator |
| `pipeline/02b_free_normalize.py` | inventory + weights → designs.json |
| `pipeline/05_free_metadata.py` | honest template copy + quarantine gate |
| `pipeline/03b_led_weights.py` | EXPERIMENTAL scale-LED reader (off by default) |
| `pipeline/config.free.json` | free-tier config (paths, shot keys, caps) |
| `freeops/suppliers/manual-weights.csv` | owner-filled weights (wins over OCR) |
| `freeops/work/report-free.md` | latest nightly report |
