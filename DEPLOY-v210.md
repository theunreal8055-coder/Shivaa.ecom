# DEPLOY-v210.md — release 210 · "THE GALLERY RELEASE" · films that run, offer banners as art

Status: **READY — owner approval required before anything is taken live.**
A push, a green test run, or a finished zip is **not** approval. Live today is
**v205** (WWW + Netlify). If anything higher than 210 is live, stop.

**Read `DEPLOY-v205.md` first — owner gotchas, bind-shell ladder, zero-config
deploy. Drop-in replace root with `cms/` (same shape). Then `purge` before
`activate`.** This package carries v206 → v210 plus, for the first time, the
**film files themselves** (see below).

---

## 1 · The owner's two orders → what was wrong → the fix

### ① "Turn the case feature — the 4 videos are not working"

Three real problems, all now fixed:

1. **The film files were never in any update zip.** The case reads
   `/images/films/film-01..04.mp4` (+ posters) and the Gold Thread reads
   `thread-01..05` — but every update file so far shipped code only. If those
   files are missing on the host (or were never uploaded), the case shows
   dead, dark cards forever — which is exactly "the 4 videos are not working".
   **This zip now contains all 18 film files** (case + thread, ~11 MB), so a
   plain drop-in deploy is guaranteed to have them.
2. **Only the front film used to play.** The old design paused the three side
   films ("ONLY THE FRONT FILM PLAYS"). The owner expects **all four
   autoplaying** — so now every film runs its muted loop whenever the case is
   on screen (paused the moment you scroll it away — data discipline kept;
   save-data mode still shows posters with a gold "▶ Tap to play" badge so a
   card is never dead-looking).
3. **Playback could stall silently.** Videos now carry `autoplay loop muted
   playsinline` + `preload=auto`, retry `play()` on `canplay`/`loadeddata`,
   and one touch anywhere on the case wakes every film (the gesture-unlock
   some browsers need). The self-tour, drag, arrows and tap-to-spin from v209
   are unchanged.

### ② "The home page 4 offer banners are very simple and not artistic"

The four boxes are now **four small art panels**, not four identical tiles:

- **20% off making (Black members)** — obsidian atelier: gold rays behind a
  tilted Black-Card silhouette with a glowing ✦, foil "20%", gold ribbon badge,
  engraved corner, bordered gold CTA.
- **Free home delivery (FREEDEL)** — cream festive parcel-post: a tied parcel
  with ribbon on a warm sunburst, deep-maroon ribbon badge, dashed ticket
  chip around the FREEDEL code, maroon foil "FREE".
- **Premium card** — midnight gold: a struck medallion with engraved ✦, bronze
  glow "20% for life", gold CTA.
- **Prestigious Member Certificate** — parchment: a red wax seal with serif
  "S", italic foil title, engraved corners, seal-ribbon CTA.

All four: engraved double-frames, staggered one-shot rise-ins, hover lift +
shine sweep (once, on hover — the infinite sweeps stay dead for the v209
anti-flicker rule), and every text colour kept at or above the v207
readability pass on its new ground.

## 2 · Files

- `cms/css/v210.css` — the gallery layer (offer panels + film tap badges).
- `cms/js/v125.js` — all-four autoplay, canplay retries, gesture unlock,
  tap-to-play badge in save-data mode.
- `cms/js/app.js` — art/ornament hooks in the three offer-card templates
  (copy, links and class names unchanged).
- `images/films/film-0*` + `thread-*` — **18 media files now ship in the zip.**
- Stamps: 210 in index.html (82× `?v=210`), sw.js SHELL `shivaa-shell-v210`,
  app.js `APP_REL`, api.php `'rel' => 210`.

## 3 · Verification (run before packaging)

| Check | Result |
|---|---|
| `qa/browser/t-v209-alive.mjs` (owner-complaint suite, incl. new art + autoplay assertions) | **PASS 38 / FAIL 0** |
| `qa/browser/t-v206-flip.mjs` | **ALL PASS** |
| `qa/browser/t7-audit.mjs` (every route & button) | **PASS 4/4** — 51 routes, 152 buttons, 30 product controls, 0 real errors |
| `node --check` app.js / v125.js | OK |
| v210.css braces | balanced |

## 4 · Deploy steps (when — and only when — the owner says yes)

1. Confirm live is < 210.
2. `cms/` tree from `shivaa-update-v210.zip` → domain root. **The films folder
   `images/films/` is included this time — let it overwrite/arrive.**
3. `purge` then `activate`. Visitors pick up `shivaa-shell-v210`.
4. Smoke: home case shows four films **all moving** (front wears the gold
   stage); drag/arrow/tap turn it; the four offer banners look like art
   panels on phone and laptop.

## 5 · Rollback

If anything is live newer than 210, stop. Previous good zip:
`shivaa-update-v209.zip` (sha256
`945875618c264d89b688925cea02fdc34540068641d8e803c1a18c1c934b411b`).
Live baseline remains v205. Never renumber; fix forward as v211.

---

Built from `arena/09f3c79f-shivaa-ecom` on 2026-10-12. Zip:
`shivaa-update-v210.zip` — 335 files, 36,287,804 bytes. sha256:
`5a395c99e73367df122cd1a11aa88c83523b09f3156d6d91417699e349e3046c`

Owner download link:
`https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/09f3c79f-shivaa-ecom/shivaa-update-v210.zip`
