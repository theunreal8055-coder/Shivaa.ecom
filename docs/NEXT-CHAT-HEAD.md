# NEXT-CHAT-HEAD — paste this first in every new chat

Written at the end of the v221 turn (15 Oct 2026, Asia/Calcutta).

---

## 1 · Which branch to work in

**Read this carefully — v221 changed the branch reality.**

- **Session branch (use this one): `arena/e8a470c6-shivaa-ecom`.**
  This Arena session is fixed to it. Commit here, and push only here:
  `git push origin arena/e8a470c6-shivaa-ecom`.
- **Twin branch: `arena/09f3c79f-shivaa-ecom`.** This is the branch the v206–v220
  work used, and the one earlier handoffs name. It sits at its v220 tip
  (`4a9e239`). `arena/e8a470c6-shivaa-ecom` was branched from exactly that commit,
  so **the two trees were byte-identical when v221 started**.
- **`arena/09f3c79f-shivaa-ecom` was deliberately left untouched by v221.**
  Its PR (#106) is exactly as it was.
- PR for the session branch: see section 7. Base for both: `arena/5529f0ec-shivaa-ecom`.
- `main` exists on the remote but is **not** the release line for this work.
- Never create, switch to, or push to another branch. Never delete a branch.
  Never merge another branch.

## 2 · The sandbox resets between turns — do this FIRST

The checkout has been reset to an older commit between turns several times. Before
any work, run:

```
cd /home/user/Shivaa.ecom
git fetch origin arena/e8a470c6-shivaa-ecom
git reset --hard FETCH_HEAD
git log --oneline -1        # must show the newest pushed release (v221 or later)
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

**Check for stray headless processes before you trust a failure.**

```
ps aux | grep "[n]ode"
```

At v221 a stray `node` from a timed-out probe sat at ~60 % CPU on this 2-core
box. Page boots went from ~2.6 s to ~36 s and the timing-based suites
(`t-v206-flip`, `t-v218-sidebar`) failed with real-looking assertion errors.
Killing it made everything green again. **A flaky suite here is usually CPU
starvation, not the code — verify before you bisect.** Also: always end ad-hoc
node probes with `process.exit(0)`, or they linger and do exactly this.

Never write long commands with the cwd inside the command body; pass cwd as the
tool parameter. Write long Python edits to a file, then run that file.
Beware `grep -c` in an `&&` chain: it exits 1 on zero matches and silently kills
the rest of the chain.

## 3 · Forward-only rule (absolute)

- Live site is **v205** (owner confirmed). Nothing goes live without the owner's explicit yes.
- A push, a merge, a green test, or a finished zip is **not** approval.
- Never reuse or renumber a shipped release. Never revert. Never force-push. Never restore an old zip.
- Never deploy an older tree over a newer one.
- Next release number is **v222**.

## 4 · Release table (pushed on the release branch, none live except v205)

| Release | Commit | Zip sha256 (first 16 / last 8) | What it is |
|---|---|---|---|
| v205 | (live) | — | Live on the site |
| v206–v215 | up to `8982c8c` | see DEPLOY notes | Flip, case, banners, flicker work (flip was later removed in v214) |
| v216 | `54bb06e` | `f2b17014…0954` | Offer banners: real artwork; phone films (front only); hero organised |
| v217 | `71dd0c8` | `cd38679f…c64060` | Page-jump root cause; case reinstalled; sidebar + search; campaign buttons |
| v218 | `d17e276` | `9faec9d6…052a1d` | 10g entry highlighted; funnel stops jumping; sidebar restored + swipe; case removed; Passport sign-in redesign (`v218.css`) |
| v219 | `fafed78` | `ccddcab3…728f` | 10g button readable (gold fill + dark ink); offer depth tilt/glare; gold offer buttons; sheen paused off-screen (`v219.css`, `js/v219.js`) |
| v220 | `6e88647` | `1b461b82…1899a` | **Billing software removed from the website** (admin card + sync form, billing stock routes, sync contract doc) |
| v221 | (see DEPLOY-v221.md) | `0a1a8e0a620c73ac…eb6850eb` | **The Clean-Up Release**: dead revolving-case code removed from `js/v125.js` (15,172 bytes) and its dead CSS from **eleven** stylesheets (275 lines). The live `.sv-case-no` badge the gold thread uses was preserved. |

Each release has: `DEPLOY-vNNN.md` at repo root, `shivaa-update-vNNN.zip` at repo root
(**349 files** — the packaging set is stable since v219; includes `images/films/` 18
files and `images/offers/` 4 files), stamps moved everywhere (index `?v=`, `__SHIVAA_REL`,
sw.js SHELL/REL/SHELL_FILES, app.js APP_REL, api.php `'rel'`), and both countdown docs
(`cms/docs/HANDOFF-unreal8055.md`, `cms/docs/shivaa-website-facts-for-grok.md`) — which
**are** shipped inside the zip, so update them **before** building it.

Build the zip from the v220 file list so the packaging set can never drift:

```
cd /home/user/Shivaa.ecom/cms
unzip -Z1 ../shivaa-update-v220.zip | grep -v '/$' | grep -v '^----' | grep -v '^Name$' | sort > /tmp/list.txt
zip -X -q -@ ../shivaa-update-vNNN.zip < /tmp/list.txt
```

Zip download link pattern (bare link, works after push):
`https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/e8a470c6-shivaa-ecom/shivaa-update-vNNN.zip`

## 5 · QA commands (run in this order, sequential, never in parallel)

```
node qa/browser/t-v221-cleanup.mjs                # clean-up release: dead gone, live kept
node qa/browser/t-v220-billing-gone.mjs           # rollback guard: billing stays gone
timeout 1500 node qa/browser/t-v209-alive.mjs     # alive suite, ~70-90 s (expect 96/0)
node qa/browser/t-v206-flip.mjs                   # flip guard (expect ALL PASS)
timeout 280 node qa/browser/t7-audit.mjs          # routes + product pages (expect 4/0)
node qa/browser/t-v218-sidebar.mjs                # sidebar + funnel scroll (expect 13/0)
node qa/browser/t-v219-depth.mjs                  # 10g fill, offer depth, stamps (expect 22/0)
```

Expected totals at v221: cleanup 33/0, billing-gone 13/0, alive 96/0, flip ALL PASS,
t7 4/0, sidebar 13/0, depth 22/0.

When a release moves the stamps, **older suites must be rolled forward too** — their
stamp bodies assert the newest number (that is the established convention; some of
their labels are stale and were left alone on purpose). At v221 the bodies in
`t-v209-alive`, `t-v219-depth` and `t-v220-billing-gone` were updated to 221.

Known sandbox-only noise: a jsdom "Client network socket disconnected" error comes
from the Cashfree SDK (`sdk.cashfree.com`); the sandbox has no outbound TLS there.
The suites filter it out. PHP is NOT installed in the sandbox (`php -l` is unavailable).

**Fixture note (fixed at v221):** `qa/build-test-db.py` now also emits
`makingCharges`. `api.php` serves that key and `qa/preview_shim.py` mirrors the
route, so without the key every jsdom boot took a `KeyError` → HTTP 500 on
`GET /api/making-charges`. `app.js` falls back to `{table: []}`, so nothing looked
broken, but it slowed every boot. `qa/` is not shipped in the zip.

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
- **Before deleting "dead" CSS, check for live consumers.** `.sv-case-*` looked like a
  safe sweep, but the gold thread's markup still renders `class="sv-case-no"`. Remove
  shared selector lists **selector-by-selector**, never as a rule.
- The owner says "5D" for the offer banners; there is no 5D on a screen. v219 built depth
  (tilt, layers, glare). Ask the owner before going further.

## 7 · Pull request and handoff

- **PR for the v221 session branch:** create one from
  `arena/e8a470c6-shivaa-ecom` → base `arena/5529f0ec-shivaa-ecom` when the owner wants
  v221 reviewed. **Do NOT merge or close any PR unless the owner says so**
  (`gh pr merge <number> --merge` only with the owner's explicit yes).
- PR #106 (on `arena/09f3c79f-shivaa-ecom`, the v206–v220 work) is **open and untouched
  by v221**. Leave it alone unless the owner says otherwise.
- Memory updated at the end of v221: `MEMORY.md` (top block), `ARENA-STATE.md` (top block),
  `AGENTS.md` (top block), `docs/AGENT-HANDOFF.md` (top block), this file, and the two
  shipped countdown docs under `cms/docs/`.

## 8 · Open items (as of v221)

1. **Owner review of v206–v221** — nothing is live except v205. Owner must say yes before any zip goes to the server.
2. **Billing software (owner's own app):** the site side is removed (v220). The owner must delete `public_html/billing/` on the Hostinger server and turn off the billing app's stock sync. The agent cannot reach the server.
3. **Billing AI chatbot (the owner's ask):** BLOCKED. The owner has not provided the billing app's code. The agent cannot reach `shivaa.in` or any external AI API from the sandbox. Next step needs the billing app zip or main HTML/JS files. Two questions pending: where the chatbot lives (inside billing app / inside shop admin / standalone), and whether entries are previewed before saving (recommended: preview, then Save).
4. **Real-device checks still needed:** the 10g button colours, the offer tilt feel, scroll smoothness, the sign-in sheet look, the sidebar swipe — none verified in a real browser or on a phone. **Add for v221:** the thread section ("Everything begins as one thread of gold") on the home page, since that is the only section v221 could possibly have disturbed.
5. **PHP checks on the server:** `php -l` is unavailable in the sandbox. Run `GET /api/settings` and `GET /api/version` after upload.
6. **v221 closed the old item 6** (`v125.js` dead case code + case CSS). Nothing is known to be dead in the JS/CSS layers now.
7. **The `arena/09f3c79f-shivaa-ecom` twin branch is now behind** the session branch by exactly the v221 commit. If the owner wants one branch for everything, they must decide how to reconcile it — the agent must not force-push or rewrite either branch.

## 9 · Owner communication

The owner writes in Hinglish/Hindi. Reply in simple Hinglish, short, with the bare zip link and the sha256.
Always say clearly: not live, owner approval needed, and which checks could not be done in the sandbox
(real browser, phone, PHP on the server).
