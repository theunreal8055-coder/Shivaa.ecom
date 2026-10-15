# NEXT-CHAT-HEAD — paste this first in every new chat

Written at the end of the v222 turn (15 Oct 2026, Asia/Calcutta).

---

## 1 · Which branch to work in

- **Session branch (use this one): `arena/e8a470c6-shivaa-ecom`.**
  This Arena session is fixed to it. Commit here, push only here:
  `git push origin arena/e8a470c6-shivaa-ecom`.
- **Twin branch: `arena/09f3c79f-shivaa-ecom`.** Sits at its v220 tip (`4a9e239`).
  The session branch was branched from exactly that commit, so the two trees were
  byte-identical when v221 started. **It has not been touched since, and PR #106 on it is
  untouched.** v221 and v222 exist only on the session branch.
- PR base for both: `arena/5529f0ec-shivaa-ecom`. `main` is **not** the release line.
- Never create, switch to, or push to another branch. Never delete a branch. Never merge
  another branch.

## 2 · The sandbox resets between turns — do this FIRST

```
cd /home/user/Shivaa.ecom
git fetch origin arena/e8a470c6-shivaa-ecom
git reset --hard FETCH_HEAD
git log --oneline -1        # must show the newest pushed release (v222 or later)

npm install --prefix /tmp jsdom@26 --no-audit --no-fund
python3 qa/build-test-db.py
python3 qa/preview_shim.py --port 8090      # start_process, keep it running
```

**Check for stray headless processes before you trust a failure.**

```
ps aux | grep "[n]ode"
```

At v221 a stray `node` from a timed-out probe sat at ~60 % CPU on this 2-core box.
Page boots went from ~2.6 s to ~36 s and timing-based suites failed with
real-looking assertion errors. Killing it made everything green. **A flaky suite here
is usually CPU starvation or load, not the code.** Always end ad-hoc node probes with
`process.exit(0)` or they linger and do exactly this. And when a suite fails in a way
that makes no sense, **A/B it against the previous commit** (`git stash push -- cms/ qa/`)
before you go hunting in the diff.

Beware `grep -c` in an `&&` chain: it exits 1 on zero matches and silently kills the rest.

## 3 · Forward-only rule (absolute)

- Live site is **v205** (owner confirmed). Nothing goes live without the owner's explicit yes.
- A push, a merge, a green test, or a finished zip is **not** approval.
- Never reuse or renumber a shipped release. Never revert. Never force-push. Never restore an old zip.
- Never deploy an older tree over a newer one.
- Next release number is **v223**.

## 4 · Release table (pushed on the release branch, none live except v205)

| Release | Commit | Zip sha256 (first 16 / last 8) | What it is |
|---|---|---|---|
| v205 | (live) | — | Live on the site |
| v206–v215 | up to `8982c8c` | see DEPLOY notes | Flip, case, banners, flicker work (flip removed at v214) |
| v216 | `54bb06e` | `f2b17014…0954` | Offer banners: real artwork; phone films; hero organised |
| v217 | `71dd0c8` | `cd38679f…c64060` | Page-jump root cause; case reinstalled; sidebar + search |
| v218 | `d17e276` | `9faec9d6…052a1d` | 10g entry; funnel stop; sidebar; case removed; Passport sign-in |
| v219 | `fafed78` | `ccddcab3…728f` | 10g button readable; offer depth tilt/glare; paused sheen |
| v220 | `6e88647` | `1b461b82…1899a` | Billing software removed from the website |
| v221 | `5bf57a2` | `0a1a8e0a620c73ac…eb6850eb` | The Clean-Up Release: dead revolving-case code + CSS removed |
| v222 | (see DEPLOY-v222.md) | `e05e08dd1bd550a4…d9f77643` | **The Load Release**: 58 render-blocking stylesheets → **1 bundle**; SW precaches 1 instead of 57; boot race fixed (`state.settings` null → Contact page crash) |

Each release has: `DEPLOY-vNNN.md` at repo root, `shivaa-update-vNNN.zip` at repo root,
stamps moved everywhere (index `?v=`, `__SHIVAA_REL`, sw.js SHELL/REL/SHELL_FILES,
app.js APP_REL, api.php `'rel'`), and both countdown docs
(`cms/docs/HANDOFF-unreal8055.md`, `cms/docs/shivaa-website-facts-for-grok.md`) —
which **are** shipped inside the zip, so update them **before** building it.

