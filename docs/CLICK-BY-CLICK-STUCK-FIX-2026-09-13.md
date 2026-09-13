# CLICK-BY-CLICK — Unstick & Reset Shivaa Rings (13 Sep 2026)
**You are here:** project shows “stuck”, `VIDEOS 0/65`, or `ring-reset.yml missing`, or `SSL_ERROR_SYSCALL`. This is the complete tap-by-tap fix. **No terminal needed — works on phone/tablet.** Pick **Path A** (GitHub Actions — 5 min, recommended) OR **Path B** (Hostinger bridge — also no laptop).

> Your fix is already committed on branch `arena/01a09a29-shivaa-ecom` (commit `40cc203`) and pushed. You just need to merge it and tap Run. If you are reading this on GitHub, you are on the right repo: `theunreal8055-coder/Shivaa.ecom`.

---

## QUICK MAP — What you will click

1. **MERGE** the fix → 2. **SET SECRET** (once) → 3. **RUN** Ring Reset → 4. **VERIFY** on shivaa.in

Total taps: ~25. Time: ~7 minutes. Risk: zero — script touches ONLY `rings`, ledger makes re-run safe, other categories (necklaces etc.) never touched.

---

## PART 0 — Before you start (30 sec)

**Have ready:**
- GitHub login that can access `theunreal8055-coder/Shivaa.ecom`
- `admin@shivaa.in` password (the one you use to login at `https://shivaa.in` as admin). You will paste it once as a GitHub Secret — it never appears in code.

**On your screen right now:** If you see `This branch is 1 commit behind main` or `ring-reset.yml D` or `VIDEOS 0/65` — that is the bug I fixed. Don’t delete anything manually.

---

## PART 1 — Merge the fix into `main` (8 clicks)

This brings the strict workflow + the 37 `mediaNote` + 39 stock fixes into `main` so Actions can use them.

1. Open **https://github.com/theunreal8055-coder/Shivaa.ecom**
2. Tap **Pull requests** (top bar, between Code and Actions)
3. You will see no PR for `arena/01a09a29-shivaa-ecom` yet → Tap **New pull request** (green button, top right)
4. Base: `main` ← Compare: `arena/01a09a29-shivaa-ecom` → Tap **Create pull request**
   - If GitHub says “There isn’t anything to compare” → change Compare to `arena/01a09a29-shivaa-ecom` from the dropdown. You should see: `40cc203 fix: unstick project…` with 45 files changed.
5. Title is already filled → Tap **Create pull request** (green, bottom)
6. Wait for checks (no QA gate on `main` — will be instant). Tap **Merge pull request** → **Confirm merge**
7. Tap **Delete branch** (optional — keeps list clean). If it asks `Delete arena/01a09a29...` → Tap **Delete**
8. Tap **Code** → ensure branch dropdown (top left, says `main`) is on `main` → you should see file `.github/workflows/ring-reset.yml` now exists. Tap it to confirm — first line says `name: Ring Reset`.

**If you see `fatal error in commit_refs` while pushing:** just tap **Refresh** and push again — it succeeds on retry (large 99 MB zip). Your `40cc203` is already on GitHub, so you can skip `git push` and just create the PR as above.

---

## PART 2 — Set the admin password as a GitHub Secret (ONE TIME, 7 clicks)

Without this, the workflow fails with `::error::Repository secret SHIVAA_ADMIN_PASSWORD is not set.`

1. On the repo page `theunreal8055-coder/Shivaa.ecom`, tap **Settings** (top bar, near right, gear icon)
   - On phone: tap the 3-lines ☰ → **Settings**
2. In the left menu, scroll down → Tap **Secrets and variables** → **Actions**
3. Tap **New repository secret** (green, top right)
4. Name field: type exactly `SHIVAA_ADMIN_PASSWORD` (all caps, underscore)
5. Secret field: paste your **`admin@shivaa.in` password** (the real one you use on shivaa.in)
   - No quotes, no spaces before/after.
6. Tap **Add secret** (green)
7. Verify: you see `SHIVAA_ADMIN_PASSWORD — Updated just now` in the list. You cannot view it again — that’s normal. To change it later, tap the pencil ✏️ → paste new password → Update.

**Where is my password?** If you don’t remember it, open `https://shivaa.in` → Login → try. If wrong, do **not** reset via code yet — ask the agent to generate a fresh `cms/admin-reset.php` flow. For now you need the current live password.

---

## PART 3 — PATH A — Run Ring Reset from GitHub Actions (RECOMMENDED, 9 clicks)

This deletes the old 85 rings on live and uploads the 65 PGS rings (4 images each, creamy-white face first, **no video**). Server does the work — your phone just taps Run.

1. Tap **Actions** (top bar, between Pull requests and Projects)
2. In the left list, tap **Ring Reset** (has icon ⟳). If you don’t see it, refresh — it appears only after Part 1 merge.
3. On the right, tap **Run workflow** ▼ (grey dropdown, top right above the runs list)
4. A small box opens:
   - **Use workflow from:** Branch: `main` → leave as `main`
   - **live** — type exactly `YES` (caps, 3 letters). Anything else = dry-run only, will NOT delete.
     - If you type `NO` or leave blank → it just lists what it *would* delete. Safe to test first with `NO`.
   - **email** — leave `admin@shivaa.in` (don’t change unless your admin email is different)
