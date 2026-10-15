# DEPLOY-v218.md — release 218 · "THE SIGN-IN RELEASE" · funnel stays put, case removed, sidebar back, Passport redesigned

Status: **READY — owner approval required before anything is taken live.**
A push, a green test run, or a finished zip is **not** approval. Live today is
**v205** (WWW + Netlify). If anything higher than 218 is live, stop.

**Read `DEPLOY-v205.md` first — owner gotchas, bind-shell ladder, zero-config
deploy. Drop-in replace root with `cms/` (same shape). Then `purge` before
`activate`.** This package carries v206 → v218 and includes the film files
(`images/films/`) and the offer artwork (`images/offers/`).

---

## 1 · The owner's orders → what was wrong → the fix

### ① Highlight the "Enter 10g Gold Scheme Funnel" button

The entry button on the home campaign card (`.shv-hcc-cta-row a.btn-gold`) is
now the strongest call to action on that card: a larger target (60 px, 62 px on
phones), a deeper gold shadow, and a gold halo ring that breathes outward. The
halo runs on transform and opacity only, so it adds no paint cost to the page.
It stops for visitors who ask for reduced motion.

### ② Stop the jump to the top

**Root cause (found in the code):** `renderSchemeStage()` in `cms/js/app.js`
ended with an unconditional `window.scrollTo({ top: 0 })`. Every answer in the
10 g funnel therefore threw the shopper back to the top of the page.

**Fix:** the funnel scrolls only when the active step has moved off screen (above
the viewport, or far below the fold), and then only to bring the step's top just
under the header. It never scrolls on the first paint. A jsdom test steps through
the funnel and confirms no top-of-page scroll is issued.

> Caveat: the v217 auto-refresh suspects (content-visibility on home sections)
> were fixed in v217 and are **not** proven in a real browser. This sandbox has no
> real browser or phone, so the scroll behaviour on a device is unverified.

### ③ Restore the sidebar to its earlier look and make it fully work

- The v217 drawer override is removed. The sidebar is again the base drawer from
  `styles.css` (the look owners approved before v217).
- New in `initDrawer` (`app.js`): **swipe left to close** the open menu. It is a
  passive listener, so it never blocks scrolling, and a mostly-vertical gesture
  does not close the menu.
- Verified in jsdom (`qa/browser/t-v218-sidebar.mjs`, 13/13): the hamburger opens
  and closes it; the close button, the scrim, Escape and choosing a link each
  close it; a left swipe closes it; an up/down gesture keeps it open.

### ④ Remove the case permanently

Removed everywhere it was still wired:

- the `#svCaseMount` section in `app.js` (home page);
- the `ShivaaCase217.mount` call in `v125.js` (the Gold Thread still mounts);
- `cms/js/v217-case.js` (**deleted**);
- its `<script>` tag in `index.html` and its precache entry in `sw.js`;
- the case rules in `cms/css/v217.css`.

The QA suite now asserts the case is **absent** (S2, 3e, 3f, 3g, 3h) instead of
asserting it works.

### ⑤ Redesign the Retail and Jeweller B2B sign-in sheet (Shivaa Passport)

- New layer `cms/css/v218.css`, scoped under `#shvAuthWrap`, with explicit resets
  for every property it sets. It overrides the stacked rules from styles.css,
  mobile.css, motion.css, v186.css and v209.css for this sheet only.
- One layout for both doors: a header row (emblem · title · close); two equal
  door tabs with a clear selected state (the B2B door carries a plum accent); a
  label → field → helper → primary-action rhythm; fields of one height and
  radius (16 px text, so iPhone does not zoom); a full-width gold primary action
  in the same place on both doors; secondary links in one row beneath it; fine
  print left-aligned; a footer with the security note and "Need help?".
- Phones: the sheet rises from the bottom edge, full width, and scrolls inside
  itself.
- The error box uses `.shv-err[hidden]` with `display: none !important`, so an
  empty error never leaves a blank panel.
- **No JS changed.** `cms/js/auth.js` keeps every ID and handler (`#shvStartForm`,
  `#shvPhoneIn`, `#shvPhoneBtn`, `#shvJwForm`, `#shvJwEm`, `#shvJwPw`,
  `#shvJwBtn`, `#shvEye3`, `#shvJwApply`, `#shvJwForgot`, `#shvSavedGo`,
  `#shvSavedX`, `#shvHeadSub`, both panes).
- Verified in jsdom: the sheet opens; the B2B door shows only the jeweller pane
  and the Retail door only the retail pane; error boxes start hidden; all IDs
  exist.

> Caveat: how the sheet looks on a real phone or laptop has **not** been seen.
> Please check both doors on a phone before approving.

### ⑥ Delivery

Stamped 218 everywhere: `index.html` (`?v=218`, `__SHIVAA_REL=218`, new `v218.css`
link), `sw.js` (`shivaa-shell-v218`, `REL = 218`, `v218.css` precached), `app.js`
(`APP_REL = 218`), `api.php` (`'rel' => 218`). Both countdown documents now show
the next release as **v219**.

---

## 2 · QA run before packaging (headless jsdom only)

| Check | Result |
|---|---|
| `node qa/browser/t-v209-alive.mjs` (alive suite) | **96 / 0** |
| `node qa/browser/t-v206-flip.mjs` (flip guard) | **ALL PASS** (no flip anywhere) |
| `node qa/browser/t7-audit.mjs` | **4 / 0** |
| `node qa/browser/t-v218-sidebar.mjs` (sidebar + funnel scroll) | **13 / 0** after the funnel fix |
| `node --check` on app.js, v125.js, auth.js, sw.js, the alive and sidebar suites | clean |

Not run this release: the `probe-loop` and `probe-errs` probes named in the
handoff notes are not in the repository, so they could not be run.

**Not verifiable in this sandbox:** any real browser, phone, or visual layout.
Scroll feel, sidebar animation, the halo, and the sign-in look all need a human
check on a real device.

---

## 3 · Package

- `shivaa-update-v218.zip` — **347 files · 37,055,557 bytes · sha256
  `9faec9d6e415d555dcf54a0865ff492a5f34f163ed476936902428b710052a1d`**
- Same file list as v217, with `js/v217-case.js` removed and `css/v218.css` added.
- Includes `images/films/` (18 files) and `images/offers/` (4 files).
- Link: `https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/09f3c79f-shivaa-ecom/shivaa-update-v218.zip`
- Rollback rung: `shivaa-update-v217.zip` (sha256 `cd38679f…c64060`), then v216
  (`f2b17014…0954`). Never roll back over a newer live release without the
  owner's say-so.

---

## 4 · Known leftovers (harmless, unreachable)

- `v125.js` still holds the old `mountCase` code, which is now never called.
- Case rules remain in the older layers (v213–v216). They match no element in the
  page, so they do nothing. A later clean-up release can strip them.

---

## 5 · Deploy steps (after owner's explicit yes only)

1. Download `shivaa-update-v218.zip`; check the sha256 above.
2. Replace the site root with the zip's contents (same shape as `cms/`).
3. Purge the CDN cache **before** activating.
4. Open the home page on a phone and a laptop: check the 10 g button, the
   sidebar (open, close, swipe), the funnel steps (no jump to top), that no case
   appears, and both sign-in doors.
