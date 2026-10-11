# v197 — Shivaa Black is visible on the home hero, the footer and the side menu

Release stamp: **197** (index.html, js/app.js APP_REL, sw.js SHELL/REL, api.php version).
Update file: `shivaa-update-v197.zip` (built by `tools/mega/make-v197-zip.py`, 132 files).

## Why it was not seen
- The black card was placed under the big hero photo, below the fold. On a phone it was
  easy to miss.
- The footer and the side menu had no black card at all.

## What changed
- **Main hero:** a black Shivaa Black strip now sits inside the hero, under the
  "Win 10g Gold Biscuit" button. It shows the offer and "Claim free" for guests, and
  "Your card is active / View my card" for members.
- **Footer:** a black strip above the footer offers.
- **Side menu:** a black strip above the side-menu offers.
- The separate full-width block under the hero was removed, so there is no duplicate.
- The strips draw themselves when the page renders, even when the home page is drawn
  after the products load. A strip added later is drawn too.
- Strips link to the claim page (#/black-card). Full card numbers never appear on the
  home page.

## Checks
- `v197-check.js`: 10/10. Stamps, load order, slot placement (hero, footer, side),
  no duplicate block, and a browser-free run of the real module for a guest and a member,
  including a slot added after start-up.
- Full `npm test` chain: 236 PASS, exit 0.

## Not verified here
- No real browser or phone (the headless browser download is blocked). Please check on
  a phone and a laptop: the strip under the hero's main button, the footer, and the side
  menu (open the menu).
- The hero strip sits in the copy column. On a very small phone it may need a scroll
  within the hero to see. Tell me if you want it higher.