5. Tap **Run workflow** (green inside the box)
6. Wait 10 seconds → a new row appears at top: `Ring Reset — main — workflow_dispatch` with yellow ● (in progress). Tap that row.
7. You see 3 steps. Wait 45–90 seconds:
   - `Preflight staged 65-ring payload` → should say `preflight OK: 65 PGS designs, 4 JPG shots each…` in green
   - `Run ring reset` → shows `logged in as …` → `live: 85 products, 85 rings` → `deleted p_… PGS500…` (85 lines) → `uploaded PGS5001` … `PGS5065` (65 lines) → if you typed `NO`, it stops after `DRY-RUN — would delete…` and that’s expected.
   - `Independently verify live ring count` → **only runs when you typed YES** → should end with `VERIFY OK: live site has exactly 65 PGS rings and 0 ring videos ✅` in green.
8. **If you see red ❌:**
   - `Repository secret SHIVAA_ADMIN_PASSWORD is not set.` → go back to Part 2, add secret, then Run again.
   - `login failed (401)` → password in secret is wrong → Settings → Secrets → edit → paste correct password → Run again (ledger resumes, won’t duplicate).
   - `expected 65 PGS media folders, found …` → you didn’t merge Part 1 → merge first.
   - `MISMATCH` → tap **Re-run jobs** → **Re-run all jobs** (ledger makes it resume where it stopped — never creates duplicates).
9. Success looks like: all 3 steps green ✔, bottom line `VERIFY OK` in green. You’re done — go to Part 4 Verify.

**Dry-run first?** Type `NO` and Run — you’ll see the 85 IDs it *would* delete + `DRY-RUN — would then upload 65 PGS...` with no changes. Then Run again with `YES` for real.

---

## PART 3 — PATH B — Tablet/Phone via Hostinger Bridge (ALTERNATE, no GitHub Secret needed)

Use this if you don’t want to use GitHub Secrets, or Actions is blocked. You upload ONE file via Hostinger File Manager.

### B-Step 1 — Create secret folder (5 clicks)

1. Open **https://hpanel.hostinger.com** → Login
2. Tap **Websites** → Tap **Manage** next to `shivaa.in`
3. Tap **File Manager** → **Access Files**
4. You see `public_html` → Tap to open it
5. Tap **New Folder** (top toolbar, folder+ icon) → Name: `rst-x7k2q` (pick any random 6–8 letters, don’t use `reset` or `admin`) → Tap **Create**

### B-Step 2 — Upload the bridge file (4 clicks)

1. On your computer/phone, download **ONE** file from GitHub: `https://raw.githubusercontent.com/theunreal8055-coder/Shivaa.ecom/main/deploy/ring_reset_bridge.php` 
   - Fastest: on the repo page → Tap **Code** → **Download ZIP** → unzip → find `deploy/ring_reset_bridge.php` (12 KB)
   - Or: open that raw link → Long-press → Save.
2. Back in File Manager, open your new folder `rst-x7k2q` (you’re inside `public_html/rst-x7k2q`)
3. Tap **Upload Files** (top, cloud+arrow) → Select `ring_reset_bridge.php` → Wait for 100% ✔
4. Confirm: you see `ring_reset_bridge.php` inside `rst-x7k2q`

### B-Step 3 — Run the 3 buttons (6 clicks)

1. Open new browser tab → type `https://shivaa.in/rst-x7k2q/ring_reset_bridge.php` → Enter
2. You see **SHIVAA RING RESET BRIDGE** → Field **Admin email**: leave `admin@shivaa.in`
3. Field **Password**: type your live admin password → Tap **Login**
   - If `❌ Login failed (401)` → password wrong → retype.
4. After login, you see 3 sections:
   - **Step 1 — Delete** → Tap **Delete all rings (85 → 0)** → Wait for `✅ Deleted 85` (if you tap again, it says `already deleted` — safe)
   - **Step 2 — Upload** → Tap **Upload next 4 rings** → Wait for `Uploaded PGS5001…PGS5004` → **Tap again** → `PGS5005…` → Repeat **~17 taps** until it says `✅ All 65 uploaded`. Each tap uploads 4 rings. **Do not close the tab between taps** — ledger saves progress; if you close, just reopen the link and Login → tap again, it resumes.
   - **Step 3 — Verify** → Tap **Verify live count** → Should show `65 rings live (expected 65), 0 ring videos — OK ✅`
5. If it shows `MISMATCH` → tap **Upload next 4 rings** 1–2 more times, then Verify again.

### B-Step 4 — Clean up (4 clicks, IMPORTANT)

1. Still on that page → Tap **SELF-DESTRUCT** (red button, bottom) → confirms `bridge file deleted` in green
2. Go back to File Manager → `public_html` → Long-press `rst-x7k2q` → **Delete** → Confirm
3. **Rotate password** (so the one you typed in the browser is not left in history): `https://shivaa.in` → Login as admin → Profile → Change password → new 12+ chars → Save → **Go back to GitHub → Settings → Secrets → edit `SHIVAA_ADMIN_PASSWORD` → paste new password** if you also use Path A later.
4. Close the bridge tab.