**Package file list:** v219/v220/v221 all shipped **349 files**; v222 ships **350**
(the one addition is `css/shivaa.css`). Rebuild the list from the previous zip so it
can never drift:

```
cd /home/user/Shivaa.ecom
unzip -Z1 shivaa-update-vNNN.zip | grep -v '/$' | sort > /tmp/list.txt
# if the release adds a file, append it here, then:
cd cms && zip -X -q -@ ../shivaa-update-vNNN.zip < /tmp/list.txt
```

Then verify: `unzip -q -o shivaa-update-vNNN.zip -d /tmp/v` and `cmp` every file against
`cms/`. `cms/data/db.json` is gitignored and must never be in the zip.

Zip link: `https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/e8a470c6-shivaa-ecom/shivaa-update-vNNN.zip`

## 5 · QA commands (run in this order, sequential, never in parallel)

```
node qa/browser/t-v222-bundle.mjs                 # the load release: order + one stylesheet
node qa/browser/t-v221-cleanup.mjs                # dead case code gone, live bits kept
node qa/browser/t-v220-billing-gone.mjs           # rollback guard: billing stays gone
timeout 1500 node qa/browser/t-v209-alive.mjs     # alive suite, ~70-90 s (expect 96/0)
node qa/browser/t-v206-flip.mjs                   # flip guard (expect ALL PASS)
timeout 280 node qa/browser/t7-audit.mjs          # routes + buttons + errors (expect 4/0)
node qa/browser/t-v218-sidebar.mjs                # sidebar + funnel scroll (expect 13/0)
node qa/browser/t-v219-depth.mjs                  # 10g fill, offer depth, stamps (expect 22/0)
```

Expected totals at v222: bundle 36/0, cleanup 34/0, billing-gone 13/0, alive 96/0,
flip ALL PASS, t7 4/0, sidebar 13/0, depth 22/0.

**t7's route count is not a fixed number** — it derives routes from the home page's
`#/` links, which are rendered progressively (182 → 2507 links over 5 s). A different
count between runs is timing, not a regression. The assertion that matters is
`zero uncaught errors across the whole walk`.

When stamps move, **older suites must be rolled forward too** — their stamp bodies
assert the newest number (long-standing convention; some labels are stale on purpose).
At v222 the bodies in `t-v209-alive`, `t-v219-depth`, `t-v220-billing-gone` and
`t-v221-cleanup` were updated. **Suites that used to assert a layer's own `<link>` in
index.html now assert the layer is inside the bundle** — e.g.
`CSS_BUNDLE.includes('/* v218.css */')`. That is a stronger check: it proves the layer
is shipped, not just named.

Known sandbox-only noise: a jsdom "Client network socket disconnected" comes from the
Cashfree SDK (`sdk.cashfree.com`); the sandbox has no outbound TLS there. Suites filter
it. PHP is NOT installed (`php -l` unavailable).

## 6 · THE STYLESHEET RULE (v222 — read before touching CSS)

Since v222 the page loads **one** stylesheet, `/css/shivaa.css`, built from all 57
layers. The rules:

1. **Never hand-edit `cms/css/shivaa.css`.** It is generated.
2. **Never re-derive the layer order from `index.html`.** index.html now links only the
   bundle, so any script that reads it for the order would bundle the bundle into itself.
   (The first draft of `build-css-bundle.py` did exactly that; `t-v222-bundle` caught it.)
3. The order lives in **`tools/css-bundle-order.txt`** and is **load-bearing** — later
   layers exist to override earlier ones on specificity ties.
4. To change styles: edit the layer under `cms/css/`, then
   `python3 tools/build-css-bundle.py --write`, then run `t-v222-bundle`.
5. **`v186.css` is listed twice on purpose** (index.html linked it at two positions; two
   `<link>`s to one sheet occupy two cascade positions). Do not "tidy" it away.
6. The 57 layer files stay in the repo and in the zip. The QA suites read them, and a
   rollback can restore `index.html` alone.
