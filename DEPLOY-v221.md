# DEPLOY-v221.md — release 221 · "THE CLEAN-UP RELEASE" · dead revolving-case code removed

Status: **READY — owner approval required before anything is taken live.**
A push, a green test run, or a finished zip is **not** approval. Live today is
**v205** (WWW + Netlify). If anything higher than 221 is live, stop.

**Read `DEPLOY-v205.md` first.** Drop-in replace root with `cms/` (same shape),
then `purge` before `activate`. This package carries v206 → v221 and includes
the film files (`images/films/`) and the offer artwork (`images/offers/`).

---

## 1 · What this release is

A **housekeeping release**. No new feature, no visual change intended. The
owner's own item 6 from the v220 handoff — *"old dead code (harmless): `v125.js`
`mountCase` is never called; case CSS remains in v213–v216 layers. Clean-up
release later"* — is done here.

Nothing about the customer experience is meant to change. The point is that the
next release starts from a smaller, honest tree instead of carrying ~15 KB of
JavaScript that can never run and ~275 lines of CSS that can never match.

## 2 · What was removed

**`cms/js/v125.js` (15,172 bytes, ~305 lines).** The revolving film case was
retired at v218 and its markup is never mounted, so its code was already dead:

| Removed | Why it could never run |
|---|---|
| the `mountCase()` function and its section | `mountAll()` only ever mounts the thread — there is no case mount point |
| `caseApi` | only ever assigned inside `mountCase()` |
| `casePlaces`, `caseResizeBound` and the v167 resize re-placer | they served `mountCase()`'s re-mounts |
| the case members of `win.ShivaaV125` (`openCase`, `caseNext`, `caseFront`, `caseCount`, `caseFilms`) | they read state that can no longer exist |

**Case CSS across eleven stylesheets (275 lines).** The v220 handoff said the
case CSS sat in "v213–v216". That was **incomplete** — it was actually spread
across **eleven** files: `v125`, `v196`, `v200`, `v207`, `v208`, `v209`, `v210`,
`v211`, `v213`, `v214`, `v215`. All of it is gone.

## 3 · What was **kept**, on purpose (this is the important part)

The case CSS was **not** removed wholesale, because one of its classes is still
live:

- **Bare `.sv-case-no` is LIVE.** The gold thread's markup still renders
  `<span class="sv-case-no">FILM 01</span>` for each chapter badge
  (`v125.js`, in `mountThread`). Its rules in `v125.css` and `v209.css` are
  **kept untouched** — removing them would have silently restyled the thread.
  (`v210.css`'s `.sv-case-card .sv-case-no` **was** removed: it required a dead
  ancestor, so it could never match.)
- **`CASE_FILMS` is live data.** It is still the reel's default list
  (`reel.list = list || CASE_FILMS`), so the array and that fallback stay.
- **Every shared selector list was trimmed selector-by-selector**, never
  deleted as a whole, so the sibling rules keep working:

  | File | Was | Now |
  |---|---|---|
  | `v196.css` | `.sv-case video, .sv-thread video, …` | `.sv-thread video, .sv-thread-item video, .sv-film video` |
  | `v200.css` | `.sv-case-card, .sv-thread-film` | `.sv-thread-film` |
  | `v208.css` | `.cb-wrap .cb-arrow, .sv-case-arrow` | `.cb-wrap .cb-arrow` |
  | `v211.css` | `.sv-case-card .sv-film-wrap video, .sv-thread-film …` | `.sv-thread-film .sv-film-wrap video` |

- `filmMedia()` (poster + broken-file fallback), the thread, the reel, `lite()`
  and the `sv-film-*` classes are all untouched.

## 4 · Version stamps (all moved to 221)

`index.html` (`?v=221` ×92 + `window.__SHIVAA_REL=221`), `sw.js`
(`shivaa-shell-v221`, `const REL = 221;`, SHELL_FILES re-stamped), `app.js`
(`APP_REL = 221`), `api.php` (`'rel' => 221,`), and both shipped countdown docs
(`docs/HANDOFF-unreal8055.md`, `docs/shivaa-website-facts-for-grok.md`).
The shell name changed, so every phone picks the new files up on activate.
Unrelated `220` values (`#4a1220` colours, `220px`, `2200ms`) were deliberately
left alone.

## 5 · QA run before packaging (headless jsdom + static, no real browser)

