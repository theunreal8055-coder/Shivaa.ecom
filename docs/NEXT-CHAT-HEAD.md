# NEXT-CHAT-HEAD — paste this first in every new chat

Written at the end of the v220 turn (15 Oct 2026, Asia/Calcutta).

---

## 1 · Which branch to work in

**Work ONLY in `arena/09f3c79f-shivaa-ecom`.** Commit to it. Push only to it:
`git push origin arena/09f3c79f-shivaa-ecom`. Never create, switch to, or push to
another branch. Never delete a branch. Never merge another branch.

- Working branch (the session branch): `arena/09f3c79f-shivaa-ecom`
- Base branch this work branched from (PR target): `arena/5529f0ec-shivaa-ecom`
- `main` exists on the remote but is **not** the release line for this work.
- Open pull request for the working branch: see section 7 (created at the end of v220).

## 2 · The sandbox resets between turns — do this FIRST

The checkout has been reset to an older commit between turns several times. Before
any work, run:

```
cd /home/user/Shivaa.ecom
git fetch origin arena/09f3c79f-shivaa-ecom
git reset --hard FETCH_HEAD
git log --oneline -1        # must show the newest pushed release (v220 or later)
```

`/tmp` is also wiped between turns. Re-install jsdom for the browser suites:

```
npm install --prefix /tmp jsdom@26 --no-audit --no-fund
```

`cms/data/db.json` (gitignored) is deleted by resets. Rebuild it:

```
python3 qa/build-test-db.py
```

Start the preview shim (background) before the browser suites:

```
python3 qa/preview_shim.py --port 8090      # start_process, keep it running
```

Never write long commands with the cwd inside the command body; pass cwd as the tool parameter.
Write long Python edits to a file, then run that file.

## 3 · Forward-only rule (absolute)

- Live site is **v205** (owner confirmed). Nothing goes live without the owner's explicit yes.
- A push, a merge, a green test, or a finished zip is **not** approval.
- Never reuse or renumber a shipped release. Never revert. Never force-push. Never restore an old zip.
- Never deploy an older tree over a newer one.
- Next release number is **v221**.

## 4 · Release table (pushed on `arena/09f3c79f-shivaa-ecom`, none live except v205)

| Release | Commit | Zip sha256 (first 16 / last 8) | What it is |
|---|---|---|---|
| v205 | (live) | — | Live on the site |
| v206–v215 | up to `8982c8c` | see DEPLOY notes | Flip, case, banners, flicker work (flip was later removed in v214) |
| v216 | `54bb06e` | `f2b17014…0954` | Offer banners: real artwork; phone films (front only); hero organised |
| v217 | `71dd0c8` | `cd38679f…c64060` | Page-jump root cause; case reinstalled; sidebar + search; campaign buttons |
| v218 | `d17e276` | `9faec9d6…052a1d` | 10g entry highlighted; funnel stops jumping; sidebar restored + swipe; case removed; Passport sign-in redesign (`v218.css`) |
| v219 | `fafed78` | `ccddcab3…728f` | 10g button readable (gold fill + dark ink); offer depth tilt/glare; gold offer buttons; sheen paused off-screen (`v219.css`, `js/v219.js`) |
| v220 | `6e88647` | `1b461b82…1899a` | **Billing software removed from the website** (admin card + sync form, billing stock routes, sync contract doc) |

Each release has: `DEPLOY-vNNN.md` at repo root, `shivaa-update-vNNN.zip` at repo root
(349 files for v219/v220; includes `images/films/` 18 files and `images/offers/` 4 files),
stamps moved everywhere (index `?v=`, `__SHIVAA_REL`, sw.js SHELL/REL/SHELL_FILES, app.js
APP_REL, api.php `'rel'`), and both countdown docs (`cms/docs/HANDOFF-unreal8055.md`,
`cms/docs/shivaa-website-facts-for-grok.md`) moved to the next number.

Zip download link pattern (bare link, works after push):
`https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/09f3c79f-shivaa-ecom/shivaa-update-vNNN.zip`

