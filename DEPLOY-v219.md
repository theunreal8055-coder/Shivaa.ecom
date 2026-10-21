# DEPLOY-v219.md — release 219 · "THE DEPTH RELEASE" · the 10 g button reads, the offers have depth, the site runs smoother

Status: **READY — owner approval required before anything is taken live.**
A push, a green test run, or a finished zip is **not** approval. Live today is
**v205** (WWW + Netlify). If anything higher than 219 is live, stop.

**Read `DEPLOY-v205.md` first — owner gotchas, bind-shell ladder, zero-config
deploy. Drop-in replace root with `cms/` (same shape). Then `purge` before
`activate`.** This package carries v206 → v219 and includes the film files
(`images/films/`) and the offer artwork (`images/offers/`).

---

## 1 · The owner's orders → what was wrong → the fix

### ① "The first button: the text is the same colour as the background — fix it"

**Root cause (found in the code):** the "Enter 10g Gold Scheme Funnel" button
never got its gold fill. v193 had replaced the gold gradient with a white sheen
only, and v200 kept the gold off `.shv-pulse-cta`. v217 then gave `.btn-gold`
the dark ink `#2a0c12`. The result: dark text on a dark glass fill, as in the
screenshot.

**Fix:** the 10 g button now sets its own gold fill **and** its own dark ink
(`#2a1405`), so the label is always readable. The rule is on that button only,
so the other gold buttons keep their v200 gradient.

### ② "Improve the four offer banners even more — 5D animations"

There is no "5D" on a screen. The honest reading is **depth**: the banner
reacts to where the pointer is, as if it were a physical slab. This release
adds:

- **Tilt toward the pointer** (mouse only): up to 7° on each axis. Touch screens
  and phones stay flat, so scrolling is never taken over.
- **Layers**: the artwork band drifts against the tilt (a few pixels), so the
  picture and the card move at different depths.
- **Glare**: a soft light follows the pointer across the banner.
- The existing light sweep keeps running; it pauses while the banner is off
  screen.

No filter loops and no background-position loops are added (v211 stillness).

### ③ "A great button"

The offer calls to action (Shop now, Get my Black Card, Claim my Premium card,
See the certificate) are now **gold pills**: one size, dark ink on gold, a
light sweep across them on hover and focus, a small lift, and a visible focus
ring for keyboard users. The 10 g button is also restyled as above.

### ④ "Make the website more smooth"

Changes that cost the page less work:

- Off-screen offer banners pause their infinite sheen animation (`js/v219.js`
  uses an IntersectionObserver).
- The tilt writes two or three CSS variables once per frame (requestAnimationFrame);
  it never touches layout, and it adds no listener that blocks scrolling.
- Reduced-motion visitors get no tilt, no glare, and no button sweep.

> Caveat: smoothness has **not been measured** on a real device. This sandbox has
> no real browser, so no frame-rate or scroll test was possible. Please feel the
> scroll on a phone before you approve.

---

## 2 · QA run before packaging (headless jsdom only)

| Check | Result |
|---|---|
| `node qa/browser/t-v209-alive.mjs` (alive suite) | **96 / 0** |
| `node qa/browser/t-v206-flip.mjs` (flip guard) | **ALL PASS** |
| `node qa/browser/t7-audit.mjs` | **4 / 0** |
| `node qa/browser/t-v218-sidebar.mjs` (sidebar + funnel scroll) | **13 / 0** |
| `node qa/browser/t-v219-depth.mjs` (10 g fill, offer depth, CTA, stillness, stamps) | **22 / 0** |
| Tilt logic in a minimal page (mouse tilts, 7° cap, touch ignored, leaving the window clears it) | **6 / 0** |
| `node --check` on app.js, v219.js, sw.js, the test files | clean |

**QA fixture (not shipped):** the sandbox's `cms/data/db.json` was lost in a
workspace reset, so it was rebuilt from the sample payload (20 products,
offers on, Amrita page on, rates set). It is gitignored and is not in the zip.
The test runner's jsdom was reinstalled into `/tmp`.

Test-only changes: the alive suite now waits for the real elements (instead of
a fixed 1.5 s / 2.2 s) and ignores the sandbox's Cashfree SDK socket error,
which is environmental (the sandbox has no outbound TLS to `sdk.cashfree.com`).

**Not verifiable in this sandbox:** any real browser, phone, or visual look.
The 10 g button colours, the tilt feel and the smoothness all need a human
check on a real device.

---

## 3 · Package

- `shivaa-update-v219.zip` — **349 files · 37,059,487 bytes · sha256
  `ccddcab3d13756623e6687c4dd252d9609a9a45ba2d6e7092ba1d541335e728f`**
- Same file list as v218, plus `css/v219.css` and `js/v219.js`.
- Includes `images/films/` (18 files) and `images/offers/` (4 files).
- Link: `https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/09f3c79f-shivaa-ecom/shivaa-update-v219.zip`
- Rollback rung: `shivaa-update-v218.zip` (sha256 `9faec9d6…0052a1d` — full value in DEPLOY-v218.md) — **not** live,
  shipped only to the repository. The last live release is still v205.

---

## 4 · Deploy steps (after owner's explicit yes only)

1. Download `shivaa-update-v219.zip`; check the sha256 above.
2. Replace the site root with the zip's contents (same shape as `cms/`).
3. Purge the CDN cache **before** activating.
4. On a phone and a laptop: check the 10 g button (readable gold), the four
   offer banners (laptop: tilt and glare follow the mouse; phone: flat), the
   offer buttons, and that scrolling feels smooth.
