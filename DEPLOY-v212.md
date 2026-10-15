# DEPLOY-v212.md — release 212 · "THE CLARITY RELEASE" · every tap turns the card

Status: **READY — owner approval required before anything is taken live.**
A push, a green test run, or a finished zip is **not** approval. Live today is
**v205** (WWW + Netlify). If anything higher than 212 is live, stop.

**Read `DEPLOY-v205.md` first — owner gotchas, bind-shell ladder, zero-config
deploy. Drop-in replace root with `cms/` (same shape). Then `purge` before
`activate`.** This package carries v206 → v212 and includes the **film files**
(`images/films/` — 18 media files).

---

## 1 · The owner's orders → what was wrong → the fix

### ① "Tap the card to see the reverse / front is not working and not visible — every tap should turn the card, every tap again should turn it again"

The flip MECHANISM was sound (verified: three taps flip-flip-flip in the test
harness). What killed it on real screens was the AROUND-IT:

1. **Covered tap area** — the "Active through…" status pill and the
   "discover" scroll cue were stacked ABOVE the card and ate taps at the
   card's lower corners; the big stage glow could intercept pointer events
   too. Now: every decorative layer is `pointer-events: none`, the interactive
   chrome drops BELOW the card, and **the entire card area is the tap
   target** — any tap on the card, its padding or the hint row turns it.
2. **Invisible hint** — "Tap the card to see the reverse" was 11px ghost
   text under the card where the cream certificate panel passed behind it.
   Now it is an unmissable **gold pill button** (solid dark, gold border,
   13px bold) that flips the card too.
3. **Tap friction** — taps on the card's text could start a text-selection
   or double-tap-zoom gesture and the click never arrived. The card is now
   `touch-action: manipulation`, selection-off, tap-highlight off: the tap
   lands instantly, every time.

Result: tap → turns · tap again → turns again · forever, on phone and laptop.

### ② "The four offer button banners: graphics unclear, text overlaps the art — make them perfect and artistic"

v210 painted a large art circle BEHIND the words — in the four-column grid
the words sat on the artwork and both read as mush. v212 restructures every
panel into two strict zones:

- **an art band on top (its own 104px strip, no text ever enters)** with a
  single large, crisp motif: the Black Card with gold chip (making), the
  ribboned parcel (delivery), the struck gold medallion (Premium), the red
  wax seal with ribbon tails (Certificate);
- **a clean typographic column below**: badge, big serif number, one-line
  offer, description (code chip inline for FREEDEL), and the CTA pinned to
  the panel floor.

Overlapping text is now structurally impossible; the long "Prestigious
Member Certificate" title has its own size step so it can never overflow.

## 2 · Files

- `cms/css/v212.css` — flip visibility/tap physics + the two-zone offer
  gallery.
- `cms/js/app.js` — whole card-wrap is a flip tap target (delegate widened).
- Stamps: 212 in index.html (84× `?v=212` + `__SHIVAA_REL=212` + v212.css),
  sw.js `shivaa-shell-v212` / REL 212 / SHELL_FILES incl. `/css/v212.css?v=212`,
  app.js `APP_REL`, api.php `'rel' => 212`.
- `images/films/` — still inside the zip (18 files).

## 3 · Verification (run before packaging)

| Check | Result |
|---|---|
| `qa/browser/t-v209-alive.mjs` (incl. S3d: three real taps flip ↔ unflip ↔ flip) | **PASS 62 / FAIL 0** |
| `qa/browser/t-v206-flip.mjs` | **ALL PASS** |
| `qa/browser/t7-audit.mjs` | **PASS 4/4** — 51 routes, 152 buttons, 30 product controls, 0 real errors |
| `node --check` app.js / v125.js | OK |
| v212.css braces | balanced (73/73) |

## 4 · Deploy steps (when — and only when — the owner says yes)

1. Confirm live is < 212.
2. `cms/` tree from `shivaa-update-v212.zip` → domain root (`images/films/`
   included — let it arrive).
3. `purge` then `activate`. Visitors pick up `shivaa-shell-v212`.
4. Smoke: on the home hero, tap the Black Card — it turns; tap again — it
   turns back; the gold pill under the card says which side is next and is
   clearly visible; the four offer banners show art on top, words below,
   nothing overlapping.

## 5 · Rollback

If anything is live newer than 212, stop. Previous good zip:
`shivaa-update-v211.zip` (sha256
`97e1889c441c5f1a4da7b54ac4c6cd30ea34d5689988ed3474890eab2f463d97`).
Live baseline remains v205. Never renumber; fix forward as v213.

---

Built from `arena/09f3c79f-shivaa-ecom` on 2026-10-13. Zip:
`shivaa-update-v212.zip` — 337 files, 36,297,001 bytes. sha256:
`e5210de3e41996a9c7755626bae7bbed68335855186ba75e685076ca299d0702`

Owner download link:
`https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/09f3c79f-shivaa-ecom/shivaa-update-v212.zip`
