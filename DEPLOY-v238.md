# DEPLOY-v238 — “The Drawer Guard”

**Package:** `shivaa-update-v238.zip` · **370 files** · **37,450,998 B** · sha256
`234f7b01326f58aa8fb4c9002658ef70888c8a91fc99964349fc9f09de48f556`
**Live now:** v236 · **This release:** v238 (it contains v237) · **v237 needs no separate install.**
Nothing is deployed by the agent, by a push or by a merge.

---

## 1 · The bug in the owner's screenshot

Android Chrome, side drawer open, mid-list:

```
S
w          ← the Swarna Nidhi row, one character per line
a
r
n
a   …
```

The row collapsed to about **150 px wide and 550 px tall**, every row below it (Bespoke & Care,
Design Selection, 10g scheme, For Jewellers, the footer) was pushed off the screen, and the drawer
looked like it had “expanded like crazy”.

**Why it happened.** That row's markup is byte-identical to the three rows above it — same classes,
same children. So the cause is the **cascade**, not the HTML. The label column is
`.dw-tx{flex:1;min-width:0}`: `min-width:0` is deliberate (it keeps long labels from pushing the
arrow off a row), but it also means that the moment any one of the **70 CSS layers** in the single
bundle resets a width or an alignment on `.nav-scroll`, that label is free to shrink to nothing —
and once a label is 20 px wide, every word breaks one letter per line and the row grows as tall as
its text.

## 2 · The fix — one file, no CSS layer, no new request

`cms/js/v238.js` (loaded on every page, does nothing until the drawer opens):

1. **A scoped guard**, `@media (max-width:860px)` only:
   - `.nav-scroll` is forced to be a column of **full-width rows** (`align-items:stretch`,
     `width:100% !important` on every direct child);
   - the label column keeps `flex:1 1 auto` and can never be squeezed to nothing;
   - `word-break:normal` + `overflow-wrap:break-word` + `hyphens:none` — a label wraps at spaces,
     never one letter per line;
   - the icon, glyph and arrow are `flex:0 0 auto` so they can never eat the label's width.
2. **A measurement, once per drawer open** — any direct row that still measures under **70 %** of the
   drawer's width gets an **inline** `width:100%`. An inline style outranks every layer in the
   bundle, including any layer added after this release, so the guard cannot be silently outranked
   in future.

It is progressive: without the file the drawer behaves exactly as it does today.

## 3 · What v238 also carries from v237 (already packaged, never applied)

- **200 KB on every page, unused.** `/images/black/hero-v186.jpg` was preloaded at
  `fetchpriority="high"` on every route although only `#/black-card` paints it. Preload removed;
  the CSS background still fetches it when that page opens.
- **A product page fetched its whole gallery at once.** First photograph keeps
  `fetchpriority="high"`, the rest are `loading="lazy" decoding="async"`. Fixed slide heights, so
  nothing shifts.
- **The accordion no longer moves the page.** `js/v237.js`: opening one answer closes its siblings
  and keeps the tapped `summary` below the sticky header.

## 4 · What did NOT change

- **The stylesheet is untouched** — one request, **70 layers / 70 blocks**, 910,723 B raw /
  181,498 B gzipped.
- No route, no price, no money maths, no admin screen, no schema, no `.htaccess`, no `config.php`,
  no `data/`, no `uploads/`. The bullion desk, the passbook and the bills vault are untouched.

## 5 · How to apply it

1. Hostinger → **File Manager** → `public_html`.
2. Upload `shivaa-update-v238.zip` and **Extract** over the site (overwrites in place, deletes
   nothing).
3. Delete the zip from `public_html`.
4. Open `https://shivaa.in/api/version` and tell the agent the `rel` number.

**Expected:** `rel: 238`, `stamp.matched: true`, `stamp.index/app/sw` all `238`.

## 6 · Checks after applying (three minutes, on the phone)

- [ ] `https://shivaa.in/api/version` → `rel: 238`, `matched: true`
- [ ] Open the drawer → **Swarna Nidhi row reads normally**, one line for the name and one for
      “11 + 1 monthly gold plan”, and **every** row below it is visible
- [ ] Scroll the drawer to the bottom → For Jewellers + the footer links are there
- [ ] Open a product → tap “Purity & hallmark evidence” → the panel above closes, the page does not jump
- [ ] Open a product → swipe the gallery → photographs appear as you swipe
- [ ] `#/black-card` still shows its dark hero photograph
- [ ] Hard-refresh once (the worker swaps to `shivaa-shell-v238`)

## 7 · Rollback

Re-apply **`shivaa-update-v236.zip`** — the release the site is running today. Never reach further
back; v236 contains everything before it. (v237 was never applied, so it is not a rollback target.)

## 8 · Honest status of this package

- `node --check` clean on `cms/js/app.js`, `cms/sw.js`, `cms/js/v237.js`, `cms/js/v238.js`.
- `python3 qa/check-handoff.py` — ledger ⟷ stamps ⟷ zip ⟷ docs, **0 red**.
- **`bash qa/v238-gate.sh` was NOT run.** It has to be created from `qa/v236-gate.sh` with the suite
  pins rolled to 238 and taken to 0 red before this zip goes on the server. The drawer bug could not
  be reproduced in this sandbox (no browser engine — jsdom has no layout), so the guard is built to
  be correct against any cascade and to self-heal by measurement. **If the drawer still looks wrong
  after v238, send one more screenshot** — it would mean the row is being changed by something other
  than width, and the next release targets that instead.
