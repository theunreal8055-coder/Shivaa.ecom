# UPLOAD RUNBOOK — push the 65-ring batch to shivaa.in

The Arena sandbox **cannot reach shivaa.in** (egress-blocked), so stage 6 runs
on ANY machine that can (your laptop, or a Hostinger SSH terminal).
Everything needed is in this repo — no pip installs required (stdlib only).

## What gets uploaded, and WHERE
- Every design with a COMPLETE media set (4 shots + film): currently 19/65,
  growing as the batch progresses. Re-run the command any time — it resumes.
- **Category: `rings`** (the site's Rings category) **＋ tag `mens`** → the
  products appear in the site's existing **Men's section** (app.js `TAGS.mens`
  filter chip) as well as under Rings. No new category was invented — the
  storefront already ships a Men's tag filter.
- Per product: 4 AI photos (studio / worn-on-a-man's-hand / gift / editorial)
  + 10 s watermarked film + full spec record (weight/purity/MC from the
  OCR-verified supplier tags — never invented) + SEO meta.
- Existing SKUs are **updated in place** (upsert by SKU): the two live
  exemplars PGS5001/PGS5004 get their new men's shots + `mens` tag, no
  duplicates.

## Steps
```bash
# 1 · get the code (branch with the batch)
git clone -b arena/01a07082-shivaa-ecom https://github.com/theunreal8055-coder/Shivaa.ecom.git
cd Shivaa.ecom/demo65

# 2 · preview first (no writes; prints what would happen + payloads in work/payloads/)
python3 ../pipeline/06_upload.py --config config.json --dry-run

# 3 · LIVE upload (admin login at runtime; password never stored anywhere)
python3 ../pipeline/06_upload.py --config config.json \
        --email admin@shivaa.in --password '***' --live
```
Resumable forever (ledger in `demo65/work/ledger_upload.csv`); 0.6 s pause
between products; failed SKUs retry with `--only PGS50xx`.

## Verify after upload (must ALL pass)
- `https://shivaa.in/api/products?q=PGS` → one entry per uploaded SKU, each
  with 4 image URLs + video URL + computed price.
- Homepage → **Men's** chip shows the rings; spot-check 3 PDPs (film = first
  gallery slide).
- Then **rotate the admin password** (it was typed on a machine).

## ⚠️ hPanel ↔ GitHub warning
If hPanel "Git deployment" points `public_html` at this repo: **don't** — the
deployable site lives in `cms/`, and a root deploy would clobber the live
`data/db.json` (orders, users, prices) and `uploads/`. Either disable that
deployment or point it at a repo/path that only mirrors `cms/` static files.
Product/media uploads must go through the API command above, never via git.

## Option C — TABLET / PHONE (no terminal): the upload bridge
`deploy/upload_bridge.php` = a one-file, browser-only uploader that runs ON the
Hostinger server (server → same-server API calls).
1. File Manager: upload repo ZIP to home dir, Extract.
2. File Manager: in `public_html/` create a secret folder (e.g. `pub-k9x2m`),
   copy `deploy/upload_bridge.php` from the extracted repo into it.
3. Browser: `https://shivaa.in/pub-k9x2m/upload_bridge.php` → enter admin
   password → tap "Upload next 4 designs" until none remain (resumable).
4. Tap **SELF-DESTRUCT**, delete the folder in File Manager, rotate password.
Security: secret folder name + admin password + session-only token; script
talks only to its own site; ledger keeps it resumable/idempotent (upserts).
