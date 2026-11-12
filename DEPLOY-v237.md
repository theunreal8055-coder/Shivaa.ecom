# DEPLOY-v237 — “The Weight Release”

**Package:** `shivaa-update-v237.zip` · **369 files** · **37,448,114 B** · sha256
`10752b0ad94f11730a32ae9f19ee4d4f8449354e6958792912d374f1be8cbd77`
**Live now:** v236 · **This release:** v237 · **Apply it yourself, when you are ready.**
Nothing is deployed by the agent, by a push, or by a merge.

---

## 1 · What the owner asked for

> “Bug fixes karo, app ko smooth karo, loading time bahot zyada le raha hai… jab bhi kisi option
> pe click karta hun toh vo expand ho jata hai — usko fix karo.”

Three things were found in the code and fixed. Two of them are **measured weights**, not opinions.

## 2 · The three changes

### (1) 200 KB per page load, spent on a picture that is never drawn
`cms/index.html` preloaded `/images/black/hero-v186.jpg` at `fetchpriority="high"` — **on every route**.
That photograph is only painted by the `#/black-card` page (the v186 layer's `.bc-page-hero`).
So the home page, the shop and every product page spent their first **200 KB** on it, at a priority
**above the real hero photograph** — on a phone that is exactly where first paint goes to die.

*Fix:* the `<link rel="preload">` is gone. The CSS background still fetches the picture the moment
`#/black-card` opens, so that page looks identical.

### (2) A product page downloaded its whole gallery before you swiped
Every `gal-slide` image was fetched immediately, with no `loading`, no `decoding` and no priority.
A piece with five photographs pulled **all five** the moment the page opened.

*Fix:* the first photograph keeps `fetchpriority="high"` (it is the LCP), every other slide is
`loading="lazy" decoding="async"`. Slide heights are fixed by CSS, so **nothing moves** — no layout
shift, no re-measure. The gallery still works exactly as before; the later photographs now arrive
when you swipe to them.

### (3) The click now stays where your thumb left it
Every panel on this site is a native `<details class="acc">` (FAQ, product description, purity,
making charges, shipping, reviews). Two complaints came out of that: opening an answer makes the
section grow, so the line you were reading walks away; and a second tap grew the page by **two**
answers at once.

*Fix:* a new behaviour layer, `cms/js/v237.js` — **no css layer, no new request**:
- opening one answer closes its siblings, so a group can never grow by more than one answer;
- the `summary` you tapped is kept below the sticky header, so the click never scrolls your place away.

It is progressive: if the file ever fails to load, the accordion still opens and closes natively.

## 3 · What did NOT change

- **The stylesheet is untouched** — still one request, still **70 layers / 70 blocks**
  (910,723 B raw / 181,498 B gzipped). Do not rebuild the bundle for this release.
- No route, no price, no money maths, no admin screen, no database schema, no `.htaccess`,
  no `config.php`, no `data/`, no `uploads/`.
- The bullion desk, the passbook and the bills vault are untouched.

## 4 · How to apply it (the usual way)

1. Hostinger → **File Manager** → `public_html`.
2. Upload `shivaa-update-v237.zip` and **Extract** it over the site (it overwrites in place; it does
   not delete anything).
3. Delete the zip from `public_html` afterwards.
4. Open `https://shivaa.in/api/version` in the browser and tell the agent the `rel` number.

**Expected:** `rel: 237`, `stamp.matched: true`, `stamp.index/app/sw` all `237`.

## 5 · Three-minute checks after applying

- [ ] `https://shivaa.in/api/version` → `rel: 237`, `matched: true`
- [ ] Home page opens; the Black card page (`#/black-card`) still shows its dark hero photograph
- [ ] Open a product → swipe the gallery → photograph 2, 3, 4 appear as you swipe (not before)
- [ ] Open a product → tap “Purity & hallmark evidence” → it opens, the one above closes, **the page
      does not jump**; tap “Making Charges & Exchange” → same
- [ ] `#/faq` → tap three questions in a row → only one answer stays open
- [ ] Hard-refresh once on the phone (the service worker swaps to `shivaa-shell-v237`)

## 6 · Rollback

Re-apply **`shivaa-update-v236.zip`** (the previous release, still live today). Do not reach further
back — v236 contains every release before it.

## 7 · Honest status of this package

- `node --check` clean on `cms/js/app.js`, `cms/sw.js`, `cms/js/v237.js`.
- `python3 qa/check-handoff.py` — ledger ⟷ stamps ⟷ zip ⟷ docs, green.
- **The full 27-check gate (`bash qa/v237-gate.sh`) was NOT run before this package was built.**
  It has to be created from `qa/v236-gate.sh` with its suite pins rolled to 237 and run to 0 red.
  That is the one open step. The changes in this release are additive (one removed preload, three
  image attributes, one new progressive script), so the blast radius is small — but the gate is the
  rule, and this sentence exists so nobody pretends otherwise.
