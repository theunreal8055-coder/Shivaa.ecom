# DEPLOY-v232.md — Shivaa Ecom · v232 "The Idle Release"

**Deploy this one.** It contains everything since the live site: v229 (Shivaa Black
control room, renewal, in-store bills, the certificate as a document), v230 (your two
reports), v231 (the graphics taken further) and v232 — the smoothness release you
asked for.

**What you said:** *"App is not feeling smooth, it should feel like buttery smooth and
ultra smooth, without decreasing the quality."*

So this release did not add motion. It measured the app first, found the work nobody
needs, and removed it. Nothing was made plainer: every effect that stayed is the same
effect, and the two places where something was switched off are places where the
effect could not be seen in the first place (both proved with numbers, below).

**Status: built, gate green (23 checks, 0 red), pushed — NOT LIVE.** Live is still
**v228**. Nothing deploys without your haan.

---

## 1 · The measurement (what the app was doing while nobody touched it)

A silent home page — no input, no scrolling, nothing on screen moving — instrumented
in `qa/browser/t-v232-idle.mjs`:

| | before v232 | after v232 |
|---|---|---|
| animation frames asked for, per second | **123** | **0** |
| frames in the first 12 s of that page | **1264** | ~30 (the count-ups, which end) |
| of which from two loops that never stop | **1148** | 0 |
| `document.querySelector` calls inside those frames | ~2 per frame, forever | 0 when settled |
| layout reads for ten pointer moves over one card | 10 | **1** |
| layout reads for twenty more moves on a settled card | 20 | **0** |
| layout reads per touch event while a phone scrolls | 1 | **0** |
| permanent GPU layers on nine card families | one per element, forever | **0** |
| `backdrop-filter` readbacks on a phone, per card | 1 per card, per frame | **0** |
| gold-rate polls while the tab is hidden | 1 per second, forever | **0** |
| `<img>` literals that decode on the main thread | 56 of 68 | **0** (except the hero set) |

Two loops were responsible for almost all of it:

- **`_msTick`** — the bullion interpolator. It lerped the gold/silver ticker at 60
  frames a second **from the moment `app.js` parsed until the tab was closed**,
  whether or not a number was still moving, whether or not the tab was even open, and
  with **two `document.querySelector` calls inside every one of those frames**. The
  lerp settles in about thirty frames. The other ~200,000 frames an hour were pure
  tax on the one thread a thumb is scrolling with.
- **the cursor glow** — it wrote **`style.left` and `style.top`** at 60 fps forever: a
  forced layout of a 340 px `mix-blend-mode:screen` layer, every frame, with the mouse
  parked. (The layer is only shown on a fine pointer, but the loop ran everywhere.)

Both now run **only while there is something to move**, and both stop in a hidden
tab. The easing, the rounding, the text and the look are unchanged — the ticker still
glides between two rates, and this version lands **exactly** on the new number
instead of stopping 0.01 short.

---

## 2 · What v232 changes

### 2.1 One tilt engine instead of a listener per card

`bindTilt()` used to hang a `mousemove` on **every** `.p-card` / `.cat-card` /
`.poster` / `.testi` it was handed — a hundred-piece grid got a hundred listeners —
and each event ran `getBoundingClientRect()` and then wrote a transform: **a forced
layout and a paint per pointer event**, with no frame coalescing, so a mouse
reporting at 120 Hz bought 120 layouts a second.

`init3DCardTilts()` did the same for four more families **and hung a `touchmove` on
them** — that is a layout read per touch event *while the page is scrolling*, which is
the most expensive thing a phone can be asked to do under a moving thumb.

`bindMagnetic()` had the same disease on every primary/gold/outline button and on
every `.catlog`/`.testi`/`.acct-tile`/`.addr-card`.

There is now **one delegated listener per engine**, the rect is taken **once per card
visit** (a touch gesture takes it at `touchstart` and reuses it), and the write is
coalesced into **one frame**. A gesture that turns out to be a scroll **stands the
tilt down** instead of wobbling a card you are trying to scroll past. The selectors,
the degrees, the perspective, the 4 px lift, the 7 px/5 px magnetic pull and the
glare's two percentages are all **unchanged** — measured: one read for ten moves, and
zero for twenty more.

### 2.2 A press answer that has been dead on every phone since v226

v226 (the "butter" release) wrote a press answer for every card family:
`.p-card:active, .cat-card:active { transform: translateY(1px) scale(.985) }`.

But `styles.css:4637` has said this since v42:

```css
@media (max-width: 820px) {
  .p-card, .cat-card, .poster, .testi { transform: none !important; }
}
```

**An `!important` declaration beats a normal one whatever the order.** So on every
phone ≤ 820 px wide, the product card and the category card have **never answered a
finger** since that release shipped — and `v219.css:129` does the same to the offer
banner on coarse pointers (`transform: none !important` while the tilt class is on).

v232 restores all three with **v226's own values**, marked important for exactly the
reason v226 marked its anchor list, under both phone guards separately (a nested
media list inside an `and` is Media Queries 4, and a rule that silently fails to parse
is how the press went missing in the first place), and inside
`prefers-reduced-motion: no-preference` — with a block that turns it back off for a
reader who asked for no motion.

