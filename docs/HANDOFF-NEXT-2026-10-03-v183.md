# HANDOFF NEXT — v183 BUILT: FY 2026–27 Growth Mission Deck (3 Oct 2026)

## 1. What the owner asked for

> "Make interactive dashboard of B2B partner target 700 and retail customers
> target 1100 … have to be completed before 30th of March 2027 and live
> countdown should be going on … available only on the admin portal … high FY
> ultra luxurious and very good UI design. Give me an update file."

Delivered as **release 183** — built, gated, packaged. **Live is still 181**
(v182 was built on 25 Sep and has not been installed). Nothing was deployed.

## 2. What was built

**Admin → 👑 FY Mission** (`#/admin?tab=fy`) — a dark obsidian + 24k gold-foil
command deck:

| Piece | Behaviour |
|---|---|
| Live countdown | days / hours / minutes / seconds to **30 Mar 2027, 23:59 IST**, ticking every second, **pinned to the server clock** (`serverNow` epoch-ms) so a wrong device clock cannot misreport it; the ticker clears itself when the deck leaves the DOM |
| Lane 01 — B2B Jeweller Partners | target **700**: ring + rail with 25/50/75/100% ticks, achieved / remaining, DB-vs-logged split, needed vs actual run-rate, projected finish, buffer in days, verdict chip |
| Lane 02 — Retail Customers | target **1,100**: same, plus "of whom placed an order" |
| Mission strip | combined 1,800 relationships, required run-rate, current run-rate, **binding projection** (whichever lane finishes last) |
| Growth curve | cumulative month-by-month, built only from real record timestamps + logged rows |
| Ledger | log offline sign-ups **with a mandatory source**, and **Undo** any row |
| Mission settings | targets, finish line, FY start, opening counts, title — all owner-editable |

**API (`cms/api.php`)** — four routes, **every one `need_admin` + audited**:
`GET|POST admin/fy-targets`, `POST admin/fy-targets/entry`,
`POST admin/fy-targets/entry-undo`. Helpers: `shv_fy_defaults`,
`shv_fy_config`, `shv_fy_date`, `shv_fy_int`, `shv_fy_text`, `shv_fy_entries`,
`shv_fy_manual_total`, `shv_fy_records`, `shv_fy_lane`, `shv_fy_history`,
`shv_fy_view`.

### The honesty rules the deck is built on

- B2B achieved = `partners` rows with `status = approved`. **Pending KYC
  applications are shown separately and never counted.**
- Retail achieved = `users` rows with `role = customer`. **Buyers (with an
  order) are reported separately; cancelled orders do not make a buyer.**
- On top of that: the owner's **opening baseline** for 1 Apr 2026 and his **own
  ledger rows** — and a ledger row is **refused unless its source is named**
  ("counts are NEVER invented"), the same law the catalogue importer applies to
  weights and purity.
- The growth curve comes from real `joined` / `appliedAt` / `createdAt` stamps.
- **No recorded growth ⇒ no projection is invented** — the verdict reads
  *"No growth logged yet"*.
- Targets/dates are range-checked; a past finish line, an FY opening after the
  finish line, fractional or absurd values are refused; corrupt stored values
  are re-typed on read.

**New asset `cms/css/v183.css`** — every rule scoped inside `.fy-deck`, with
`prefers-reduced-motion`, phone (`≤620px`) and `@media print` variants, loaded
with the **v117 preload-swap + noscript** pattern so an admin-only stylesheet
never sits in a shopper's blocking paint path. It is the **last sheet** in
document order and is precached by the worker.

**Storage:** `fyTargets` (config) + `fyEntries` (ledger) are **JSON
collections** in v183 — the precedent is `khata` / `cashbook` / `savingsPlans`.
**No new MySQL schema**, so the deck needs no reconciler run of its own.
Moving them to MySQL is a deliberate later step, not an oversight.

**Stamps:** 183 lockstep — `__SHIVAA_REL=183`, `APP_REL = 183`,
`shivaa-shell-v183`, `REL = 183`, `'rel' => 183`; 58× `?v=183` in
`index.html`, 52× in `sw.js`; **MEDIA stays `shivaa-media-v168`**.

## 3. Verification actually run (executed, not parsed)

| Suite | Result |
|---|---|
| `deploy-approval-check.js` | 20/20 |
| **`v183-check.js`** (new) | **11/11** — S10/S11 **execute the shipped `js/admin.js` in jsdom**: two lanes with 700 / 1,100, the seconds cell **actually ticking**, ledger + source, settings form values, growth curve, and a signed-out visitor getting only the sign-in card with **no** figures |
| **`v183-php-run.js`** (new) | **12/12** — the real `api.php` under PHP 8.3: admin gating (403 + no leak), the 700/1100/30-Mar-2027 defaults, derived counts, the source law, undo, target/date validation, honest pace/projection, curve arithmetic, corrupt-config tolerance |
| `v182-php-run` · `v181-php-run` · `v180-php-run` · `v179-php-run` | 9 · 6 · 8 · 25 |
| `v169-check` · `v169-php-run` · `v168-check` · `v168-php-run` | 25 · 28 · 39 · 12 |
| `v182-check` · `v181-check` · `v180-check` | SKIP-forward (stamp-exact, superseded by 183) |
| `node tools/mega/php-sweep/sweep.mjs` | **226 routes · 0 exceptions** |
| `npm run test:regression` | 44 suites passed · 24 retired skipped · 0 failed |
| Both new suites **+ 8 legacy suites re-run on the unzipped ZIP overlay** | all green |

Two of my own test assertions were wrong on first run and were fixed as test
bugs, with the reasons recorded: `{fyStart:'2028-01-01', deadline:'2029-01-01'}`
is a **valid** configuration (200 is correct), and the progress rail's
`data-w` is `"9.0"`, not `"9"`. Neither was a product defect.

**Known environmental failure — not a regression:** `v179-relay.js` is **0/7 in
this sandbox** because it needs the live MCX socket. Proven pre-existing by
running it in a separate `git worktree` at the untouched base commit `2e063ee`
(release 182) — identical 0/7. Do not "repair" relay code because of it.

## 4. Package

**`shivaa-update-v183.zip`** — 7 files, **471,325 bytes**, SHA-256
`20509869515bfae9931b504b79edf59f5479d1081203a21f942802d2ab4b40e3`,
source commit `557662e`, builder `tools/mega/make-v183-zip.py`.

`api.php` · `js/admin.js` · `css/v183.css` (new) · `index.html` · `js/app.js` ·
`sw.js` · `upgrade-sql.php` (**unchanged from v182** — carried so a live site
still on 181 is complete after one install; skip that step if v182 already ran
it). Install ritual: `DEPLOY-v183.md`.

## 5. Preview tooling changed (dev only)

`tools/preview-server.js` now serves a **fixture** FY deck (derived from the
repo's `db.json`), a preview admin sign-in (any password), and stamps **every**
served page with a *"Local preview · fixture data · not the live store"*
ribbon. **Never quote preview numbers as live numbers** — the authoritative
implementation is `cms/api.php`, exercised for real by `v183-php-run.js`.

## 6. Forward-only + owner actions

- **Live is 181. Next deploy is ≥ 183. Never deploy an older tree.**
- **Owner action:** an explicit yes before any live install (house policy —
  a merge or a push is not deployment approval).
- **Owner action, once installed:** set the **opening counts** for 1 April 2026
  in Mission settings so the run-rate, the curve and the projection measure the
  year honestly instead of from zero.
- Still open from v182: the billing app zip (`public_html/billing/`) and the
  first real batch through Catalogue Intake.
