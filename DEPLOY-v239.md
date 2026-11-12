# DEPLOY-v239 — “The Sidebar Guard”

**Package:** `shivaa-update-v239.zip` · **371 files** · **37,454,324 B** · sha256
`c4d66d64f1e40e0888feea61a120ab1e026fc3193df129fc29ea42ce4535db4a`
**Site now:** v238 · **This release:** v239 (it contains v237 and v238) · **No other zip needed.**

---

## 1 · What happened with v238

v238 forced `width:100%` on the drawer rows. **The owner applied it and the Swarna Nidhi row still
printed its label one character per line.** That is a useful result, not a wasted release: it proves
**the row is not what loses its width — the label column inside the row is.**

## 2 · What v239 does instead — by construction, not by guess

`cms/js/v239.js` (loads on every page, works only inside the drawer):

1. **Every drawer row becomes a CSS grid**, applied as **inline** styles:
   `display:grid; grid-template-columns:auto minmax(0,1fr) auto; width:100%`.
   The label sits in the `minmax(0,1fr)` track, so it always gets the whole remaining width — on
   every engine, whatever the last of the 70 CSS layers changed. An inline style outranks every
   layer, including ones added in future releases.
2. **The label can no longer break per character:**
   - `<b>` → one line, `overflow:hidden`, `text-overflow:ellipsis`;
   - `<small>` → two lines, breaks only at word boundaries, then ellipsis.
   “S / w / a / r / n / a” is no longer a reachable layout in either element.
3. `js/v238.js` (the width-only guard) is kept — it is harmless and now redundant.

## 3 · If it is still wrong after this — `?navdiag=1`

Open this on the phone, then open the drawer:

```
https://shivaa.in/?navdiag=1
```

A black panel appears at the bottom with one line per drawer row:

```
panel 358px  viewport 412px
8  dw-lite   row 358x61  d:grid   tx 250 w:auto f:1/1/0%  b.ws:nowrap
9  dw-lite   row 148x552 d:flex   tx 20   w:0px  f:1/1/0%  b.ws:normal   ← the culprit, named
```

**Screenshot that panel and send it.** It names the culprit exactly: which row, its real width and
height, its computed `display`, and the label's computed flex/width/white-space. With those numbers
the next release is surgical instead of defensive.

## 4 · What v239 also carries

- **v237** — the 200 KB `/images/black/hero-v186.jpg` that was preloaded at `fetchpriority="high"` on
  **every** route though only `#/black-card` paints it (preload gone); a product page that fetched
  **all** its gallery photographs at once (first eager, rest `loading="lazy" decoding="async"`); and
  the accordion fix — opening one answer closes its siblings and the tapped `summary` stays in view.
- **v238** — the first drawer guard (width only).

## 5 · What did NOT change

The stylesheet is untouched — one request, **70 layers / 70 blocks**. No route, no price, no money
maths, no admin screen, no schema, no `.htaccess`, no `config.php`, no `data/`, no `uploads/`.

## 6 · Apply

1. Hostinger → **File Manager** → `public_html`.
2. Upload `shivaa-update-v239.zip` → right-click → **Extract** *into* `public_html` (overwrite).
3. Delete the zip.
4. Open `https://shivaa.in/api/version` → expect `rel: 239`, `stamp.matched: true`.

## 7 · Check on the phone (two minutes)

- [ ] `rel: 239`, `matched: true`
- [ ] Drawer → **Swarna Nidhi** row: name on one line, plan text below it, **no vertical letters**
- [ ] Every row under it visible: Bespoke & Care, Design Selection, 10g scheme, For Jewellers, footer
- [ ] Tap any row → menu closes, page opens, nothing on the page grows
- [ ] If the drawer is still wrong → open `?navdiag=1`, open the drawer, **screenshot the black panel**
- [ ] Hard-refresh once (worker swaps to `shivaa-shell-v239`)

## 8 · Rollback

Re-apply `shivaa-update-v238.zip` (what the site runs today). v237 alone is not a rollback target.

## 9 · Honest status

`node --check` clean on all five scripts; `check-handoff.py` **189 checks, 0 red**.
**`bash qa/v239-gate.sh` was NOT run** — it must be created from `qa/v236-gate.sh` with the pins
rolled and taken to 0 red. There is **no browser engine in this sandbox** (jsdom has no layout), so
this release is built to be correct by construction and to report its own measurements rather than
being verified by reproduction.