**What you will notice on a phone: tapping a product card or a category card now
pushes it about a pixel.** That is a missing answer coming back, not a new effect.

### 2.3 A layer only while an effect runs

Nine card families carried a **permanent** `will-change: transform`
(`styles.css:1532`) — a GPU layer reserved per element, forever, for a hover a finger
cannot trigger. v121/v139/v225 reset `.p-card` alone; the other eight were still
reserving one each. They are released now, promoted only while a pointer is actually
over the card (Chrome re-promotes by itself for the length of any transform
transition, so nothing is lost), and flattened on touch — the same treatment
`styles.css:4640` has given the four tilt families since v42.

### 2.4 A blur nobody can see, on every card in the catalogue

On a phone, **every product card's quick-view pill is permanently visible**
(`@media (hover:none){ .pc-quick{ opacity:1 } }`) **and carries
`backdrop-filter: blur(6px)` behind a fill that is already
`rgba(255,252,244,.96)`.**

Fourteen backdrop filters in this bundle sit behind a fill of 0.94 or more, where the
backdrop contributes at most 6 % of a pixel; the pill is the one that multiplies with
the size of the catalogue. On a phone it now carries no blur, and its fill is closed
from `.96` to `.98` — so it reads **more solid, not less**, its own text contrast is
unchanged, and a hundred cards stop asking the GPU for a hundred backdrop readbacks
on every frame of a scroll.

**What keeps its glass:** the header (blur 14 px behind a .92 fill — the signature of
the whole chrome), the sticky bars (`.pd-stickybar` .97, `.mnav` .97, `.mcta-bar` .97,
`#pdpBuybar` .96, `.kyc-bar` .97, `.shop-bar` .94, `.shv-scheme-stepper` .95), and the
pill itself on a **desktop**, where hover reveals it over a photograph.

### 2.5 Images decode off the frame, and a hidden tab stops polling

56 of the 68 `<img>` literals `app.js` renders — the gallery, the quick-view photo,
every cart thumb, every logo — left `decoding` at the browser default, which for bytes
that land while a thumb is moving can put the decode **on the main thread, inside that
frame**. One sweep at boot and one observer now ask every image for
`decoding="async"`, **except** the images that *are* the largest contentful paint
(`#preloader`, `.hero`, `.page-hero`, `.poster`, `.c-slide`, `.gal-track`, `[data-lcp]`)
and anything the markup marked `loading="eager"` / `fetchpriority="high"` — an async
decode on the hero can cost a frame of LCP, and this release is not allowed to buy one
kind of smooth with another.

The gold-rate poll also **stops while the tab is hidden** (it was asking the server
once a second, forever, and keeping the whole rates chain awake with it) and restarts
when the tab is read again — which the existing visibility handler already
anticipated.

### 2.6 What this release deliberately does NOT touch

`content-visibility`, again. v117/v121/v122/v214/v215 tried off-screen skipping with a
**fixed height guess**; the page height then changed as the shopper scrolled, the
browser lost its place, and the page jumped toward the top — the "it refreshes while
scrolling" you reported. v217 sealed it off (`#view *` is `visible !important` to this
day) and v232 leaves the seal alone. **Off-screen skipping is not worth that.**

---

## 3 · Stamps and the bundle (this exact tree)

| | |
|---|---|
| `cms/index.html` | 32 × `?v=232`, `window.__SHIVAA_REL=232` |
| `cms/sw.js` | 31 × `?v=232`, `shivaa-shell-v232`, `const REL = 232;` |
| `cms/js/app.js` | `const APP_REL = 232;` (792,237 B) |
| `cms/api.php` | `'rel' => 232,` (586,099 B) |
| `cms/css/shivaa.css` | **66 layers / 66 blocks**, 910,723 B raw / 179,425 B gzipped, still **one** stylesheet |
| `cms/css/v232.css` | new, 15,164 B — the 66th cascade position |
| new requests | **none** — the governors live in `app.js`, next to the loops they govern |

Package: **`shivaa-update-v232.zip`** — **361 files · 37,349,816 B**
sha256 `14b9e9ca24571b051ead061c64766a8675044cb09687f2195380975a5a4b4023`

---

## 4 · QA — the whole gate, serially, on this exact tree

`bash qa/v232-gate.sh` → **23 checks, 0 red**.

| phase | what | result |
|---|---|---|
| 0 | bundle proof (66/66, contiguous), `qa/phpbal.py` on api.php, `node --check` ×6, both member-percentage defaults | green |
| 1 | seventeen historic suites on the plain fixture | t7 4/0 · flip ALL PASS · alive 96/0 · sidebar 13/0 · depth 22/0 · billing-gone 13/0 · cleanup 34/0 · bundle 36/0 · smooth 39/0 · corners 64/0 · appfeel 80/0 · butter 61/0 · blackcard 28/28 · design 41/41 · reset 31/31 · play 52/0 · **idle 87/0** |
| 1b | `qa/v229-routes.py` (real HTTP: multipart, byte-identical stream, 401/403/409) | 61/0 |
| 2 | four stateful suites, each on a **fresh** staffed shim | bills 102/0 · ink 53/0 · cert 61/0 · black 88/0 |
| 3 | `playstore/verify.mjs` | exit 2 **by design** (the fingerprints are still placeholders) |