## 5 · QA commands (run in this order, sequential, never in parallel)

```
node qa/browser/t-v220-billing-gone.mjs          # static, billing removal + stamps
timeout 1500 node qa/browser/t-v209-alive.mjs     # alive suite, ~70-150 s (expect 96/0)
node qa/browser/t-v206-flip.mjs                   # flip guard (expect ALL PASS)
timeout 280 node qa/browser/t7-audit.mjs          # routes + product pages (expect 4/0)
node qa/browser/t-v218-sidebar.mjs                # sidebar + funnel scroll (expect 13/0)
node qa/browser/t-v219-depth.mjs                  # 10g fill, offer depth, stamps (expect 22/0)
```

Expected totals at v220: alive 96/0, flip ALL PASS, t7 4/0, sidebar 13/0, depth 22/0, billing-gone 13/0.

Known sandbox-only noise: a jsdom "Client network socket disconnected" error comes from
the Cashfree SDK (`sdk.cashfree.com`); the sandbox has no outbound TLS there. The suites
filter it out. PHP is NOT installed in the sandbox (`php -l` is unavailable).

## 6 · Rules for writing code in this repo (from earlier owner orders)

- Touch-action on JS-dragged elements: `pan-y` or `none`. Never `manipulation`.
- Inline JS 3D transforms need the `-webkit-` prefix as well (`setT` helper).
- Never reintroduce the tap-to-flip affordance (removed at v214).
- No filter / blur / mix-blend loops in the hero or card scene; no `filter:` on content
  images; never animate `background-clip:text`; never transform `.c-slide` or Ken-Burns.
- Keep the v200 gold button gradient; do not override `position` on elements that earlier CSS positions (v186 seals).
- Run `node --check` after every JS edit.
- QA assertions on raw CSS/JS text must be whitespace-tolerant; comments must not contain the text an assertion checks.
- `cms/data/db.json` is never committed. Real data never enters git.
- The owner says "5D" for the offer banners; there is no 5D on a screen. v219 built depth (tilt, layers, glare). Ask the owner before going further.

## 7 · Pull request and handoff

- PR: working branch `arena/09f3c79f-shivaa-ecom` → base `arena/5529f0ec-shivaa-ecom`.
  Created at the end of v220. Do NOT merge or close it unless the owner says so
  (`gh pr merge <number> --merge` only with the owner's explicit yes).
- Memory updated at the end of v220: `MEMORY.md` (top block), `ARENA-STATE.md` (top block),
  `docs/AGENT-HANDOFF.md` (top block), and this file.

## 8 · Open items (as of v220)

1. **Owner review of v206–v220** — nothing is live except v205. Owner must say yes before any zip goes to the server.
2. **Billing software (owner's own app):** the site side is removed in v220. The owner must delete `public_html/billing/` on the Hostinger server and turn off the billing app's stock sync. The agent cannot reach the server.
3. **Billing AI chatbot (the owner's ask):** BLOCKED. The owner has not provided the billing app's code. The agent cannot reach `shivaa.in` or any external AI API from the sandbox. Next step needs the billing app zip or main HTML/JS files. Two questions pending: where the chatbot lives (inside billing app / inside shop admin / standalone), and whether entries are previewed before saving (recommended: preview, then Save).
4. **Real-device checks still needed:** the 10g button colours, the offer tilt feel, scroll smoothness, the sign-in sheet look, the sidebar swipe — none verified in a real browser or on a phone.
5. **PHP checks on the server:** `api.php` edits in v220 were not run through `php -l` (PHP not installed in sandbox). Run `GET /api/settings` after upload.
6. **Old dead code (harmless):** `v125.js` `mountCase` is never called; case CSS remains in v213–v216 layers. Clean-up release later.

## 9 · Owner communication

The owner writes in Hinglish/Hindi. Reply in simple Hinglish, short, with the bare zip link and the sha256.
Always say clearly: not live, owner approval needed, and which checks could not be done in the sandbox
(real browser, phone, PHP on the server).
