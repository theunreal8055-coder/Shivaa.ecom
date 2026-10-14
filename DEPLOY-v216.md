# DEPLOY-v216.md — release 216 · "THE WOW RELEASE" · real artwork, phone films, an organised Black Card

Status: **READY — owner approval required before anything is taken live.**
A push, a green test run, or a finished zip is **not** approval. Live today is
**v205** (WWW + Netlify). If anything higher than 216 is live, stop.

**Read `DEPLOY-v205.md` first — owner gotchas, bind-shell ladder, zero-config
deploy. Drop-in replace root with `cms/` (same shape). Then `purge` before
`activate`.** This package carries v206 → v216 and includes the **film files**
(`images/films/` — 18 media files) and the new offer artwork (`images/offers/`).

---

## 1 · The owner's orders → what was wrong → the fix

### ① "The four offer banners look like a cartoon — make them a wow"

The four banners were drawn from CSS shapes: a rotated rectangle, a gold
dash, flat colour. That is clip-art, not luxury.

- Each banner now carries a **finished painted artwork** (`images/offers/art-making.jpg`,
  `art-delivery.jpg`, `art-premium.jpg`, `art-cert.jpg`): velvet, gold
  filigree, light and gold dust — no text, no people.
- A soft gold hairline inset and a bottom vignette make the artwork sit
  inside the card like a jewellery box lid.
- One **slow light sweep** crosses the band every 7.2 seconds, and the
  artwork lifts a few percent when you point at it. Both are transform-only
  (compositor), so they never flicker.
- The old drawn shapes are switched off on all four banners.

### ② "The case films are still not available on mobile"

Three releases tried to fix this from the outside. The real cause is on the
phone itself: phones decode only a few videos at once. The case mounts all
four films and asks them to play together, so on a phone the extra films
stall or are dropped — they stay as a still frame, which reads as "not
available".

v216 gives the phone a playback rule that holds up:

- **On touch screens only the FRONT film plays.** The other three show their
  poster (all four are visible), and each one plays the moment it is brought
  round — by drag, by the arrows, by the thumb rail, or by tapping it.
- Tap the front film to open it full screen with sound, as before.
- Laptops are unchanged: all four films keep playing together, as approved in v210.

This is a deliberate change for phones only. If the owner wants all four
playing on phones too, that is a separate decision and needs a yes.

### ③ "The card in the first hero banner is not organised"

The Black Card in the first banner had too many things competing:

- a tilted card (-2.4°), two floating animations stacked on the same element,
  a drop-shadow filter and a blurred floor glow;
- the certificate chip and the status pill were placed **on top of** the card.

v216 turns the hero into one clear column:

1. the Black Card — one calm float (up and down, with a whisper of tilt);
2. the Shivaa Family certificate, directly beneath, with its own space;
3. the "Active through …" status line beneath that.

Nothing overlaps, nothing is tilted, and the blurred floor glow is gone.
The card still shows its front and reverse exactly as before (flip stays removed).

## 2 · Files

- `cms/css/v216.css` — new release layer: offer artwork + sheen, hero column,
  single float.
- `cms/js/v125.js` — `coarse()` + `canPlay(c)`: phone films play the front one only.
- `cms/images/offers/` — four new artwork files (~740 KB total).
- Stamps 216 everywhere: `index.html` (87 × `?v=216`, `__SHIVAA_REL=216`,
  `v216.css` link), `sw.js` (`shivaa-shell-v216`, REL 216, SHELL_FILES incl.
  `v216.css`), `app.js` (`APP_REL = 216`), `api.php` (`'rel' => 216`).

## 3 · QA — on this tree

| Suite | Result |
|---|---|
| `qa/browser/t-v209-alive.mjs` | **PASS 103 / FAIL 0** — incl. S3h v216 (offer artwork wired, cartoon shapes off, sheen transform-only, hero column, phone gate, stamps) |
| `qa/browser/t-v206-flip.mjs` (no-flip guard) | ALL PASS |
| `qa/browser/t7-audit.mjs` | **PASS 4 / FAIL 0** — routes render · 152 buttons · 0 errors |

Note: the QA run used a synthetic 14-product fixture (the real catalogue is
not in the repository), so route and product-control counts differ from the
live site. Visual checks (artwork look, hero spacing, phone film playback on
a real device) were **not** possible in this sandbox — please look on a real
phone and laptop before approving.

## 4 · The package

- `shivaa-update-v216.zip` — **345 files · 37,054,705 bytes · sha256
  `f2b1701487163d78a7261a10d138824baae21a0e6509c815c8c635d3dddc0954`**
  (contents of `cms/`, flat, includes `images/films/` 18 media and `images/offers/` 4 artwork files).
- Download: `https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/09f3c79f-shivaa-ecom/shivaa-update-v216.zip`
- Rollback rung: `shivaa-update-v215.zip` (sha256 `22307874…dd92`), then v214 (`feb7dd42…ed70a`).
  Never roll live back past what was deployed; never deploy an older tree over a newer one.

## 5 · Deploy (owner only — same recipe as v205)

1. Download the v216 zip above.
2. Extract — the folder contents are the site root.
3. Drop them in at the domain root (replace existing, same shape as v205).
4. Then `purge`, **then** `activate`.
5. Check on a phone: the four banners show artwork and a light sweep; the
   case's front film plays, and dragging or tapping brings each of the other
   three forward to play; the hero card, certificate and status line stack cleanly.

Nothing goes live without the owner's explicit yes.