---

## PART 4 — Verify on shivaa.in (5 clicks)

1. Open **https://shivaa.in** → Hard refresh:
   - On phone: pull down to refresh, or close tab and reopen
   - On laptop: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)
   - If Hostinger **LiteSpeed Cache** is on: hPanel → **LiteSpeed Cache** → **Purge All** → then refresh again
2. Tap **Rings** category (top menu or homepage → Shop by Category → Rings)
3. At bottom count: you should see **65 products** (not 85). Scroll → every ring tile’s first image is **creamy-white background** (not dark charcoal). Tap 3 random rings:
   - Each product page → gallery has **4 images** (studio white face first, then editorial, worn, gift) → swipe/dots = 4
   - **No FILM badge, no video slide** — correct, this batch is no-video. Price shows `Gold price follows Jaipur…` + breakdown.
4. Search test: Tap 🔍 → type `PGS5001` → should show exactly 1 result → open → images 4, no video, stock `In stock` (8 or 10)
5. Other categories (Necklaces, Earrings…) → still show 20 each → total 405 products intact. If any category is empty → you did not delete other categories (script never touches them, so this is just a cache — Purge Again).

**Still stuck? Copy the exact line you see:**
- Actions → tap the failed run → copy the last 20 lines (red) → paste to agent
- Bridge → copy the box text under Step 2/3 → paste
- Or type `https://shivaa.in/api/products` in browser → how many `rings`? The agent can diagnose from that.

---

## TROUBLESHOOT — What each “error” actually means

| What you see | What it means | Fix (1 tap) |
|---|---|---|
| `VIDEOS 0/65` in `python3 demo65/status.py` | **Not an error** — this batch is intentionally no-video (HandOff v44). 65/65 COMPLETE means images done. | Nothing — run Ring Reset as above |
| `ring-reset.yml D` or `fatal: path not found` | Branch behind `main` | Part 1 Merge — fixed in `40cc203` |
| `SSL_ERROR_SYSCALL` / `connection: … 0` in Arena | **Expected** — Arena firewall blocks shivaa.in. Never works from chat. | Use Path A or B, not `python3 … --live` in Arena |
| `Repository secret SHIVAA_ADMIN_PASSWORD is not set.` | Secret not added | Part 2 — add secret |
| `login failed (401)` | Password wrong in secret or bridge login | Edit secret → paste correct live password → Re-run |
| `expected 65 PGS media folders, found 0` | You are on old branch without media | Merge Part 1, run from `main` |
| `MISMATCH — investigate` after verify | Tunnel hiccup, 1–2 uploads lost | Tap **Re-run** (Actions) or **Upload next 4** (bridge) — ledger resumes |
| `405 products, 85 rings` before reset | Correct before: 65 PGS + 20 original rings | After reset you want `405 products, 65 rings` |
| `shivaa-FULL…rar 1.3G` | Don’t push to Git — ignored. | Nothing — already in `.gitignore` |

---

## FOR DEVELOPERS — Commands behind the clicks

```bash
# 1. Bring branch up to date (already done in 40cc203)
git checkout arena/01a09a29-shivaa-ecom
git fetch origin
git checkout origin/main -- .github/workflows/ring-reset.yml deploy/ring_reset.py HANDOFF.md

# 2. Fix DB drift (already done)
# cms/data/db.json: copied mediaNote from demo65 for 37 missing → 65/65 now
# demo65/media/*/meta.json: stock 0→8/10 for 39 files

# 3. Push + PR (already pushed)
git add -A && git commit -m "fix: unstick project …" && git push origin arena/01a09a29-shivaa-ecom
gh pr create --fill --base main --head arena/01a09a29-shivaa-ecom
gh pr merge --squash --auto   # or click Merge on GitHub

# 4. Dry-run from any online machine (not Arena)
python3 deploy/ring_reset.py --email admin@shivaa.in --password '***'          # lists 85 to delete
python3 deploy/ring_reset.py --email admin@shivaa.in --password '***' --live   # real

# 5. Verify
curl -H "Authorization: Bearer <token>" https://shivaa.in/api/products | python3 -c "import json,sys; j=json.load(sys.stdin); print(len([p for p in j['products'] if p['category']=='rings']))"
# want 65
```

---

## SUPPORT — What to send if you’re still stuck

Send **all three** (copy-paste):
1. Which Path you tapped (A or B) and which **Step number** you are on
2. Screenshot or exact text of the **red error box** (or green success line)
3. The file `deploy/ring_reset_ledger.json` from Actions artifact or bridge folder (it only lists SKUs, no password)

I will resume from the ledger — you never need to start over.

**Last updated:** 13 Sep 2026 15:00 IST — Branch `arena/01a09a29-shivaa-ecom` `40cc203` — All fixes verified: `python3 demo65/status.py` 65/65, `cms/data/db.json` 65/65 mediaNote, workflow strict.
