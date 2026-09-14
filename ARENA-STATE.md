# ARENA-STATE — the continuity contract (read this first, every chat)

> **Purpose:** no matter which chat, which account, or which device opens this
> repo in Arena, work ALWAYS continues forward from the newest state — never
> restarts from zero. This file + `main` together are that guarantee.

---

## 1. CURRENT STATE (update this block at the end of every work session)

- **Version on `main`:** v109-consolidated (v108-MEGA ∪ v109-line) — 2026-09-14
- **Contains:** full v107.4 line (PR #21: v105/v106/v107 UI + operability) ·
  v108-MEGA (boost layer, cinematic films, banners, owner media/zips v56–v92) ·
  v109-line (shopper polish `v108.css/v108.js` + 100-feature pack `v109.js`)
- **Products:** 405 in `cms/data/db.json` (65 PGS rings with full photoshoots)
- **Deploy contract:** `main` is what the server cron tracks (`branch: main`).

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
