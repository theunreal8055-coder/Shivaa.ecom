# DEPLOY-v240 — “The Ripple Fix” (the sidebar bug, root-caused)

**Package:** `shivaa-update-v240.zip` · **372 files** · **37,457,438 B** · sha256
`33f2916da9215d37befdbefa1c2d5b29e38354f90298502175366e9f112371d8`
**Site now:** v239 · **This release:** v240 (contains v237–v239) · **No other zip needed.**

---

## 1 · Why v238 and v239 did not fix it

Both of those releases treated the **row**: v238 pinned `width:100%`, v239 rebuilt the row as a grid
and forced the label to one line. The row was never the problem. **The thing inside it is.**

## 2 · The actual cause — found in the code

`v226.js` adds a tap ripple by appending an element into whatever was pressed:

```js
var s = document.createElement('span');
s.className = 'rip';
s.style.width = s.style.height = size + 'px';   // a drawer row makes this ~412 px
s.style.left = (x - r.left - size / 2) + 'px';
s.style.top  = (y - r.top  - size / 2) + 'px';
host.appendChild(s);
```

v226's own header says: *“`.rip` itself (size, position, `mRipple` keyframes) is motion.css's”*.

**It is not.** motion.css writes every one of those properties under **`.btn .rip`**:

```css
.btn .rip{position:absolute;border-radius:50%;transform:scale(0);pointer-events:none;…animation:mRipple…}
```

So a **button** ripples correctly, and **every other host gets a 412 px square in normal flow** — no
`position:absolute`, so `left`/`top` do nothing and the square is laid out as a normal element.

In the side drawer the host is a row (`display:flex`). The square becomes a **flex item**, the label
column (`.dw-tx{flex:1;min-width:0}`) is squeezed to a few pixels, every word breaks **one character
per line**, the row grows to ~550 px and everything below it is pushed off screen.

That is exactly the owner's screenshot, exactly why it happens **on tap**, and exactly why it happens
**only in the sidebar** (rows are the only flex row that contains a long two-line label).

## 3 · The fix

`cms/js/v240.js` — one file, no CSS layer, no bundle rebuild:

- **the rule that was always believed to exist**, applied where it cannot fight the button ripple:
  `.rip-live > .rip{position:absolute !important; border-radius:50%; pointer-events:none}`
  — `transform` and `animation` are **never** touched, so `.btn .rip` keeps its exact animation;
- a second guard for the drawer specifically: `.nav .nav-scroll .rip{position:absolute !important}`;
- any ripple span **already stranded** inside the drawer is swept out;
- **v239's inline grid/nowrap is reverted**, so the drawer keeps its designed flex layout.

## 4 · Locked by a test

`node qa/browser/t-v240-rip.mjs` → **16/16**:

- the scoping bug still exists exactly as described (`.btn .rip` only, no bare `.rip` rule);
- v240 carries the positioned rule **with `!important`** and **never** overrides `transform`/`animation`;
- v240 loads **after** `v226.js` and is precached by the worker;
- v240 sweeps stranded ripples and reverts v239's grid.

## 5 · What v240 also carries

- **v237** — 200 KB `/images/black/hero-v186.jpg` preloaded at `fetchpriority="high"` on every route
  (gone); product gallery now lazy after the first photo; accordion keeps the tapped summary in view.
- **v238 / v239** — the two earlier drawer guards (kept, harmless).

## 6 · What did NOT change

The stylesheet is untouched — one request, **70 layers / 70 blocks**. No route, price, money maths,
admin screen, schema, `.htaccess`, `config.php`, `data/` or `uploads/`.

## 7 · Apply

1. Hostinger → **File Manager** → `public_html`.
2. Upload `shivaa-update-v240.zip` → **Extract** into `public_html` (overwrite).
3. Delete the zip.
4. `https://shivaa.in/api/version` → expect `rel: 240`, `stamp.matched: true`.

## 8 · Check on the phone (one minute, and this is the real test)

- [ ] Open the drawer → **tap any row** → the row must **not** grow, no vertical letters, no blank space
- [ ] Tap 3–4 rows one after another → the menu stays exactly the same height every time
- [ ] Swarna Nidhi row: name on one line, “11 + 1 monthly gold plan” under it
- [ ] All rows below visible: Bespoke & Care, Design Selection, 10g scheme, For Jewellers, footer
- [ ] Buttons elsewhere (Add to bag, filters) still show their ripple — the button animation is untouched
- [ ] Hard-refresh once (worker swaps to `shivaa-shell-v240`)

## 9 · Rollback

Re-apply `shivaa-update-v239.zip`.

## 10 · Honest status

`node --check` clean on five scripts · `t-v240-rip.mjs` **16/16** · `check-handoff.py` **194 checks,
0 red**. **`bash qa/v240-gate.sh` was NOT run** — create it from `qa/v236-gate.sh` with the pins rolled
and take it to 0 red. There is **no browser engine in this sandbox** (jsdom has no layout), so the bug
was found by reading the cascade, and the fix is locked by a static test rather than a rendering test.
