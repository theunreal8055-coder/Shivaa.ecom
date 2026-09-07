# DEPLOY v43 — RINGS BATCH 1 (9 rings: PGS5008–5013, PGS5019–5021)

Makes these 9 men's rings live with their full photoshoots (4 shots + film each)
on shivaa.in. Pick ONE of the two paths below.

**Sandbox/agent note:** the Arena sandbox cannot reach shivaa.in (egress-blocked),
so the final step runs on your side — 2 minutes either way.

---

## PATH A — hPanel zip (the v42-style deploy) · ~2 minutes

Zip: **`shivaa-update-v43-rings-batch1.zip`** (14.7 MB, 46 files — 45 ring media
files + `cms/data/db.json`).

1. Download `shivaa-update-v43-rings-batch1.zip` from the repo (branch
   `arena/01a07bb3-shivaa-ecom`).
2. hPanel → Files → File Manager → `public_html` → upload the zip → right-click
   → **Extract** (it only adds/overwrites the 46 files; it does NOT delete
   anything else).
3. Hard-refresh the site. Spot-check:
   - PDP `PGS5008` (Mehndi), `PGS5011` (Sheesh Mahal), `PGS5021` (Manik) →
     each shows **4 photos** and the **film** in the gallery.
   - Category Rings shows the new studio shots for these 9.

⚠️ **db.json warning:** the zip contains `cms/data/db.json` as of 7 Sep 2026
(405 products). If orders / admin edits were made on the live site AFTER the
v42 upload, they live only in the server's db.json — tell the agent to merge
first, or use PATH B (which never touches db.json).

---

## PATH B — API upload (safest for live orders; never touches db.json)

From any machine with internet (laptop / Hostinger SSH terminal):

```bash
git clone -b arena/01a07bb3-shivaa-ecom https://github.com/theunreal8055-coder/Shivaa.ecom.git
cd Shivaa.ecom
# preview (no writes):
python3 pipeline/06_upload.py --config demo65/config.json --only PGS5008,PGS5009,PGS5010,PGS5011,PGS5012,PGS5013,PGS5019,PGS5020,PGS5021
# live (password asked at runtime, never stored):
python3 pipeline/06_upload.py --config demo65/config.json --live \
        --email admin@shivaa.in --password '***' \
        --only PGS5008,PGS5009,PGS5010,PGS5011,PGS5012,PGS5013,PGS5019,PGS5020,PGS5021
```

Media for exactly these 9 SKUs is pre-staged in `demo65/media/{SKU}/`
(shot_studio/editorial/worn/gift.jpg + video.mp4 + meta.json). The uploader
upserts by SKU (no duplicates) and is resumable.
Verify: `https://shivaa.in/api/products?q=PGS50` → each of the 9 has 4 image
URLs + a video URL. Then **rotate the admin password** (it was typed in a terminal).

If the auto-sync cron (`deploy/auto_sync.php`) is installed on the server, make
sure its saved **branch** is `arena/01a07bb3-shivaa-ecom` — the older docs
mention `arena/01a07082-shivaa-ecom`, which does NOT contain this work.

---

## What's in the batch
| SKU | Name | Shots | Film |
|-----|------|-------|------|
| PGS5008 | Mehndi | studio/editorial/worn/gift | 10s 720×720 |
| PGS5009 | Jharokha | ✓ | ✓ |
| PGS5010 | Marudhara | ✓ | ✓ |
| PGS5011 | Sheesh Mahal | ✓ | ✓ |
| PGS5012 | Hawa Mahal | ✓ | ✓ |
| PGS5013 | City Palace | ✓ | ✓ |
| PGS5019 | Heera | ✓ | ✓ |
| PGS5020 | Panna | ✓ | ✓ |
| PGS5021 | Manik | ✓ | ✓ |

Remaining 17 rings (PGS5028 5030 5031 5034 5037 5038 5039 5040 5041 5042 5048
5052 5053 5054 5055 5056 5059) are still photoshoot-pending — batch 2 zip will
follow; `tools/photoshoot/SESSION-STATE.md` tracks progress.