7. Adding a layer: add the file, put its name where the cascade needs it in the order
   file, regenerate, and update `CANON` in `qa/browser/t-v222-bundle.mjs`.

## 7 · Rules for writing code in this repo (from earlier owner orders)

- Touch-action on JS-dragged elements: `pan-y` or `none`. Never `manipulation`.
- Inline JS 3D transforms need the `-webkit-` prefix as well (`setT` helper).
- Never reintroduce the tap-to-flip affordance (removed at v214).
- No filter / blur / mix-blend loops in the hero or card scene; no `filter:` on content
  images; never animate `background-clip:text`; never transform `.c-slide` or Ken-Burns.
- Keep the v200 gold button gradient; do not override `position` on elements that earlier CSS positions (v186 seals).
- Run `node --check` after every JS edit.
- QA assertions on raw CSS/JS text must be whitespace-tolerant; comments must not contain the text an assertion checks.
- `cms/data/db.json` is never committed and never ships. Real data never enters git.
- **Before deleting "dead" CSS, check for live consumers.** `.sv-case-*` looked safe to
  sweep at v221, but the gold thread's markup still renders `class="sv-case-no"`. Remove
  shared selector lists **selector-by-selector**, never as a rule.
- **Never let a route dereference `state.*` that loads asynchronously.** Boot caps the
  API wait at 6 s and paints anyway, so anything rendered in that window must work with
  defaults. `state.settings` now starts on `SETTINGS_DEFAULTS` for exactly this reason;
  `state.rates` was already guarded everywhere.
- The owner says "5D" for the offer banners; there is no 5D on a screen. Ask before going further.

## 8 · Pull request and handoff

- **PR for the session branch:** create one from `arena/e8a470c6-shivaa-ecom` → base
  `arena/5529f0ec-shivaa-ecom` when the owner wants v221/v222 reviewed. **Do NOT merge
  or close any PR unless the owner says so.**
- PR #106 (on `arena/09f3c79f-shivaa-ecom`) is **open, untouched, and now 2 commits behind**
  the session branch. Leave it alone unless the owner decides otherwise.
- Memory updated at the end of v222: `MEMORY.md`, `ARENA-STATE.md`, `AGENTS.md`,
  `docs/AGENT-HANDOFF.md` (top blocks), this file, and the two shipped countdown docs.

## 9 · Open items (as of v222)

1. **Owner review of v206–v222** — nothing is live except v205. Owner says yes before any zip goes up.
2. **Owner visual check for v222 specifically:** on a phone on mobile data, the page must
   appear once, fully styled, with **no restyle flash** a moment after it appears. That
   flash is what v222 removes. Also open Contact and confirm the address/phone/email show.
3. **Billing software (owner's own app):** the site side is removed (v220). The owner must
   delete `public_html/billing/` on Hostinger and turn off its stock sync.
4. **Billing AI chatbot (owner's ask):** BLOCKED — the owner has not provided the billing
   app's code, and the sandbox cannot reach `shivaa.in` or any external AI API. Two
   questions pending: where it lives, and whether entries are previewed before saving.
5. **Real-device checks still needed:** 10g button colours, offer tilt feel, scroll
   smoothness, sign-in sheet, sidebar swipe — none verified in a real browser or phone.
6. **PHP checks on the server:** `php -l` unavailable here. Run `GET /api/settings` and
   `GET /api/version` after upload.
7. **Next performance candidates (measured, not done):** the 22 deferred JS files
   (~1 MB) are the remaining request count — but bundling them risks `'use strict'`
   leaking across file boundaries, and first paint does not wait on them. The
   `aurum/motion/boost.js` trio (107 KB) is already injected after first paint by
   `v117.js`. If JS is bundled later, wrap each file and re-run the whole gate.
8. **The twin branch `arena/09f3c79f-shivaa-ecom` is 2 commits behind.** Reconciling it is
   the owner's decision; the agent must not force-push or rewrite either branch.

## 10 · Owner communication

The owner writes in Hinglish/Hindi. Reply in simple Hinglish, short, with the bare zip
link and the sha256. Always say clearly: not live, owner approval needed, and which
checks could not be done in the sandbox (real browser, phone, PHP on the server).