**The new suite is `qa/browser/t-v232-idle.mjs` (87 assertions, ~46 s, three boots).**
It counts animation frames in a silent three-second window (**at most one**, where the
same window asked for ~370 before) and then proves the counter is not a dead
instrument by counting the frames a real `mousemove` wakes. It instruments
`getBoundingClientRect()` and proves one read per card visit, one more when the
pointer moves to the next card, one more after a scroll, and zero for twenty moves on
a settled card — and the same for a magnetic button. It proves the v42 gate still
holds on a phone, that the decode governor swept 76 images and governs one inserted
after boot, that an eager image and a hero image are left alone, that a hidden tab
asks the server for nothing, and that reading it again brings the poll back.

Eight red lines on the first run of that suite, and **not one was the release**: an
anchor written against a comment in a string whose comments had been stripped; a
count taken against raw text in one half of a check and whitespace-normalised text in
the other; a passive-listener check written as a double negative; an `indexOf` where
the assignment appears twice (the check compared the wrong one); and two live checks
that measured the page before it had finished mounting late blocks, so unrelated
reads landed in the tilt tally. **A frame-cost assertion needs a settle longer than
the last late mount** — that is in the suite as a comment now.

### 4.1 What this sandbox could NOT test — check after deploying

- **No real browser and no phone.** jsdom computes no media queries, no compositor,
  no `backdrop-filter`, no `will-change` and no paint timing, so the cascade facts
  (§2.2, §2.4) are asserted **against the shipped bundle text**, and the frame counts
  are counts of `requestAnimationFrame` requests, not of real dropped frames. The
  press feel on a phone is the one thing only your thumb can confirm.
- **No PHP binary** — `api.php` is checked with `qa/phpbal.py` (brace/string balance)
  and by grep, not compiled. The API surface v232 touches is **none**.
- **No Java/keytool/Android SDK**, so the Play AAB is not rebuilt here; v232 changes
  no Android file and no version code.
- **No route to `shivaa.in`** — the live site is not reachable from this sandbox.
- **No printing, no canvas pixels** — the certificate's A4 download takes its
  toast-guard path in jsdom by design (unchanged since v229).

---

## 5 · How to deploy

1. Upload the **contents** of `shivaa-update-v232.zip` over `public_html` — a drop-in
   replace, same as every release. It adds **one** file (`css/v232.css`); everything
   else is an update of a file already there.
2. The **private bills folder stays where it is** — `.shivaa-private-bills` **beside**
   `public_html`, created by the server on the first upload. Do not put it inside the
   docroot, and do not copy it anywhere (`DEPLOY-v229.md` §2 has the details).
3. `data/db.json` and `config.php` are **not** in the zip and must never be
   overwritten.
4. After uploading, open `https://shivaa.in/api/version` — it must say **232**.
   Then hard-refresh once (the service worker moves to `shivaa-shell-v232` on its own;
   a stale tab keeps the old CSS until it is reloaded).
5. What to look for: tap a product card on your phone — it should **push in slightly**
   and come back. Scroll the shop — the quick-view pills should be flat and crisp, not
   glassy. On a desktop, move the mouse: the cursor glow should follow **without a
   lag**, and stop dead when the mouse stops.

**Rollback:** upload `shivaa-update-v228.zip` (the live tree, 357 files,
`c9975a92…fbab9`). Nothing in v229–v232 changes a database shape, so a rollback is
only a file restore.

---

## 6 · Still waiting on you (unchanged)

1. **Your haan for v232.** Nothing goes live without it.
2. **The bills folder** beside `public_html` — the only hosting step (v229).
3. **Play account type.** A personal account created after 13 Nov 2023 needs **12
   testers × 14 continuous days** before production.
4. **The UGC/reviews declaration (A/B)** — the one question in `playstore/PUBLISH.md`
   that needs your answer.
5. **Both SHA-256 fingerprints** into `cms/.well-known/assetlinks.json` (and only that
   file re-uploaded) — until then Chrome shows the address bar in the app.

---

## 7 · Where the code lives

Branch `arena/e8a470c6-shivaa-ecom`:

| commit | what |
|---|---|
| `c1ab1bc` | v232 code — the two sleeping loops, the tilt engine, the press restore, `css/v232.css`, the bundle at 66/66, stamps at 232 |
| `d006b87` | `qa/browser/t-v232-idle.mjs` |
| `096c1ef` | `bindMagnetic` joins the engine, the stale 60 fps comment, both countdown docs |
| (this commit) | the package, this note, `docs/NEXT-CHAT-HEAD.md`, `MEMORY.md` |

Nothing in this release is a revert: every change is forward from `036e616` (v231).
