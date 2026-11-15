# NEXT-CHAT-HEAD — paste this first in every new chat

**Written 12 Nov 2026 (Asia/Calcutta), after v247 was packaged.**
**Newest release: v247 “Atelier”** — packaged, awaiting the owner's yes; it contains v237–v246.
**Next release: v248.** Session branch: `arena/95be65a4-shivaa-ecom`.

**Branches (read this once):** this session works on `arena/95be65a4-shivaa-ecom`. The ledger's stored
`release_branch` field still says `arena/e8a470c6-shivaa-ecom` — that is the name an earlier session wrote
into `docs/release-ledger.json` and `qa/check-handoff.py` pins it, so it stays; it is **not** a branch to
switch to. Never switch, create or push a branch other than the session branch.

**The package to install:** `shivaa-update-v247.zip` · **761 files** · **45,038,330 B** · sha256
`6ca456deaacfcf523f2f151e46b3b0700c0252c18387a6abe4d153e99e3214c5`. It is the only zip to install.

**Why v247 exists.** v246 answered *“doesn't load everything fast”* with bytes. The owner then wrote
*“it is better than before but still not as perfect as I want a smooth UI UX experience for my customers,
make it like a premium designer”*. So v247 is about how the page feels, and the feeling was being spent on
decoration:

1. **A page at rest was paying for it.** `will-change: transform` + `transform-style: preserve-3d` on ten
   card families, a **base** `transform: scale(1.08)` on every card photograph, `.pc-body{translateZ(10px)}`
   on the text inside every card, and a **24 s infinite Ken Burns** across the whole first screen.
   Measured on the home screen: **37 elements in a 3D context / 23 compositor layers → 1 / 14** (and the 14
   are magnetic-press buttons, which a thumb cannot use — the phone drops those too).
2. **v215 hid every content image by default** (`opacity:0` until motion.js adds `.img-ok`). Any picture
   that missed that class was invisible for good. The fade now works from the visible side: visible from
   the start, animated in on its own `load`, 4 s failsafe.
3. **Touch answers in 90 ms** — no grey tap rectangle, `touch-action: manipulation`, press feedback,
   `:focus-visible` rings, and a **16 px input floor** so iOS never zooms the page on focus.
4. **One motion vocabulary** (`--sx-*` tokens), opacity/transform only, balanced headline wrapping,
   tabular numerals for money, a 240 ms route rise, `prefers-reduced-motion` last so it wins, and
   `?nofx=1` kills the whole layer.

**Speed in this release.** The home screen paints at **700 ms** when the device already holds the
catalogue, instead of waiting for the gold-rate call; the price slot is a **skeleton** (never ₹0, never
₹NaN) and the `rates` event patches every `.js-price` in place. The **6 s** ceiling still stands for a cold
device, a deep link and every other route. The campaign banner (167 KB) and nine film posters (450 KB) got
560/320 webp siblings — the phone home screen is **1.46 MB** of image markup, from **5.11 MB** at v245.

**Two real bugs found while measuring:** the trending strip and the recently-viewed strip printed **₹NaN
on every card** — the API's `price` field is an object (`{metalValue, gst, total…}`) and both templates did
`Math.round(x.price)`. Both now price through `moneyOK()/priceHTML()`.

**HARD RULES (each one is a release that broke something):**
- never `content-visibility` (froze the owner's phone), never `overflow-x: hidden` on `html/body`;
- never write `images[0]` into `src=` — every picture goes through `thumbAttrs()`;
- never add a `<script>` per layer: add it to `tools/js-bundle-order.txt` and rebuild `rel.js`;
- never leave an image invisible by default, and never `will-change` a card at rest;
- never edit `css/shivaa.css` or `js/rel.js` by hand — they are generated
  (`tools/build-css-bundle.py --write` / `tools/build-js-bundle.py --write`).

> ⚠ **No per-release gate script exists.** `t-v247-premium` (**53/53**), `t-v246-light` (58/58),
> `t-v245-scroll` (39/39), `t-v244-butter` (54/54), `t-v243-header` (36/36), `t-v242-taps` (40/40),
> `t-v241-perf` (43/43), `t-v240-rip` (16/16) and `check-handoff.py` (229 checks) are green — **339 browser
> checks**. jsdom sweep of 8 routes × phone/PC: 0 page errors, 0 hidden pictures, no NaN.
>
> **jsdom has no scroll engine, no compositor, no animation clock and no network.** Layer counts, byte
> counts and the cascade are real here; the *feel* is the owner's device. Never explain away his report
> with numbers from this sandbox.

**If he still says it feels heavy:** ask for `?perfdiag=1` + the phone model, then check (1) is
`rel.js?v=247` the script in the Network tab, (2) does `window.Shivaa.v247.audit()` report
`compositedLayers` ≤ 15, (3) the `/api/rates` round trip, (4) `?nofx=1` to remove every animation from the
picture. Next candidates if it is still not enough: minify `app.js` (254 KB gzip) behind the same build
tool that makes `rel.js`, split the first paint's CSS out of the 955 KB bundle, and replace the intro
preloader with a skeleton that matches the home layout exactly.

---

## Paste block (start of a new chat)

```
Repo: theunreal8055-coder/Shivaa.ecom — branch arena/95be65a4-shivaa-ecom.
Read AGENTS.md (CURRENT STATE first) and docs/NEXT-CHAT-HEAD.md before anything.
Run: bash qa/where-am-i.sh   → exit 0 = FORWARD, exit 3 = behind (stop, move to the branch it names).
Then: python3 qa/check-handoff.py ; node qa/browser/t-v247-premium.mjs ; node qa/browser/t-v246-light.mjs ; node qa/browser/t-v245-scroll.mjs
Newest release: v247 "Atelier" (packaged, not installed). Next number: v248.
NEVER content-visibility, never overflow-x:hidden on html/body, never hide an image by default,
never will-change a card at rest. Every picture goes through thumbAttrs().
Add behaviour layers to tools/js-bundle-order.txt and rebuild rel.js — never a new <script> tag.
Only the owner deploys. Reply to him in simple Hinglish.
```
