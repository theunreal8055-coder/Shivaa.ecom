# ARENA-STATE — the continuity contract (read this first, every chat)

> **Purpose:** no matter which chat, which account, or which device opens this
> repo in Arena, work ALWAYS continues forward from the newest state — never
> restarts from zero. This file + `main` together are that guarantee.

---

## 1. CURRENT STATE (update this block at the end of every work session)

- **Version on `main`:** **v114 — 2026-09-15** (checkout invoice FY TypeError). Zip: `shivaa-update-v114.zip` (`api.php` + `DEPLOY-v114.md`). Proof: `node tools/mega/php-sweep/sweep.mjs` → **211 routes · 0 exceptions**.
  - **v114 (this session, branch `arena/01a0a2e9-shivaa-ecom`):** `declare(strict_types=1)` made `str_pad(((int)date('y')) ± 1, …)` throw on every checkout (invoice `SHV/{fy}/{seq}`). FY is now Apr-start IST via `$fyStart` and `(string)` `str_pad`. No DB change.
  - **v113 / v113b — 2026-09-15 ✅ merged** (supersedes v111-rings-live + v112 hotfixes). Zip: `shivaa-update-v113.zip` (24 files, 489 KB — index.html, sw.js, api.php, css/v113.css, js/app.js, js/auth.js, 17 × images/categories/*.jpg, DEPLOY-v113.md).
  - **v113b (ex-branch `arena/01a0a2cc-shivaa-ecom`):** the v113 line was hardened after the first cut shipped with two self-inflicted bugs — the carousel's `start()` stacked a second autoplay timer on every scroll-cancel (deck jumped 2–3 slides), and the KYC auto-verifier silently dead-ended on a wrong OTP (no retry). Also fixed: RTGS cells printed `▼ -1,240` and Jaipur cells `▲ 0 ₹/g vs prev` (now `— steady` on every cell), `sw.js` precached a stale shell (`app.js?v=108`, `auth.js?v=107`, `boost.css` missing) and answered missing images with `index.html`, and **17 category faces that never existed** (`images/categories/*.jpg` — the collection grid showed broken-image icons while the catalogue loaded). All 17 now ship (rings = real photo, 16 branded placeholders). Proof: `tools/mega/smoke/v113b-check.js` → **31/31 checks pass**, verified again against the built zip's contents.
- **Live catalogue re-verified 2026-09-14 ~16:25Z (full end-to-end read of
  `/api/products`, all chunks):** exactly 65 products = SKUs PGS5001–PGS5065,
  zero duplicates, zero non-PGS/samples, 4 images each. Batch-2 photo refresh
  run 34868057801 (same 65 SKUs, photos only) fired by PR #32 merge.
- **v111 go-live VERIFIED:** Catalogue Deploy run
  https://github.com/theunreal8055-coder/Shivaa.ecom/actions/runs/34861781402
  succeeded (16m, independent verify green). Live `/api/products` is exactly
  65 PGS rings, 4 shots each, 0 samples, 0 videos. Master db matches.
  340 samples remain archived at `qa/archive/samples-340-v111.json`.
- **v112 HOTFIXES (2026-09-14, ex-branch `arena/01a0a030-shivaa-ecom` now on `main`):** PayU gateway fixed (address `->`→`[]`, key/salt regex, strict reconcile, probe), bullion 1s poll + 60fps millisecond smooth, rate-drift root-cause (Jaipur premium +55), live-rates panel CONNECTED to bullion panel (`current_rates()` now reads bullion `.angel-tick.json` directly). Zips: `payu-update-20260914.zip`, `bullion-update-20260914.zip`, `connect-rates-bullion-20260914.zip`. Live `api.php` is at `public_html/api.php` on Hostinger — see HANDOFF § v112 and `MEMORY.md`.
- **Follow-up (not blocking live):** zoom-fix **batch 2 DONE** (session
  arena/01a0a0a6: 9 covers incl. 5005 re-roll + 5003 editorial, all PASS,
  installed to cms + demo65; GO-LIVE marker re-bumped so Catalogue Deploy
  refreshes live photos on merge). Batches 3–7 remain in
  `tools/photoshoot/ZOOMFIX-STATE.md` (25 covers + 17 editorials). Lost commit
  0a2b3f5 was verified unrecoverable (never on GitHub) and re-done from scratch.
- **New in v113b — the behaviour harness** (`tools/mega/smoke/v113b-check.js`):
  boots the real `index.html` in jsdom, serves `cms/` over http, emulates the
  PHP API from `data/db.json`, and runs 31 assertions over the carousel, rate
  strip, quick view, design-selection persistence, KYC auto-verify + retry,
  login OTP and the image net. Two passes (anonymous shopper + partner with a
  `shv_token`). **Run it before any UI merge** — it caught three real bugs in
  this release that no static review had. `SMOKE_CMS=<dir>` points it at any
  copy of the site (used to verify the shipped zip).
- **Products:** **65** in `cms/data/db.json` (owner: rings only, no samples).
- **Deploy contract:** `main` is what the server cron tracks (`branch: main`).
  Live catalogue writes go through Catalogue Deploy, not the v110 bridge.

## 2. THE FORWARD-ONLY RULES (for every agent, every chat — no exceptions)

1. **Start from the tip of `main`.** Before doing anything:
   `git fetch origin main && git log --oneline -3 origin/main`, then confirm
   this file's "Version on `main`" matches what you branched from. If your
   session branch is behind `main`, merge `main` into it FIRST.
2. **Work only on your session branch** (`arena/…` — the one Arena gave you).
   Never switch branches, never commit to `main` directly.
3. **Finish by merging back to `main` via PR.** Work that stays on a side
   branch is INVISIBLE to the next chat. Last step of every task:
   push → open PR (`gh pr create --base main`) → merge it
   (`gh pr merge --merge`) → update section 1 above (in the same PR).
4. **NEVER rewrite `main`.** No force-push, no "delete everything + re-upload",
   no "Add files via upload" overwriting `cms/`. `main` only ever moves forward
   through PR merges. (Branch protection blocks force-pushes; do not disable it.)
5. **NEVER start from an old `arena/…` branch.** Old session branches are
   archives, not starting points. If a previous chat's PR is still open, either
   merge it first or rebase your work on top of `main` after it merges.
6. **Commit + push every turn** (`git add -A && git commit && git push origin <session-branch>`).
   Sandbox restores can wipe uncommitted work; pushed commits survive everything.

## 3. HOW TO VERIFY YOU ARE CURRENT (30 seconds)

```bash
git fetch origin main
git log --oneline -3 origin/main          # newest commit on GitHub
head -12 ARENA-STATE.md                    # newest version this repo knows
# Both must agree with section 1. If origin/main is NEWER than your branch:
git merge origin/main                      # pull the future in, then continue
```

## 4. WHAT HAPPENED (Sep 2026 — why this file exists)

- Chats Sep 5–13 did great work on 30+ `arena/…` branches (v42 → v109).
  Several PRs merged, but the newest lines (v105–v109) lived ONLY on side
  branches while `main` lagged behind — so each new chat branched from stale
  `main` and appeared to "start from zero".
- 2026-09-14: consolidated everything onto `main` in one forward merge
  (`arena/01a09f25-shivaa-ecom` → `main`): v108-MEGA tree (superset of `main`,
  zero main-only files) + v109-line polish (3-way merge vs v107.4, every file
  accounted). Superseded PRs #21, #11, #15, #19 were closed as contained-in-main
  (their branches remain on GitHub as archives).
- From here on: **if it's not on `main`, it's not done.** Follow the rules
  above and no work can ever be lost again.

## 5. OWNER CHEAT-SHEET (no git knowledge needed)

- New chat? Just say: **"Read ARENA-STATE.md and HANDOFF.md first, then continue."**
- The agent checks it started from the newest `main`, does your task, and merges
  back to `main` — so the NEXT chat automatically starts where this one ended.
- Your live site deploys from `main` (auto-sync cron). One branch to watch: `main`.