| Check | Result |
|---|---|
| `node qa/browser/t-v221-cleanup.mjs` (**new** — 33 static + jsdom assertions) | **33 / 0** |
| `node qa/browser/t-v220-billing-gone.mjs` (rollback guard: billing stays gone) | **13 / 0** |
| `node qa/browser/t-v209-alive.mjs` (alive suite) | **96 / 0** |
| `node qa/browser/t-v206-flip.mjs` (flip guard) | **ALL PASS** |
| `node qa/browser/t7-audit.mjs` (routes + product pages) | **4 / 0** |
| `node qa/browser/t-v218-sidebar.mjs` | **13 / 0** |
| `node qa/browser/t-v219-depth.mjs` | **22 / 0** |
| `node --check` on `v125.js`, `sw.js`, `app.js` and the edited suites | clean |

The new suite proves both halves: that the dead code is **gone**, and that the
live things it touched are **still there** — including a real jsdom boot that
asserts the thread still renders all five chapter badges, that each film keeps
its poster, and that the reel still opens and closes.

**Older suites were rolled forward, as every release does:** the stamp bodies in
`t-v209-alive`, `t-v219-depth` and `t-v220-billing-gone` now assert 221. One
`t-v209-alive` assertion was retired honestly rather than left as a false pass —
it checked for the words `ALL FOUR FILMS PLAY`, a string that only existed
inside the removed code. It now asserts the case code is gone **and** that
`.sv-case-no` survived.

**Not run:** `php -l` on `api.php` (PHP is not installed in this sandbox). The
v221 `api.php` change is a single number (`'rel' => 220,` → `'rel' => 221,`).
Please run one `api.php` request (e.g. `GET /api/settings`) after upload.

**Not verified in a browser:** there is no way to render the site here. The
removed CSS was proven *unreachable* (the classes it selects can no longer exist
in the DOM) rather than *visually harmless*. That is why the QA includes a
"no visual change" instruction in the owner checklist below.

**QA fixture fix (not shipped):** `qa/build-test-db.py` now also emits
`makingCharges`. `api.php` serves that key and `qa/preview_shim.py` mirrors the
route, so without it every jsdom boot took a `KeyError` → HTTP 500 on
`GET /api/making-charges`. `app.js` catches it and falls back to `{table: []}`,
so nothing was ever visibly broken, but the 500s slowed every boot and made the
timing-based suites flaky. `qa/` is **not** in the zip.

**QA environment note:** while investigating what looked like a flip-suite
regression, a stray headless-node process from an earlier timed-out probe was
found pinned at ~60% CPU on a 2-core sandbox. It was starving every suite:
page boots went from ~2.6 s to ~36 s and timing-sensitive assertions failed.
Killing it returned the whole gate to green. If a suite fails oddly here, check
for stray `node` processes before suspecting the code.

## 6 · Package

- `shivaa-update-v221.zip` — **349 files · 37,044,662 bytes · sha256
  `0a1a8e0a620c73ac36ac46fc3c93bd8c4ae94b28c38516be454d63a0eb6850eb`**
- Same file list as v220 (the packaging set is stable; only contents changed).
- Includes `images/films/` (18 files) and `images/offers/` (4 files).
- `cms/data/db.json` is **not** in the zip (gitignored, local fixture only).
- Link: `https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/e8a470c6-shivaa-ecom/shivaa-update-v221.zip`
- Rollback rung: `shivaa-update-v220.zip` (not live) — the last live release is
  still **v205**.

## 7 · Deploy steps (after the owner's explicit yes only)

1. Download `shivaa-update-v221.zip`; check the sha256 above.
2. Replace the site root with the zip's contents (same shape as `cms/`).
3. Purge the CDN cache **before** activating.
4. Check `GET /api/settings` answers and `GET /api/version` reports rel 221.
5. **Owner visual check (this release's whole point is "nothing changed"):**
   open the home page and confirm the section *"Everything begins as one thread
   of gold"* looks exactly as before — five chapter films, each with its
   `FILM 0N` badge, posters loading, and the full-screen reel opening when a
   film is tapped. That one section is the only thing this release could
   possibly have disturbed.

## 8 · Suggested rollback

If the thread section or the reel looks wrong after upload, restore
`shivaa-update-v220.zip` (the immediately previous tree). Forward-only still
applies: never re-number, never reuse 221.
